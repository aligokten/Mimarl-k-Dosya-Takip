const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

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

exports.createWebsitePlatformInvite = onRequest(
  {
    region: "europe-west1",
    maxInstances: 10,
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
        source,
        status: "INVITE_CREATED",
        inviteEmail: email,
        plan: "TRIAL",
        maxMembers: 10,
        accessUntil,
        createdAt: now,
        updatedAt: now,
      };

      await db.runTransaction(async (tx) => {
        tx.set(inviteRef, inviteData, { merge: true });
        tx.set(leadRef, leadData);
      });

      res.status(200).json({
        ok: true,
        message: "Başvurunuz alındı. Ruhsat360 davetiniz oluşturuldu.",
        email,
        companyName,
        accessUntil,
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
