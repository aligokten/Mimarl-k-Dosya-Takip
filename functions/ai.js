// Ruhsat360 Yapay Zekâ Asistanı — Firebase Callable Function.
//
// Akış: kimlik doğrulama → ofis üyeliği ve abonelik kontrolü → ofisin aylık
// kotasından bir istek ayırma → proje özetini (kişisel veriler süzülerek)
// hazırlama → Claude API (web araması + öneri aracı) → yanıtı projenin
// aiMessages koleksiyonuna yazma.
//
// API anahtarı Firebase Secret Manager'da tutulur:
//   firebase functions:secrets:set ANTHROPIC_API_KEY
//
// Ofis başına aylık istek sınırı aiPlans/{officeId}.monthlyLimit alanından
// okunur (yalnızca platform yöneticisi yazabilir); yoksa DEFAULT_MONTHLY_LIMIT.

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk").default;
const { SYSTEM_PROMPT, QUICK_ACTIONS } = require("./ai-prompts");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const MODEL = "claude-opus-5-5";
const DEFAULT_MONTHLY_LIMIT = 100;
const HISTORY_LIMIT = 12;
const MAX_USER_TEXT = 4000;
const MAX_LOOP_TURNS = 8;
const MAX_SUGGESTIONS = 5;

const SUGGEST_TOOL = {
  name: "oneri_sun",
  description:
    "Kullanıcıya projeye uygulanabilecek önerileri onay için gösterir. Hiçbir şeyi kendisi değiştirmez; kullanıcı 'Uygula' düğmesine basarsa uygulanır. tur=NOT_EKLE için notMetni doldurulur (hizmetId ve asamaId boş bırakılır). tur=ASAMA_TAMAMLA için <proje> içindeki hizmetId ve asamaId kullanılır (notMetni boş bırakılır).",
  strict: true,
  eager_input_streaming: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["oneriler"],
    properties: {
      oneriler: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["tur", "baslik", "gerekce", "notMetni", "hizmetId", "asamaId"],
          properties: {
            tur: { type: "string", enum: ["NOT_EKLE", "ASAMA_TAMAMLA"] },
            baslik: { type: "string", description: "Düğmede görünecek kısa başlık" },
            gerekce: { type: "string", description: "Neden önerildiği, tek cümle" },
            notMetni: { type: "string" },
            hizmetId: { type: "string" },
            asamaId: { type: "string" },
          },
        },
      },
    },
  },
};

const WEB_TOOLS = [
  { type: "web_search_20260209", name: "web_search", max_uses: 5, user_location: { type: "approximate", country: "TR" } },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 5 },
];

// ---------------------------------------------------------------------------
// Saf yardımcılar (test edilebilir)
// ---------------------------------------------------------------------------

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

function cleanText(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function isOfficeActive(office) {
  if (!office) return false;
  const ok = (v) => v == null || v === "" || v === "ACTIVE" || v === "TRIAL";
  const okStrict = (v) => v === "ACTIVE" || v === "TRIAL";
  return ok(office.accessStatus) || okStrict(office.subscriptionStatus);
}

// Proje özetini modele gidecek biçimde hazırlar. Kişisel veriler (TC no,
// telefon, e-posta, adres, vekaletname ayrıntıları), evrak bağlantıları ve
// ekip bilgileri DIŞARIDA bırakılır.
function buildProjectContext({ project, contacts, serviceTypes, today }) {
  const contactById = new Map(contacts.map((c) => [c.id, c]));
  const typeById = new Map(serviceTypes.map((t) => [t.id, t]));
  const person = (id, role) => {
    const c = id ? contactById.get(id) : null;
    if (!c) return null;
    const out = { rol: role, ad: c.name };
    if (role === "Arsa sahibi" && c.poaExpiryDate) out.vekaletnameBitis = c.poaExpiryDate;
    if (role === "Arsa sahibi") out.vekaletnameVar = Boolean(c.poaNo || c.poaUrl);
    return out;
  };

  const services = (project.services ?? []).map((s) => {
    const type = typeById.get(s.serviceTypeId);
    const done = new Set(s.completedStageIds ?? []);
    return {
      hizmetId: s.id,
      hizmet: type?.name ?? "Bilinmeyen hizmet",
      durum: s.status,
      hedefTarih: s.targetDate ?? null,
      asamalar: (type?.stages ?? []).map((st) => ({
        asamaId: st.id,
        ad: st.name,
        tamamlandi: done.has(st.id),
      })),
    };
  });
  const serviceName = new Map(services.map((s) => [s.hizmetId, s.hizmet]));

  const documents = (project.documents ?? []).map((d) => ({
    ad: d.name,
    tur: d.kind,
    hizmet: d.projectServiceId ? serviceName.get(d.projectServiceId) ?? null : null,
    gecerlilik:
      d.expiryDate === undefined ? "belirlenmedi" : d.expiryDate === null ? "süresiz" : d.expiryDate,
  }));

  return {
    bugun: today,
    proje: {
      ad: project.name,
      durum: project.status,
      oncelik: project.priority ?? null,
      il: project.province ?? null,
      ilce: project.district ?? null,
      mahalle: project.neighborhood ?? null,
      ada: project.ada ?? null,
      parsel: project.parsel ?? null,
      pafta: project.pafta ?? null,
    },
    kisiler: [
      person(project.clientId, "Müşteri"),
      person(project.landOwnerId, "Arsa sahibi"),
      person(project.contractorId, "Müteahhit"),
    ].filter(Boolean),
    hizmetler: services,
    evraklar: documents,
  };
}

// Modelin önerilerini proje verisine karşı doğrular; geçersizleri atar.
function validateSuggestions(input, projectContext) {
  const list = Array.isArray(input?.oneriler) ? input.oneriler : [];
  const out = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const baslik = cleanText(raw.baslik, 120);
    const gerekce = cleanText(raw.gerekce, 300);
    if (!baslik) continue;
    if (raw.tur === "NOT_EKLE") {
      const notMetni = cleanText(raw.notMetni, 2000);
      if (!notMetni) continue;
      out.push({ tur: "NOT_EKLE", baslik, gerekce, notMetni });
    } else if (raw.tur === "ASAMA_TAMAMLA") {
      const service = projectContext.hizmetler.find((s) => s.hizmetId === raw.hizmetId);
      const stage = service?.asamalar.find((a) => a.asamaId === raw.asamaId);
      if (!service || !stage || stage.tamamlandi) continue;
      out.push({
        tur: "ASAMA_TAMAMLA",
        baslik,
        gerekce,
        hizmetId: service.hizmetId,
        asamaId: stage.asamaId,
        hizmetAdi: service.hizmet,
        asamaAdi: stage.ad,
      });
    }
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

// Kayıtlı sohbet geçmişinden Claude mesaj dizisi kurar. Proje özeti yalnızca
// son kullanıcı mesajına eklenir (her zaman güncel durum).
function buildMessages(history, userText, projectContext) {
  const messages = [];
  for (const h of history) {
    if (!h.text) continue;
    if (messages.length === 0 && h.role !== "user") continue;
    messages.push({ role: h.role === "assistant" ? "assistant" : "user", content: h.text });
  }
  const contextBlock = `<proje>\n${JSON.stringify(projectContext, null, 1)}\n</proje>`;
  messages.push({
    role: "user",
    content: [
      { type: "text", text: contextBlock },
      { type: "text", text: userText },
    ],
  });
  return messages;
}

// Yanıt bloklarından metni ve kaynakları toplar.
function extractReply(blocks) {
  const texts = [];
  const sources = new Map();
  for (const b of blocks) {
    if (b.type === "text") {
      texts.push(b.text);
      for (const c of b.citations ?? []) {
        if (c.url && !sources.has(c.url)) sources.set(c.url, { url: c.url, title: c.title || c.url });
      }
    } else if (b.type === "web_fetch_tool_result" && b.content?.type === "web_fetch_result") {
      const url = b.content.url;
      if (url && !sources.has(url)) sources.set(url, { url, title: b.content.content?.title || url });
    }
  }
  return { text: texts.join("").trim(), sources: [...sources.values()].slice(0, 10) };
}

// Claude ile araç döngüsü. `client` enjekte edilebilir (testler için).
async function runAssistant({ client, messages, effort, projectContext }) {
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, webSearches: 0 };
  const allBlocks = [];
  let suggestions = [];
  let refused = false;
  let truncated = false;

  for (let turn = 0; turn < MAX_LOOP_TURNS; turn++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [...WEB_TOOLS, SUGGEST_TOOL],
      output_config: { effort },
      messages,
    });
    const msg = await stream.finalMessage();

    usage.input += msg.usage?.input_tokens ?? 0;
    usage.output += msg.usage?.output_tokens ?? 0;
    usage.cacheRead += msg.usage?.cache_read_input_tokens ?? 0;
    usage.cacheWrite += msg.usage?.cache_creation_input_tokens ?? 0;
    usage.webSearches += msg.usage?.server_tool_use?.web_search_requests ?? 0;
    allBlocks.push(...msg.content);

    if (msg.stop_reason === "refusal") {
      refused = true;
      break;
    }
    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }

    const toolUses = msg.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) {
      if (msg.stop_reason === "max_tokens") truncated = true;
      break;
    }
    // Yarım kalmış araç girdisini asla işleme.
    if (msg.stop_reason === "max_tokens") {
      truncated = true;
      break;
    }

    messages.push({ role: "assistant", content: msg.content });
    const results = toolUses.map((t) => {
      if (t.name !== SUGGEST_TOOL.name) {
        return { type: "tool_result", tool_use_id: t.id, is_error: true, content: "Bilinmeyen araç." };
      }
      const valid = validateSuggestions(t.input, projectContext);
      suggestions = suggestions.concat(valid).slice(0, MAX_SUGGESTIONS);
      return {
        type: "tool_result",
        tool_use_id: t.id,
        content:
          valid.length > 0
            ? `${valid.length} öneri kullanıcıya onay için gösterildi. Şimdi yanıtını tamamla; önerileri metinde tekrar listeleme.`
            : "Öneriler geçersizdi (kimlikler projede yok veya alanlar boş). Öneri olmadan yanıtını tamamla.",
      };
    });
    messages.push({ role: "user", content: results });
  }

  const { text, sources } = extractReply(allBlocks);
  return { text, sources, suggestions, usage, refused, truncated };
}

// ---------------------------------------------------------------------------
// Firestore işlemleri
// ---------------------------------------------------------------------------

async function assertAccess(db, uid, officeId) {
  const [memberSnap, officeSnap, indexSnap] = await Promise.all([
    db.doc(`offices/${officeId}/members/${uid}`).get(),
    db.doc(`offices/${officeId}`).get(),
    db.doc(`userOfficeIndex/${uid}`).get(),
  ]);
  if (!memberSnap.exists) throw new HttpsError("permission-denied", "Bu ofisin üyesi değilsiniz.");
  if (indexSnap.exists && indexSnap.data().primaryOfficeId && indexSnap.data().primaryOfficeId !== officeId) {
    throw new HttpsError("permission-denied", "Bu ofis sizin etkin ofisiniz değil.");
  }
  if (!isOfficeActive(officeSnap.data())) {
    throw new HttpsError("failed-precondition", "Ofis aboneliği etkin değil.");
  }
  return memberSnap.data();
}

async function reserveQuota(db, officeId) {
  const planSnap = await db.doc(`aiPlans/${officeId}`).get();
  const plan = planSnap.exists ? planSnap.data() : {};
  if (plan.enabled === false) {
    throw new HttpsError("failed-precondition", "Yapay zekâ asistanı bu ofis için kapalı.");
  }
  const limit = Number.isFinite(plan.monthlyLimit) ? plan.monthlyLimit : DEFAULT_MONTHLY_LIMIT;
  const ref = db.doc(`aiUsage/${officeId}/months/${monthKey()}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used = snap.exists ? snap.data().requests ?? 0 : 0;
    if (used >= limit) {
      throw new HttpsError(
        "resource-exhausted",
        `Bu ayki yapay zekâ kullanım hakkınız doldu (${limit} istek). Ek kullanım için Ruhsat360 ile iletişime geçin.`
      );
    }
    tx.set(ref, { requests: used + 1, limit, updatedAt: new Date().toISOString() }, { merge: true });
  });
  return ref;
}

// ---------------------------------------------------------------------------
// Callable function
// ---------------------------------------------------------------------------

const aiAssistant = onCall(
  {
    region: "europe-west1",
    secrets: [ANTHROPIC_API_KEY],
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Giriş yapmanız gerekiyor.");

    const officeId = cleanText(request.data?.officeId, 128);
    const projectId = cleanText(request.data?.projectId, 128);
    const action = cleanText(request.data?.action, 32);
    const message = cleanText(request.data?.message, MAX_USER_TEXT);
    if (!officeId || !projectId) throw new HttpsError("invalid-argument", "Ofis ve proje gerekli.");
    if (action && !QUICK_ACTIONS[action]) throw new HttpsError("invalid-argument", "Bilinmeyen işlem.");
    if (!action && !message) throw new HttpsError("invalid-argument", "Bir mesaj yazın veya bir işlem seçin.");

    const db = admin.firestore();
    const member = await assertAccess(db, uid, officeId);

    const projectRef = db.doc(`offices/${officeId}/projects/${projectId}`);
    const [projectSnap, contactsSnap, typesSnap, historySnap] = await Promise.all([
      projectRef.get(),
      db.collection(`offices/${officeId}/contacts`).get(),
      db.collection(`offices/${officeId}/serviceTypes`).get(),
      projectRef.collection("aiMessages").orderBy("at", "desc").limit(HISTORY_LIMIT).get(),
    ]);
    if (!projectSnap.exists) throw new HttpsError("not-found", "Proje bulunamadı.");

    const usageRef = await reserveQuota(db, officeId);

    const quick = action ? QUICK_ACTIONS[action] : null;
    const userText = quick
      ? `${quick.prompt}${message ? `\n\nKullanıcının ek notu: ${message}` : ""}`
      : message;
    const displayText = quick ? `${quick.label}${message ? ` — ${message}` : ""}` : message;

    const projectContext = buildProjectContext({
      project: { id: projectSnap.id, ...projectSnap.data() },
      contacts: contactsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      serviceTypes: typesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      today: new Date().toISOString().slice(0, 10),
    });
    const history = historySnap.docs
      .map((d) => d.data())
      .filter((m) => m.status !== "error")
      .reverse()
      .map((m) => ({ role: m.role, text: m.promptText || m.text }));

    const byName = member.displayName || member.email || "Kullanıcı";
    const at = new Date().toISOString();
    await projectRef.collection("aiMessages").add({
      role: "user",
      text: displayText,
      promptText: userText,
      action: action || null,
      byUid: uid,
      byName,
      at,
    });

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    let result;
    try {
      result = await runAssistant({
        client,
        messages: buildMessages(history, userText, projectContext),
        effort: quick?.effort ?? "medium",
        projectContext,
      });
    } catch (err) {
      await usageRef.set({ requests: admin.firestore.FieldValue.increment(-1) }, { merge: true });
      logger.error("aiAssistant Claude hatası", { officeId, projectId, status: err?.status, message: err?.message });
      if (err instanceof Anthropic.RateLimitError) {
        throw new HttpsError("resource-exhausted", "Asistan şu an yoğun. Lütfen bir dakika sonra tekrar deneyin.");
      }
      if (err instanceof Anthropic.AuthenticationError) {
        throw new HttpsError("internal", "Asistan yapılandırması eksik (API anahtarı).");
      }
      if (err instanceof Anthropic.APIError) {
        throw new HttpsError("unavailable", "Asistan şu an yanıt veremiyor. Lütfen tekrar deneyin.");
      }
      throw new HttpsError("internal", "Beklenmeyen bir hata oluştu.");
    }

    let text = result.text;
    if (result.refused) {
      text = "Bu isteği yanıtlayamıyorum. Lütfen sorunuzu farklı bir şekilde ifade edin.";
    } else if (!text) {
      text = "Yanıt oluşturulamadı. Lütfen tekrar deneyin.";
    } else if (result.truncated) {
      text += "\n\n_(Yanıt uzunluk sınırına ulaştı ve kesildi.)_";
    }

    const reply = {
      role: "assistant",
      text,
      sources: result.sources,
      suggestions: result.suggestions,
      appliedSuggestions: [],
      byUid: null,
      byName: "Asistan",
      at: new Date().toISOString(),
    };
    const replyRef = await projectRef.collection("aiMessages").add(reply);

    const inc = admin.firestore.FieldValue.increment;
    await usageRef.set(
      {
        inputTokens: inc(result.usage.input),
        outputTokens: inc(result.usage.output),
        cacheReadTokens: inc(result.usage.cacheRead),
        cacheWriteTokens: inc(result.usage.cacheWrite),
        webSearches: inc(result.usage.webSearches),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { id: replyRef.id, ...reply };
  }
);

module.exports = {
  aiAssistant,
  // testler için
  _internal: { buildProjectContext, validateSuggestions, buildMessages, extractReply, runAssistant, isOfficeActive, monthKey },
};
