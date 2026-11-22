// Yapay zekâ asistanının saf mantık testleri. Gerçek API'ye istek atmaz;
// Claude istemcisi sahte bir nesneyle değiştirilir.
const test = require("node:test");
const assert = require("node:assert/strict");
const { _internal: ai } = require("../ai");

const contacts = [
  { id: "c1", name: "Ayşe Yılmaz", tcNo: "12345678901", phone: "0555", address: "Moda", roles: ["MUSTERI"] },
  { id: "c2", name: "Mehmet Kaya", tcNo: "98765432109", poaNo: "V-12", poaExpiryDate: "2026-12-01", roles: ["ARSA_SAHIBI"] },
];
const serviceTypes = [
  { id: "st1", name: "Yapı Ruhsatı", stages: [{ id: "a1", name: "Avan proje onayı" }, { id: "a2", name: "Ruhsat başvurusu" }] },
];
const project = {
  id: "p1",
  name: "Moda Konut",
  clientId: "c1",
  landOwnerId: "c2",
  province: "İstanbul",
  district: "Kadıköy",
  ada: "123",
  parsel: "45",
  address: "Gizli adres 1",
  notes: "ofis içi not",
  status: "DEVAM_EDIYOR",
  services: [{ id: "s1", serviceTypeId: "st1", status: "DEVAM_EDIYOR", completedStageIds: ["a1"] }],
  documents: [
    { id: "d1", name: "Tapu", kind: "DIJITAL", url: "https://drive/x", expiryDate: null },
    { id: "d2", name: "İmar durumu", kind: "DIJITAL", projectServiceId: "s1", expiryDate: "2026-12-10" },
  ],
  noteList: [{ text: "gizli not" }],
};

function ctx() {
  return ai.buildProjectContext({ project, contacts, serviceTypes, today: "2026-11-22" });
}

test("proje özeti kişisel verileri ve bağlantıları dışarıda bırakır", () => {
  const json = JSON.stringify(ctx());
  for (const secret of ["12345678901", "98765432109", "0555", "Gizli adres", "drive/x", "gizli not", "ofis içi not"]) {
    assert.ok(!json.includes(secret), `sızan alan: ${secret}`);
  }
  const c = ctx();
  assert.equal(c.proje.ada, "123");
  assert.equal(c.kisiler.find((k) => k.rol === "Arsa sahibi").vekaletnameBitis, "2026-12-01");
  assert.equal(c.hizmetler[0].asamalar[0].tamamlandi, true);
  assert.equal(c.evraklar[0].gecerlilik, "süresiz");
  assert.equal(c.evraklar[1].hizmet, "Yapı Ruhsatı");
});

test("öneri doğrulama: uydurma ve tamamlanmış aşamalar atılır", () => {
  const out = ai.validateSuggestions(
    {
      oneriler: [
        { tur: "ASAMA_TAMAMLA", baslik: "Ruhsat başvurusu", gerekce: "x", notMetni: "", hizmetId: "s1", asamaId: "a2" },
        { tur: "ASAMA_TAMAMLA", baslik: "Zaten bitti", gerekce: "x", notMetni: "", hizmetId: "s1", asamaId: "a1" },
        { tur: "ASAMA_TAMAMLA", baslik: "Uydurma", gerekce: "x", notMetni: "", hizmetId: "s9", asamaId: "a2" },
        { tur: "NOT_EKLE", baslik: "Boş not", gerekce: "x", notMetni: "   ", hizmetId: "", asamaId: "" },
        { tur: "NOT_EKLE", baslik: "Emsal notu", gerekce: "x", notMetni: "Emsal 1,50", hizmetId: "", asamaId: "" },
        { tur: "SIL", baslik: "Kötü", gerekce: "x", notMetni: "", hizmetId: "", asamaId: "" },
      ],
    },
    ctx()
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].asamaAdi, "Ruhsat başvurusu");
  assert.equal(out[1].notMetni, "Emsal 1,50");
});

test("mesaj dizisi kullanıcıyla başlar, proje özeti son mesajdadır", () => {
  const msgs = ai.buildMessages(
    [{ role: "assistant", text: "yetim" }, { role: "user", text: "selam" }, { role: "assistant", text: "merhaba" }],
    "kaç kat?",
    ctx()
  );
  assert.equal(msgs[0].role, "user");
  assert.equal(msgs.length, 3);
  const last = msgs[msgs.length - 1];
  assert.ok(last.content[0].text.startsWith("<proje>"));
  assert.equal(last.content[1].text, "kaç kat?");
});

test("abonelik durumu kuralları firestore.rules ile aynı", () => {
  assert.equal(ai.isOfficeActive({}), true);
  assert.equal(ai.isOfficeActive({ accessStatus: "TRIAL" }), true);
  assert.equal(ai.isOfficeActive({ accessStatus: "EXPIRED" }), false);
  assert.equal(ai.isOfficeActive({ accessStatus: "EXPIRED", subscriptionStatus: "ACTIVE" }), true);
  assert.equal(ai.isOfficeActive(null), false);
});

// Sahte istemci: sıradaki yanıtları döndürür ve gönderilen istekleri kaydeder.
function fakeClient(responses) {
  const calls = [];
  return {
    calls,
    beta: {
      messages: {
        stream(params) {
          calls.push(JSON.parse(JSON.stringify(params)));
          const next = responses.shift();
          return { finalMessage: async () => next };
        },
      },
    },
  };
}
const usage = { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 10, server_tool_use: { web_search_requests: 1 } };

test("araç döngüsü: pause_turn devam eder, öneri toplanır, metin ve kaynaklar birleşir", async () => {
  const client = fakeClient([
    { stop_reason: "pause_turn", usage, content: [{ type: "server_tool_use", id: "s", name: "web_search", input: {} }] },
    {
      stop_reason: "tool_use",
      usage,
      content: [
        { type: "text", text: "Emsal 1,50 görünüyor. ", citations: [{ type: "web_search_result_location", url: "https://mevzuat.gov.tr/a", title: "PAİY" }] },
        { type: "tool_use", id: "t1", name: "oneri_sun", input: { oneriler: [{ tur: "NOT_EKLE", baslik: "Not", gerekce: "g", notMetni: "Emsal 1,50", hizmetId: "", asamaId: "" }] } },
      ],
    },
    { stop_reason: "end_turn", usage, content: [{ type: "text", text: "Sonuç hazır." }] },
  ]);
  const r = await ai.runAssistant({ client, messages: [{ role: "user", content: "x" }], effort: "medium", projectContext: ctx() });
  assert.equal(client.calls.length, 3);
  assert.equal(r.text, "Emsal 1,50 görünüyor. Sonuç hazır.");
  assert.deepEqual(r.sources, [{ url: "https://mevzuat.gov.tr/a", title: "PAİY" }]);
  assert.equal(r.suggestions.length, 1);
  assert.equal(r.usage.input, 300);
  assert.equal(r.usage.webSearches, 3);
  // Üçüncü istek, aracın sonucunu içermeli.
  const lastMsgs = client.calls[2].messages;
  assert.equal(lastMsgs[lastMsgs.length - 1].content[0].type, "tool_result");
  // İstek parametreleri
  assert.equal(client.calls[0].model, "claude-opus-5-5");
  assert.equal(client.calls[0].fallbacks, "default");
  assert.equal(client.calls[0].system[0].cache_control.type, "ephemeral");
});

test("araç döngüsü: max_tokens'ta yarım araç girdisi işlenmez, ret yakalanır", async () => {
  const c1 = fakeClient([
    { stop_reason: "max_tokens", usage, content: [{ type: "tool_use", id: "t", name: "oneri_sun", input: { oneriler: [] } }] },
  ]);
  const r1 = await ai.runAssistant({ client: c1, messages: [{ role: "user", content: "x" }], effort: "medium", projectContext: ctx() });
  assert.equal(r1.truncated, true);
  assert.equal(c1.calls.length, 1);

  const c2 = fakeClient([{ stop_reason: "refusal", usage, content: [] }]);
  const r2 = await ai.runAssistant({ client: c2, messages: [{ role: "user", content: "x" }], effort: "medium", projectContext: ctx() });
  assert.equal(r2.refused, true);
});
