const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const MAX_MEMBERS = 10;
const REGION = "europe-west1";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
  const role = String(value || "STAFF").trim().toUpperCase();

  if (!["ADMIN", "STAFF", "STAJYER"].includes(role)) {
    throw new HttpsError("invalid-argument", "Geçersiz rol.");
  }

  return role;
}

exports.createEmployee = onCall(
  {
    region: REGION,
    cors: true
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Oturum bulunamadı.");
    }

    const db = getFirestore();
    const auth = getAuth();

    const callerUid = request.auth.uid;
    const email = normalizeEmail(request.data?.email);
    const tempPassword = String(request.data?.tempPassword || "").trim();
    const role = normalizeRole(request.data?.role);
    const displayName =
      String(request.data?.displayName || "").trim() || email.split("@")[0];

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "Geçerli bir e-posta girin.");
    }

    if (tempPassword.length < 6) {
      throw new HttpsError(
        "invalid-argument",
        "Geçici şifre en az 6 karakter olmalı."
      );
    }

    const callerIndexSnap = await db
      .collection("userOfficeIndex")
      .doc(callerUid)
      .get();

    if (!callerIndexSnap.exists) {
      throw new HttpsError("permission-denied", "Ofis bağlantısı bulunamadı.");
    }

    const callerIndex = callerIndexSnap.data() || {};
    const officeId =
      callerIndex.primaryOfficeId ||
      (Array.isArray(callerIndex.officeIds) ? callerIndex.officeIds[0] : "") ||
      Object.keys(callerIndex.offices || {})[0];

    if (!officeId) {
      throw new HttpsError("permission-denied", "Aktif ofis bulunamadı.");
    }

    const callerMemberSnap = await db
      .collection("offices")
      .doc(officeId)
      .collection("members")
      .doc(callerUid)
      .get();

    if (!callerMemberSnap.exists) {
      throw new HttpsError("permission-denied", "Ofis üyeliğiniz bulunamadı.");
    }

    const callerMember = callerMemberSnap.data() || {};

    if (callerMember.role !== "ADMIN") {
      throw new HttpsError(
        "permission-denied",
        "Çalışan eklemek için yönetici olmalısınız."
      );
    }

    const sameEmailSnap = await db
      .collection("offices")
      .doc(officeId)
      .collection("members")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!sameEmailSnap.empty) {
      throw new HttpsError("already-exists", "Bu e-posta zaten üye.");
    }

    const membersSnap = await db
      .collection("offices")
      .doc(officeId)
      .collection("members")
      .get();

    if (membersSnap.size >= MAX_MEMBERS) {
      throw new HttpsError(
        "failed-precondition",
        `Ofis en fazla ${MAX_MEMBERS} kullanıcı olabilir.`
      );
    }

    let userRecord;

    try {
      userRecord = await auth.createUser({
        email,
        password: tempPassword,
        displayName,
        emailVerified: true
      });
    } catch (error) {
      if (error?.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "Bu e-posta için daha önce kullanıcı oluşturulmuş."
        );
      }

      throw new HttpsError(
        "internal",
        "Auth kullanıcısı oluşturulamadı: " + (error?.message || "")
      );
    }

    const now = new Date().toISOString();

    const member = {
      uid: userRecord.uid,
      email,
      displayName,
      role,
      mustChangePassword: true,
      createdAt: now
    };

    const batch = db.batch();

    batch.set(
      db
        .collection("offices")
        .doc(officeId)
        .collection("members")
        .doc(userRecord.uid),
      member,
      { merge: true }
    );

    batch.set(
      db.collection("userOfficeIndex").doc(userRecord.uid),
      {
        uid: userRecord.uid,
        email,
        primaryOfficeId: officeId,
        officeIds: [officeId],
        offices: {
          [officeId]: {
            officeId,
            role,
            status: "ACTIVE"
          }
        },
        createdAt: now,
        updatedAt: now
      },
      { merge: true }
    );

    batch.delete(db.collection("platformInvites").doc(email));

    batch.delete(
      db
        .collection("offices")
        .doc(officeId)
        .collection("invites")
        .doc(email)
    );

    try {
      await batch.commit();
    } catch (error) {
      await auth.deleteUser(userRecord.uid).catch(() => {});

      throw new HttpsError(
        "internal",
        "Üyelik kayıtları yazılamadı: " + (error?.message || "")
      );
    }

    return {
      ok: true,
      uid: userRecord.uid,
      email,
      displayName,
      role
    };
  }
);
