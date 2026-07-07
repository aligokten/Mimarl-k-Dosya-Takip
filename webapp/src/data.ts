import { useSyncExternalStore } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  deleteUser,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FbUser,
} from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
  writeBatch,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { auth, db, storage, googleProvider } from "./firebase";
import { applySharedDriveClientId, deleteDriveFile } from "./drive";
import type {
  Activity,
  ActivityType,
  AppNotification,
  ChatMessage,
  Contact,
  CustomTemplate,
  Invite,
  Member,
  PlatformInvite,
  UserOfficeIndex,
  MemberRole,
  MevzuatDoc,
  MevzuatKind,
  Office,
  Professional,
  Project,
  ServiceType,
} from "./types";
import { MAX_MEMBERS } from "./types";

export function uid(): string {
  return crypto.randomUUID();
}
export function now(): string {
  return new Date().toISOString();
}

// ---- Durum ----

export interface AppState {
  authReady: boolean;
  user: FbUser | null;
  office: Office | null;
  officeId: string | null;
  officeChecked: boolean;
  canCreateOffice: boolean;
  me: Member | null;
  members: Member[];
  invites: Invite[];
  contacts: Contact[];
  serviceTypes: ServiceType[];
  docTemplates: CustomTemplate[];
  projects: Project[];
  notifications: AppNotification[];
  activityFeed: Activity[];
  professionals: Professional[];
  mevzuat: MevzuatDoc[];
  chat: ChatMessage[];
}

let state: AppState = {
  authReady: false,
  user: null,
  office: null,
  officeId: null,
  officeChecked: false,
  canCreateOffice: false,
  me: null,
  members: [],
  invites: [],
  contacts: [],
  serviceTypes: [],
  docTemplates: [],
  projects: [],
  notifications: [],
  activityFeed: [],
  professionals: [],
  mevzuat: [],
  chat: [],
};

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  emit();
}

export function useApp(): AppState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => state
  );
}

// ---- Auth + realtime abonelikleri ----

let dataUnsubs: Unsubscribe[] = [];

function clearDataSubs() {
  dataUnsubs.forEach((u) => u());
  dataUnsubs = [];
}

function stripId<T>(d: { id: string; data: () => unknown }): T {
  return { id: d.id, ...(d.data() as object) } as T;
}

// Ofis genelinde paylaşılan Drive ayarını ilgili modüle yansıtır.
function applyOfficeSharedConfig(office: Office | null) {
  applySharedDriveClientId(office?.driveClientId);
}

function requireOfficeId(): string {
  if (!state.officeId) throw new Error("Ofis bulunamadı.");
  return state.officeId;
}

function officeCol(name: string) {
  return collection(db(), "offices", requireOfficeId(), name);
}

function officeDoc(collectionName: string, id: string) {
  return doc(db(), "offices", requireOfficeId(), collectionName, id);
}

function officeProjectActivities(projectId: string) {
  return collection(db(), "offices", requireOfficeId(), "projects", projectId, "activities");
}

async function startForMember(fbUser: FbUser, officeId: string) {
  clearDataSubs();
  set({ officeId });

  const officeRef = doc(db(), "offices", officeId);
  const meRef = doc(db(), "offices", officeId, "members", fbUser.uid);

  dataUnsubs.push(
    onSnapshot(officeRef, (snap) => {
      const office = snap.exists()
        ? ({ id: officeId, ...(snap.data() as Office) } as Office)
        : null;
      applyOfficeSharedConfig(office);
      set({ office, officeChecked: true });
    })
  );
  dataUnsubs.push(
    onSnapshot(meRef, (snap) => {
      set({ me: snap.exists() ? (snap.data() as Member) : null });
    })
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "offices", officeId, "members"), (snap) => {
      set({ members: snap.docs.map((d) => d.data() as Member) });
    })
  );
  dataUnsubs.push(
    onSnapshot(
      collection(db(), "offices", officeId, "invites"),
      (snap) => set({ invites: snap.docs.map((d) => d.data() as Invite) }),
      () => set({ invites: [] })
    )
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "offices", officeId, "contacts"), (snap) => {
      set({ contacts: snap.docs.map((d) => stripId<Contact>(d)) });
    })
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "offices", officeId, "serviceTypes"), (snap) => {
      set({ serviceTypes: snap.docs.map((d) => stripId<ServiceType>(d)) });
    })
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "offices", officeId, "docTemplates"), (snap) => {
      set({ docTemplates: snap.docs.map((d) => stripId<CustomTemplate>(d)) });
    })
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "offices", officeId, "projects"), (snap) => {
      set({ projects: snap.docs.map((d) => stripId<Project>(d)) });
    })
  );
  dataUnsubs.push(
    onSnapshot(
      query(
        collection(db(), "offices", officeId, "notifications"),
        where("forUid", "==", fbUser.uid)
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => stripId<AppNotification>(d))
          .sort((a, b) => b.at.localeCompare(a.at));
        set({ notifications: list });
      }
    )
  );
  dataUnsubs.push(
    onSnapshot(
      query(collection(db(), "offices", officeId, "activity"), orderBy("at", "desc"), limit(30)),
      (snap) => set({ activityFeed: snap.docs.map((d) => stripId<Activity>(d)) }),
      () => set({ activityFeed: [] })
    )
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "offices", officeId, "professionals"), (snap) => {
      set({ professionals: snap.docs.map((d) => stripId<Professional>(d)) });
    })
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "offices", officeId, "mevzuat"), (snap) => {
      set({ mevzuat: snap.docs.map((d) => stripId<MevzuatDoc>(d)) });
    })
  );
  dataUnsubs.push(
    onSnapshot(
      query(collection(db(), "offices", officeId, "chat"), orderBy("at", "desc"), limit(100)),
      (snap) => {
        const list = snap.docs
          .map((d) => stripId<ChatMessage>(d))
          .sort((a, b) => a.at.localeCompare(b.at));
        set({ chat: list });
      },
      () => set({ chat: [] })
    )
  );
}

export function initAuth() {
  onAuthStateChanged(auth(), async (fbUser) => {
    if (!fbUser) {
      clearDataSubs();
      applyOfficeSharedConfig(null);
      set({
        authReady: true,
        user: null,
        office: null,
        officeId: null,
        officeChecked: false,
        canCreateOffice: false,
        me: null,
        members: [],
        invites: [],
        contacts: [],
        serviceTypes: [],
        docTemplates: [],
        projects: [],
        notifications: [],
        activityFeed: [],
        professionals: [],
        mevzuat: [],
        chat: [],
      });
      return;
    }

    const email = fbUser.email?.trim().toLowerCase() ?? "";
    const indexSnap = await getDoc(doc(db(), "userOfficeIndex", fbUser.uid));

    if (indexSnap.exists()) {
      const index = indexSnap.data() as UserOfficeIndex;
      const officeSnap = await getDoc(doc(db(), "offices", index.officeId));
      const office = officeSnap.exists()
        ? ({ id: index.officeId, ...(officeSnap.data() as Office) } as Office)
        : null;
      const meSnap = await getDoc(
        doc(db(), "offices", index.officeId, "members", fbUser.uid)
      );
      applyOfficeSharedConfig(office);
      set({
        user: fbUser,
        authReady: true,
        office,
        officeId: index.officeId,
        officeChecked: true,
        canCreateOffice: false,
        me: meSnap.exists() ? (meSnap.data() as Member) : null,
      });
      if (office && meSnap.exists()) startForMember(fbUser, index.officeId);
      return;
    }

    const platformInviteSnap = email
      ? await getDoc(doc(db(), "platformInvites", email)).catch(() => null)
      : null;

    set({
      user: fbUser,
      authReady: true,
      office: null,
      officeId: null,
      officeChecked: true,
      canCreateOffice: !!platformInviteSnap?.exists(),
      me: null,
      members: [],
      invites: [],
      contacts: [],
      serviceTypes: [],
      docTemplates: [],
      projects: [],
      notifications: [],
      activityFeed: [],
      professionals: [],
      mevzuat: [],
      chat: [],
    });
  });
}

export async function signInWithGoogle() {
  await signInWithPopup(auth(), googleProvider);
}

export async function signOutUser() {
  await fbSignOut(auth());
  clearDataSubs();
}

// ---- Ofis kurulumu / davet ----

const DEFAULT_SERVICES: { name: string; stages: string[] }[] = [
  {
    name: "Mimari Proje",
    stages: [
      "Röleve / Ölçüm",
      "Ön Proje",
      "Kesin Proje",
      "Uygulama Projesi",
      "Müellif Onayı",
      "Belediye Onayı",
      "Teslim",
    ],
  },
  {
    name: "Akustik Rapor",
    stages: ["Saha Ölçümü", "Rapor Hazırlığı", "Kontrol / Onay", "Teslim"],
  },
  {
    name: "Yapı Ruhsatı",
    stages: [
      "Evrak Toplama",
      "Vekaletname Kontrolü",
      "Belediyeye Başvuru",
      "İnceleme",
      "Eksik Evrak Tamamlama",
      "Ruhsat Onayı",
      "Ruhsat Teslimi",
    ],
  },
  {
    name: "Yapı Kullanma İzni (İskan)",
    stages: [
      "Evrak Toplama",
      "Kurum Vizeleri",
      "Belediyeye Başvuru",
      "İnceleme",
      "İskan Onayı",
      "İskan Teslimi",
    ],
  },
  { name: "Zemin Etüdü", stages: ["Saha Çalışması", "Laboratuvar", "Teslim"] },
];

export async function createOffice(officeName: string) {
  const u = auth().currentUser;
  if (!u || !u.email) throw new Error("Önce Google ile giriş yapın.");

  const email = u.email.trim().toLowerCase();
  const inviteRef = doc(db(), "platformInvites", email);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) {
    throw new Error("Bu Gmail adresi ofis kurmak için yetkilendirilmemiş.");
  }

  const invite = inviteSnap.data() as PlatformInvite;
  const officeId = uid();
  const office: Office = {
    id: officeId,
    name: officeName.trim() || "Mimarlık Ofisi",
    ownerUid: u.uid,
    ownerEmail: email,
    plan: invite.plan ?? "STARTER",
    maxMembers: invite.maxMembers ?? MAX_MEMBERS,
    subscriptionStatus: "ACTIVE",
    createdAt: now(),
  };
  const me: Member = {
    uid: u.uid,
    email,
    displayName: u.displayName ?? email,
    photoURL: u.photoURL ?? undefined,
    role: "ADMIN",
    createdAt: now(),
  };

  const batch = writeBatch(db());
  batch.set(doc(db(), "offices", officeId), stripUndefined(office));
  batch.set(doc(db(), "offices", officeId, "members", u.uid), stripUndefined(me));
  batch.set(doc(db(), "userOfficeIndex", u.uid), {
    officeId,
    role: "ADMIN",
    email,
    createdAt: now(),
  });

  for (let i = 0; i < DEFAULT_SERVICES.length; i++) {
    const s = DEFAULT_SERVICES[i];
    const id = uid();
    batch.set(doc(db(), "offices", officeId, "serviceTypes", id), {
      name: s.name,
      order: i,
      stages: s.stages.map((name) => ({ id: uid(), name })),
    });
  }

  batch.delete(inviteRef);
  await batch.commit();
  set({ office, officeId, me, canCreateOffice: false });
  startForMember(u, officeId);
}

// Çalışan girişi: e-posta + (ilk seferde geçici) şifre. İlk girişte hesap
// yoksa davet doğrulanıp Firebase hesabı ve üye kaydı oluşturulur.
export async function signInWithEmail(
  emailRaw: string,
  password: string
): Promise<{ ok: boolean; message: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) {
    return { ok: false, message: "E-posta ve şifre gerekli." };
  }
  // Önce normal giriş dene (hesap zaten varsa).
  try {
    await signInWithEmailAndPassword(auth(), email, password);
    return { ok: true, message: "" };
  } catch {
    // Hesap yok (ilk giriş) ya da şifre yanlış — ayırt etmek için hesabı
    // oluşturmayı deneriz.
  }
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth(), email, password);
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "";
    if (code === "auth/email-already-in-use") {
      return { ok: false, message: "E-posta veya şifre hatalı." };
    }
    if (code === "auth/weak-password") {
      return { ok: false, message: "Şifre en az 6 karakter olmalı." };
    }
    if (code === "auth/invalid-email") {
      return { ok: false, message: "Geçersiz e-posta adresi." };
    }
    if (code === "auth/operation-not-allowed") {
      return {
        ok: false,
        message:
          "E-posta/şifre girişi Firebase'de etkin değil. Yönetici Firebase Console > Authentication'dan etkinleştirmeli.",
      };
    }
    return { ok: false, message: "Giriş yapılamadı. Bilgileri kontrol edin." };
  }
  // Hesap yeni oluşturuldu → herhangi bir ofiste davet var mı ve geçici şifre doğru mu?
  try {
    const inviteQuery = query(
      collectionGroup(db(), "invites"),
      where("email", "==", email),
      limit(1)
    );
    const inviteResult = await getDocs(inviteQuery);
    const inviteDoc = inviteResult.docs[0];
    const officeId = inviteDoc?.ref.parent.parent?.id;

    if (!inviteDoc || !officeId) {
      await deleteUser(cred.user).catch(() => {});
      return {
        ok: false,
        message:
          "Bu e-posta herhangi bir ofise davet edilmemiş. Lütfen yöneticinizle görüşün.",
      };
    }
    const invite = inviteDoc.data() as Invite;
    if (invite.tempPassword !== password) {
      await deleteUser(cred.user).catch(() => {});
      return { ok: false, message: "Geçici şifre hatalı." };
    }
    const me: Member = {
      uid: cred.user.uid,
      email,
      displayName: invite.displayName?.trim() || email.split("@")[0],
      role: invite.role,
      mustChangePassword: true,
      createdAt: now(),
    };

    const batch = writeBatch(db());
    batch.set(doc(db(), "offices", officeId, "members", cred.user.uid), stripUndefined(me));
    batch.set(doc(db(), "userOfficeIndex", cred.user.uid), {
      officeId,
      role: invite.role,
      email,
      createdAt: now(),
    });
    batch.delete(inviteDoc.ref);
    await batch.commit();

    set({ me, officeId });
    startForMember(cred.user, officeId);
    return { ok: true, message: "" };
  } catch {
    await deleteUser(cred.user).catch(() => {});
    return { ok: false, message: "Üyelik oluşturulamadı, tekrar deneyin." };
  }
}

// İlk girişte (ya da istediğinde) şifre değiştirme.
export async function changeMyPassword(newPassword: string) {
  const u = auth().currentUser;
  if (!u) throw new Error("Oturum bulunamadı.");
  await updatePassword(u, newPassword);
  await updateDoc(officeDoc("members", u.uid), { mustChangePassword: false });
}

// ---- Davet (yönetici e-posta ile çalışan ekler) ----

export async function createInvite(
  emailRaw: string,
  tempPassword: string,
  role: MemberRole,
  displayName?: string
): Promise<{ ok: boolean; message: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Geçerli bir e-posta girin." };
  }
  if (tempPassword.trim().length < 6) {
    return { ok: false, message: "Geçici şifre en az 6 karakter olmalı." };
  }
  const activeCount = state.members.length + state.invites.length;
  const maxMembers = state.office?.maxMembers ?? MAX_MEMBERS;
  const alreadyMember = state.members.some(
    (m) => m.email.toLowerCase() === email
  );
  const alreadyInvited = state.invites.some((i) => i.email === email);
  if (!alreadyMember && !alreadyInvited && activeCount >= maxMembers) {
    return {
      ok: false,
      message: `Ofis en fazla ${maxMembers} kullanıcı olabilir. Önce bir yer açın.`,
    };
  }
  if (alreadyMember) {
    return { ok: false, message: "Bu e-posta zaten üye." };
  }
  const invite: Invite = {
    email,
    tempPassword: tempPassword.trim(),
    role,
    displayName: displayName?.trim() || undefined,
    createdAt: now(),
  };
  await setDoc(officeDoc("invites", email), stripUndefined(invite));
  return { ok: true, message: "Çalışan eklendi. Geçici şifreyi paylaşın." };
}

export async function deleteInvite(emailRaw: string) {
  await deleteDoc(officeDoc("invites", emailRaw.trim().toLowerCase()));
}

// ---- Ofis paylaşımlı ayarları (yalnızca yönetici) ----

export async function updateOfficeConfig(patch: {
  driveClientId?: string;
}) {
  await updateDoc(doc(db(), "offices", requireOfficeId()), patch);
}

// ---- Dış paydaşlar (uzmanlar) ----

export async function addProfessional(
  data: Omit<Professional, "id" | "createdAt">
) {
  const id = uid();
  await setDoc(
    officeDoc("professionals", id),
    stripUndefined({ ...data, createdAt: now() })
  );
  return id;
}
export async function updateProfessional(
  id: string,
  data: Partial<Omit<Professional, "id" | "createdAt">>
) {
  await setDoc(officeDoc("professionals", id), stripUndefined(data), {
    merge: true,
  });
}
export async function deleteProfessional(id: string) {
  await deleteDoc(officeDoc("professionals", id));
}

// ---- Mevzuat / İmar Plan Notu (PDF Google Drive'da) ----

export async function addMevzuat(meta: {
  title: string;
  category?: string;
  kind: MevzuatKind;
  fileId?: string;
  previewUrl?: string;
  webViewLink?: string;
}): Promise<string> {
  const id = uid();
  await setDoc(
    officeDoc("mevzuat", id),
    stripUndefined({
      kind: meta.kind,
      title: meta.title.trim(),
      category: meta.category?.trim() || undefined,
      fileId: meta.fileId,
      previewUrl: meta.previewUrl,
      webViewLink: meta.webViewLink,
      byName: currentName().name,
      createdAt: now(),
    })
  );
  return id;
}

export async function deleteMevzuat(item: MevzuatDoc) {
  await deleteDoc(officeDoc("mevzuat", item.id));
  // Drive dosyasını da temizle (bağlıysa); eski Storage dosyalarını da sil.
  if (item.fileId) await deleteDriveFile(item.fileId).catch(() => {});
  if (item.storagePath)
    await deleteObject(storageRef(storage(), item.storagePath)).catch(() => {});
}

// ---- Ofis içi sohbet ----

export async function sendChatMessage(text: string) {
  const t = text.trim();
  if (!t) return;
  const who = currentName();
  await addDoc(officeCol("chat"), {
    fromUid: who.uid,
    fromName: who.name,
    text: t,
    at: now(),
    ts: serverTimestamp(),
  });
}

export async function sendChatFile(file: File) {
  const who = currentName();
  const id = uid();
  const path = `offices/${requireOfficeId()}/chat/${id}-${file.name}`;
  const r = storageRef(storage(), path);
  await uploadBytes(r, file, {
    contentType: file.type || "application/octet-stream",
  });
  const fileUrl = await getDownloadURL(r);
  const kind = file.type.startsWith("image/")
    ? "image"
    : file.type === "application/pdf"
      ? "pdf"
      : "file";
  await addDoc(officeCol("chat"), {
    fromUid: who.uid,
    fromName: who.name,
    fileUrl,
    fileName: file.name,
    fileKind: kind,
    storagePath: path,
    at: now(),
    ts: serverTimestamp(),
  });
}

// Sohbeti temizle (mesajları ve yüklenen dosyaları siler).
export async function clearChat() {
  const snap = await getDocs(officeCol("chat"));
  await Promise.all(
    snap.docs.map(async (d) => {
      const path = (d.data() as ChatMessage).storagePath;
      if (path)
        await deleteObject(storageRef(storage(), path)).catch(() => {});
      await deleteDoc(d.ref);
    })
  );
}

// ---- Üye / profil ----

export async function updateMyProfile(patch: {
  displayName?: string;
  phone?: string;
  title?: string;
}) {
  const u = auth().currentUser;
  if (!u) return;
  await updateDoc(officeDoc("members", u.uid), stripUndefined(patch));
}

export async function setMemberRole(uidToSet: string, role: MemberRole) {
  await updateDoc(officeDoc("members", uidToSet), { role });
}

export async function removeMember(uidToRemove: string) {
  await deleteDoc(officeDoc("members", uidToRemove));
}

// ---- Yardımcılar ----

/* eslint-disable @typescript-eslint/no-explicit-any */
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function currentName(): { uid: string; name: string } {
  const m = state.me;
  const u = auth().currentUser;
  return {
    uid: u?.uid ?? "",
    name: m?.displayName ?? u?.displayName ?? u?.email ?? "Bilinmeyen",
  };
}

// ---- Aktivite + bildirim ----

export async function addActivity(
  projectId: string,
  type: ActivityType,
  text: string
) {
  const who = currentName();
  const at = now();
  const projectName = state.projects.find((p) => p.id === projectId)?.name;
  const payload = {
    projectId,
    projectName,
    type,
    text,
    byUid: who.uid,
    byName: who.name,
    at,
  };
  // Projeye ait aktivite geçmişi
  await addDoc(officeProjectActivities(projectId), {
    ...stripUndefined(payload),
    ts: serverTimestamp(),
  });
  // Panel "Son İşlemler" için ofis geneli akış (hata olsa da ana akışı kesme)
  await addDoc(
    officeCol("activity"),
    stripUndefined({ ...payload, ts: serverTimestamp() })
  ).catch(() => {});
}

async function notifyMembers(project: Project, text: string) {
  const who = currentName();
  const targets = new Set(project.memberIds ?? []);
  targets.delete(who.uid); // kendine bildirim gönderme
  if (targets.size === 0) return;
  const batch = writeBatch(db());
  for (const forUid of targets) {
    const ref = doc(officeCol("notifications"));
    batch.set(ref, {
      forUid,
      projectId: project.id,
      projectName: project.name,
      text,
      byName: who.name,
      read: false,
      at: now(),
    });
  }
  await batch.commit();
}

export async function markNotificationRead(id: string) {
  await updateDoc(officeDoc("notifications", id), { read: true });
}

export async function markAllNotificationsRead() {
  const unread = state.notifications.filter((n) => !n.read);
  const batch = writeBatch(db());
  for (const n of unread) {
    batch.update(officeDoc("notifications", n.id), { read: true });
  }
  if (unread.length) await batch.commit();
}

export async function loadActivities(projectId: string): Promise<Activity[]> {
  const snap = await getDocs(
    query(
      collection(db(), "offices", requireOfficeId(), "projects", projectId, "activities"),
      orderBy("at", "desc")
    )
  );
  return snap.docs.map((d) => stripId<Activity>(d));
}

// ---- Kişiler ----

export async function addContact(data: Omit<Contact, "id" | "createdAt">) {
  const id = uid();
  await setDoc(
    officeDoc("contacts", id),
    stripUndefined({ ...data, createdAt: now() })
  );
  return id;
}
export async function updateContact(
  id: string,
  data: Partial<Omit<Contact, "id" | "createdAt">>
) {
  await setDoc(officeDoc("contacts", id), stripUndefined(data), {
    merge: true,
  });
}
export async function deleteContact(id: string) {
  await deleteDoc(officeDoc("contacts", id));
}

// ---- Hizmet türleri ----

export async function addServiceType(name: string) {
  const id = uid();
  const order = state.serviceTypes.length;
  await setDoc(officeDoc("serviceTypes", id), { name, order, stages: [] });
}
export async function deleteServiceType(id: string) {
  await deleteDoc(officeDoc("serviceTypes", id));
}
export async function addStage(serviceTypeId: string, name: string) {
  const st = state.serviceTypes.find((s) => s.id === serviceTypeId);
  if (!st) return;
  await updateDoc(officeDoc("serviceTypes", serviceTypeId), {
    stages: [...st.stages, { id: uid(), name }],
  });
}
export async function deleteStage(serviceTypeId: string, stageId: string) {
  const st = state.serviceTypes.find((s) => s.id === serviceTypeId);
  if (!st) return;
  await updateDoc(officeDoc("serviceTypes", serviceTypeId), {
    stages: st.stages.filter((s) => s.id !== stageId),
  });
}

// ---- Şablonlar ----

export async function addDocTemplate(
  t: Omit<CustomTemplate, "id" | "createdAt">
) {
  const id = uid();
  await setDoc(
    officeDoc("docTemplates", id),
    stripUndefined({ ...t, createdAt: now() })
  );
  return id;
}
export async function deleteDocTemplate(id: string) {
  await deleteDoc(officeDoc("docTemplates", id));
}

// ---- Projeler ----

export async function addProject(
  data: Omit<
    Project,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "status"
    | "services"
    | "documents"
    | "noteList"
    | "memberIds"
  >
) {
  const id = uid();
  const who = currentName();
  const project: Project = {
    ...data,
    id,
    status: "DEVAM_EDIYOR",
    services: [],
    documents: [],
    noteList: [],
    memberIds: who.uid ? [who.uid] : [],
    createdAt: now(),
    updatedAt: now(),
  };
  await setDoc(officeDoc("projects", id), stripUndefined(project));
  await addActivity(id, "PROJE_OLUSTURULDU", `${who.name} projeyi oluşturdu`);
  return id;
}

// Projeyi kısmi günceller; opsiyonel aktivite ve bildirim yazar.
export async function patchProject(
  projectId: string,
  patch: Partial<Project>,
  activity?: { type: ActivityType; text: string; notify?: boolean }
) {
  await updateDoc(officeDoc("projects", projectId), {
    ...stripUndefined(patch),
    updatedAt: now(),
  });
  if (activity) {
    await addActivity(projectId, activity.type, activity.text);
    if (activity.notify) {
      const project = state.projects.find((p) => p.id === projectId);
      if (project) await notifyMembers(project, activity.text);
    }
  }
}

export async function deleteProject(projectId: string) {
  await deleteDoc(officeDoc("projects", projectId));
}
