const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const MAIL_BRIDGE_URL = defineSecret("MAIL_BRIDGE_URL");
const MAIL_BRIDGE_SECRET = defineSecret("MAIL_BRIDGE_SECRET");

const ALLOWED_ORIGINS = new Set([
  "https://www.ruhsat360.com",
  "https://ruhsat360.com",
  "https://directed-potion-425913-g4.web.app",
  "https://aligokten.github.io",
  "http://localhost:5173",
  "http://localhost:3000",
]);

function setCors(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }

  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
}

function cleanText(value, maxLength = 200) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function addDaysAsDateString(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function customerEmailHtml({ companyName, accessUntil }) {
  const safeCompany = escapeHtml(companyName);
  const safeUntil = escapeHtml(accessUntil);

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #e2e8f0">
        <h1 style="margin:0 0 12px;font-size:26px;letter-spacing:-0.04em">Ruhsat360 demo davetiniz oluşturuldu</h1>

        <p style="font-size:15px;line-height:1.7;color:#475569">
          Merhaba, <strong>${safeCompany}</strong> için Ruhsat360 demo başvurunuz başarıyla alındı.
        </p>

        <p style="font-size:15px;line-height:1.7;color:#475569">
          Demo erişiminiz <strong>${safeUntil}</strong> tarihine kadar aktif olacak şekilde hazırlanmıştır.
        </p>

        <div style="margin:26px 0">
          <a href="https://aligokten.github.io/Mimarl-k-Dosya-Takip/"
             style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">
            Ruhsat360 Paneline Git
          </a>
        </div>

        <p style="font-size:14px;line-height:1.7;color:#64748b">
          Giriş yaptıktan sonra ofisinizi oluşturabilir, proje ve evrak takip panelinizi kullanmaya başlayabilirsiniz.
        </p>

        <hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0">

        <p style="font-size:12px;color:#94a3b8">
          Bu e-posta ruhsat360.com demo başvuru formu üzerinden otomatik gönderilmiştir.
        </p>
      </div>
    </div>
  `;
}

function customerEmailText({ companyName, accessUntil }) {
  return [
    "Ruhsat360 demo davetiniz oluşturuldu.",
    "",
    `${companyName} için demo başvurunuz başarıyla alındı.`,
    `Demo erişiminiz ${accessUntil} tarihine kadar aktif olacak şekilde hazırlanmıştır.`,
    "",
    "Panel bağlantısı:",
    "https://aligokten.github.io/Mimarl-k-Dosya-Takip/",
  ].join("\n");
}

function internalLeadEmailHtml({
  companyName,
  contactName,
  email,
  phone,
  source,
  message,
  accessUntil,
  kvkkConsentAt,
}) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:28px;color:#0f172a">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;border:1px solid #e2e8f0">
        <h2 style="margin:0 0 16px">Yeni Ruhsat360 web başvurusu</h2>
        <p><strong>Firma:</strong> ${escapeHtml(companyName)}</p>
        <p><strong>Yetkili:</strong> ${escapeHtml(contactName || "-")}</p>
        <p><strong>E-posta:</strong> ${escapeHtml(email)}</p>
        <p><strong>Telefon:</strong> ${escapeHtml(phone || "-")}</p>
        <p><strong>Kaynak:</strong> ${escapeHtml(source || "-")}</p>
        <p><strong>Demo bitiş:</strong> ${escapeHtml(accessUntil)}</p>
        <p><strong>KVKK onayı:</strong> Alındı — ${escapeHtml(kvkkConsentAt || "-")}</p>
        <p><strong>Mesaj:</strong><br>${escapeHtml(message || "-")}</p>
      </div>
    </div>
  `;
}

async function sendMailBridgeEmail({ to, subject, html, text }) {
  const url = MAIL_BRIDGE_URL.value();
  const secret = MAIL_BRIDGE_SECRET.value();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret,
      to,
      subject,
      html,
      text,
      replyTo: "info@ruhsat360.com",
    }),
  });

  const raw = await response.text();
  let parsed = null;

  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed?.ok) {
    throw new Error(
      parsed?.message ||
      raw ||
      "Mail bridge e-posta gönderimini tamamlayamadı."
    );
  }

  return parsed;
}

// ============================================================================
//  Otomatik Tarih/Süre Hatırlatmaları (günlük zamanlanmış tarama)
// ----------------------------------------------------------------------------
//  Her ofisin projelerini (hizmet hedef tarihleri, evrak geçerlilik tarihleri)
//  ve kişilerini (vekaletname geçerlilik tarihi) tarar; hedefe 7 ve 1 gün kala
//  ilgili kişilere hem uygulama içi bildirim (offices/{id}/notifications) hem de
//  e-posta (mail bridge) gönderir. Deterministik bildirim kimliği ile mükerrer
//  gönderim engellenir (create() ALREADY_EXISTS → atla).
// ============================================================================

const REMINDER_MILESTONES = [7, 1]; // hedefe kaç gün kala hatırlatılacağı

function istanbulTodayStr() {
  // "YYYY-MM-DD" (Europe/Istanbul)
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Istanbul",
  });
}

function daysBetween(todayStr, targetStr) {
  const a = Date.parse(`${todayStr}T00:00:00Z`);
  const b = Date.parse(`${String(targetStr).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

function trDate(s) {
  const p = String(s || "").slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : String(s || "");
}

function reminderEmailHtml(officeName, lines) {
  const items = lines
    .map(
      (l) =>
        `<li style="margin:6px 0;font-size:14px;line-height:1.6;color:#334155">${escapeHtml(
          l
        )}</li>`
    )
    .join("");
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:28px;color:#0f172a">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;border:1px solid #e2e8f0">
        <h2 style="margin:0 0 6px">Yaklaşan tarih hatırlatmaları</h2>
        <p style="font-size:13px;color:#64748b;margin:0 0 16px">${escapeHtml(
          officeName
        )}</p>
        <ul style="padding-left:18px;margin:0">${items}</ul>
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0">
        <p style="font-size:12px;color:#94a3b8">
          Bu e-posta Ruhsat360 tarafından otomatik olarak gönderilmiştir.
        </p>
      </div>
    </div>
  `;
}

exports.sendDateReminders = onSchedule(
  {
    schedule: "every day 08:00",
    timeZone: "Europe/Istanbul",
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 300,
    secrets: [MAIL_BRIDGE_URL, MAIL_BRIDGE_SECRET],
  },
  async () => {
    const todayStr = istanbulTodayStr();
    const officesSnap = await db.collection("offices").get();

    for (const officeDoc of officesSnap.docs) {
      const officeId = officeDoc.id;
      const office = officeDoc.data() || {};
      const officeName = office.name || "Ruhsat360 Ofisi";

      try {
        const [membersSnap, projectsSnap, contactsSnap, serviceTypesSnap] =
          await Promise.all([
            db.collection(`offices/${officeId}/members`).get(),
            db.collection(`offices/${officeId}/projects`).get(),
            db.collection(`offices/${officeId}/contacts`).get(),
            db.collection(`offices/${officeId}/serviceTypes`).get(),
          ]);

        const members = new Map(); // uid -> { uid, email, displayName, role }
        const adminUids = [];
        membersSnap.forEach((m) => {
          const d = m.data() || {};
          const uid = d.uid || m.id;
          members.set(uid, {
            uid,
            email: d.email || null,
            displayName: d.displayName || d.email || "Üye",
            role: d.role || "STAFF",
          });
          if ((d.role || "").toUpperCase() === "ADMIN") adminUids.push(uid);
        });

        const serviceTypeName = new Map();
        serviceTypesSnap.forEach((s) => {
          const d = s.data() || {};
          serviceTypeName.set(s.id, d.name || "Hizmet");
        });

        // Bir hatırlatma olayı için alıcı kümesi (var olan üyelere sınırlı).
        const resolve = (uids) =>
          [...new Set(uids)].filter((u) => members.has(u));

        // { uid -> [satır] } e-posta özeti
        const emailDigest = new Map();
        const notifCol = db.collection(`offices/${officeId}/notifications`);

        // Bir olay için: her alıcıya deterministik bildirim yaz (yoksa) ve
        // e-posta özetine ekle.
        async function emit(evt) {
          for (const uid of evt.recipients) {
            const member = members.get(uid);
            if (!member) continue;
            const notifId = `rem_${evt.type}_${evt.key}_${evt.milestone}_${uid}`;
            const data = {
              forUid: uid,
              kind: "HATIRLATMA",
              text: evt.text,
              byName: "Ruhsat360 Hatırlatma",
              read: false,
              at: new Date().toISOString(),
            };
            if (evt.projectId) data.projectId = evt.projectId;
            if (evt.projectName) data.projectName = evt.projectName;
            if (evt.contactId) data.contactId = evt.contactId;
            try {
              await notifCol.doc(notifId).create(data);
            } catch (e) {
              // ALREADY_EXISTS → bu kilometre taşı için zaten bildirildi.
              continue;
            }
            if (member.email) {
              if (!emailDigest.has(uid)) emailDigest.set(uid, []);
              emailDigest.get(uid).push(evt.line);
            }
          }
        }

        for (const projDoc of projectsSnap.docs) {
          const project = projDoc.data() || {};
          const projectId = projDoc.id;
          const projectName = project.name || "Proje";
          const projectRecipients = resolve([
            ...(Array.isArray(project.memberIds) ? project.memberIds : []),
            ...adminUids,
          ]);

          // 1) Hizmet hedef tarihleri (devam eden hizmetler)
          for (const s of Array.isArray(project.services) ? project.services : []) {
            if (!s || !s.targetDate || s.status !== "DEVAM_EDIYOR") continue;
            const d = daysBetween(todayStr, s.targetDate);
            if (d === null || !REMINDER_MILESTONES.includes(d)) continue;
            const svcName = serviceTypeName.get(s.serviceTypeId) || "Hizmet";
            await emit({
              type: "svc",
              key: `${projectId}_${s.id}`,
              milestone: d,
              recipients: projectRecipients,
              projectId,
              projectName,
              text: `${projectName} · ${svcName} hedef tarihine ${d} gün kaldı (${trDate(
                s.targetDate
              )}).`,
              line: `${projectName} — ${svcName}: hedef ${trDate(
                s.targetDate
              )} (${d} gün kaldı)`,
            });
          }

          // 2) Evrak geçerlilik tarihleri
          for (const doc of Array.isArray(project.documents) ? project.documents : []) {
            if (!doc || !doc.expiryDate) continue;
            const d = daysBetween(todayStr, doc.expiryDate);
            if (d === null || !REMINDER_MILESTONES.includes(d)) continue;
            await emit({
              type: "doc",
              key: `${projectId}_${doc.id}`,
              milestone: d,
              recipients: projectRecipients,
              projectId,
              projectName,
              text: `${projectName} · "${doc.name || "Evrak"}" evrakının geçerliliğine ${d} gün kaldı (${trDate(
                doc.expiryDate
              )}).`,
              line: `${projectName} — ${doc.name || "Evrak"}: geçerlilik ${trDate(
                doc.expiryDate
              )} (${d} gün kaldı)`,
            });
          }
        }

        // 3) Vekaletname geçerlilik tarihleri (kişiler) — yöneticilere
        for (const cDoc of contactsSnap.docs) {
          const c = cDoc.data() || {};
          if (!c.poaExpiryDate) continue;
          const d = daysBetween(todayStr, c.poaExpiryDate);
          if (d === null || !REMINDER_MILESTONES.includes(d)) continue;
          await emit({
            type: "poa",
            key: cDoc.id,
            milestone: d,
            recipients: resolve(adminUids),
            contactId: cDoc.id,
            text: `${c.name || "Kişi"} vekaletnamesinin geçerliliğine ${d} gün kaldı (${trDate(
              c.poaExpiryDate
            )}).`,
            line: `${c.name || "Kişi"} — vekaletname geçerlilik ${trDate(
              c.poaExpiryDate
            )} (${d} gün kaldı)`,
          });
        }

        // E-posta özetlerini gönder (kişi başına tek e-posta)
        for (const [uid, lines] of emailDigest) {
          const member = members.get(uid);
          if (!member || !member.email || lines.length === 0) continue;
          try {
            await sendMailBridgeEmail({
              to: member.email,
              subject: "Ruhsat360 — Yaklaşan tarih hatırlatmaları",
              html: reminderEmailHtml(officeName, lines),
              text: [
                `Yaklaşan tarih hatırlatmaları — ${officeName}`,
                "",
                ...lines.map((l) => `• ${l}`),
              ].join("\n"),
            });
          } catch (e) {
            console.error(
              `Hatırlatma e-postası gönderilemedi (${officeId}/${uid}):`,
              e instanceof Error ? e.message : e
            );
          }
        }
      } catch (e) {
        console.error(
          `Ofis hatırlatmaları işlenemedi (${officeId}):`,
          e instanceof Error ? e.message : e
        );
      }
    }

    return null;
  }
);

exports.createWebsitePlatformInvite = onRequest(
  {
    region: "europe-west1",
    maxInstances: 10,
    secrets: [MAIL_BRIDGE_URL, MAIL_BRIDGE_SECRET],
  },
  async (req, res) => {
    setCors(req, res);

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({
        ok: false,
        message: "Sadece POST isteği kabul edilir.",
      });
      return;
    }

    try {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

      const email = cleanEmail(body.email);
      const companyName = cleanText(body.companyName, 160);
      const contactName = cleanText(body.contactName, 120);
      const phone = cleanText(body.phone, 40);
      const message = cleanText(body.message, 1000);
      const source = cleanText(body.source || "ruhsat360.com", 80);
      const kvkkConsent = body.kvkkConsent === true;
      const kvkkConsentAt = cleanText(body.kvkkConsentAt, 80);

      if (!companyName) {
        res.status(400).json({
          ok: false,
          message: "Firma adı zorunludur.",
        });
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({
          ok: false,
          message: "Geçerli bir e-posta adresi girin.",
        });
        return;
      }

      if (!kvkkConsent) {
        res.status(400).json({
          ok: false,
          message: "KVKK açık rıza onayı zorunludur.",
        });
        return;
      }

      const now = new Date().toISOString();
      const consentAt = kvkkConsentAt || now;
      const accessUntil = addDaysAsDateString(14);

      const inviteRef = db.collection("platformInvites").doc(email);
      const leadRef = db.collection("platformLeads").doc();

      const inviteData = {
        email,
        companyName,
        contactName: contactName || null,
        phone: phone || null,
        message: message || null,
        plan: "TRIAL",
        maxMembers: 10,
        accessStatus: "ACTIVE",
        accessUntil,
        status: "ACTIVE",
        source,
        customerType: "DEMO",
        kvkkConsent: true,
        kvkkConsentAt: consentAt,
        kvkkTextVersion: "2026-07-08",
        consentSource: "website-form",
        leadId: leadRef.id,
        createdAt: now,
        updatedAt: now,
        createdBy: "website-form",
      };

      const leadData = {
        id: leadRef.id,
        email,
        companyName,
        contactName: contactName || null,
        phone: phone || null,
        message: message || null,
        source,
        customerType: "DEMO",
        kvkkConsent: true,
        kvkkConsentAt: consentAt,
        kvkkTextVersion: "2026-07-08",
        consentSource: "website-form",
        status: "INVITE_CREATED",
        inviteEmail: email,
        plan: "TRIAL",
        maxMembers: 10,
        accessUntil,
        emailStatus: "PENDING",
        createdAt: now,
        updatedAt: now,
      };

      await db.runTransaction(async (tx) => {
        tx.set(inviteRef, inviteData, { merge: true });
        tx.set(leadRef, leadData);
      });

      let emailStatus = "NOT_SENT";
      let emailError = null;

      try {
        await Promise.all([
          sendMailBridgeEmail({
            to: email,
            subject: "Ruhsat360 demo davetiniz oluşturuldu",
            html: customerEmailHtml({ companyName, accessUntil }),
            text: customerEmailText({ companyName, accessUntil }),
          }),
          sendMailBridgeEmail({
            to: "info@ruhsat360.com",
            subject: `Yeni Ruhsat360 demo başvurusu — ${companyName}`,
            html: internalLeadEmailHtml({
              companyName,
              contactName,
              email,
              phone,
              source,
              message,
              accessUntil,
              kvkkConsentAt: consentAt,
            }),
            text: [
              "Yeni Ruhsat360 web başvurusu",
              "",
              `Firma: ${companyName}`,
              `Yetkili: ${contactName || "-"}`,
              `E-posta: ${email}`,
              `Telefon: ${phone || "-"}`,
              `Kaynak: ${source || "-"}`,
              `Demo bitiş: ${accessUntil}`,
              `KVKK onayı: Alındı — ${consentAt}`,
              "",
              `Mesaj: ${message || "-"}`,
            ].join("\n"),
          }),
        ]);

        emailStatus = "SENT";

        await leadRef.set(
          {
            emailStatus,
            emailSentAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        emailStatus = "FAILED";
        emailError = error instanceof Error ? error.message : String(error);

        console.error("Lead email failed:", emailError);

        await leadRef.set(
          {
            emailStatus,
            emailError,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      res.status(200).json({
        ok: true,
        message: "Başvurunuz alındı. Ruhsat360 davetiniz oluşturuldu.",
        email,
        companyName,
        accessUntil,
        emailStatus,
        emailError,
      });
    } catch (error) {
      console.error("createWebsitePlatformInvite failed:", error);

      res.status(500).json({
        ok: false,
        message: "Başvuru alınamadı. Lütfen daha sonra tekrar deneyin.",
      });
    }
  }
);
