const { onRequest } = require("firebase-functions/v2/https");
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

      const now = new Date().toISOString();
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
