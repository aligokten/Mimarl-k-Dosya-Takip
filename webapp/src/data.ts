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
  officeChecked: boolean;
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
  officeChecked: false,
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

async function startForMember(fbUser: FbUser) {
  clearDataSubs();

  const officeRef = doc(db(), "office", "main");
  const meRef = doc(db(), "members", fbUser.uid);

  dataUnsubs.push(
    onSnapshot(officeRef, (snap) => {
      const office = snap.exists() ? (snap.data() as Office) : null;
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
    onSnapshot(collection(db(), "members"), (snap) => {
      set({ members: snap.docs.map((d) => d.data() as Member) });
    })
  );
  // Davetler yalnızca yönetici tarafından listelenebilir; yetki yoksa
  // (çalışan oturumu) dinleyici hata verir, bunu sessizce boş liste yaparız.
  dataUnsubs.push(
    onSnapshot(
      collection(db(), "invites"),
      (snap) => set({ invites: snap.docs.map((d) => d.data() as Invite) }),
      () => set({ invites: [] })
    )
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "contacts"), (snap) => {
      set({ contacts: snap.docs.map((d) => stripId<Contact>(d)) });
    })
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "serviceTypes"), (snap) => {
      set({ serviceTypes: snap.docs.map((d) => stripId<ServiceType>(d)) });
    })
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "docTemplates"), (snap) => {
      set({ docTemplates: snap.docs.map((d) => stripId<CustomTemplate>(d)) });
    })
  );
  dataUnsubs.push(
    onSnapshot(collection(db(), "projects"), (snap) => {
      set({ projects: snap.docs.map((d) => stripId<Project>(d)) });
    })
  );
  dataUnsubs.push(
    onSnapshot(
      query(
        collection(db(), "notifications"),
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
  // Son işlemler (ofis geneli aktivite akışı)
  dataUnsubs.push(
    onSnapshot(
      query(collection(db(), "activity"), orderBy("at", "desc"), limit(30)),
      (snap) => set({ activityFeed: snap.docs.map((d) => stripId<Activity>(d)) }),
      () => set({ activityFeed: [] })
    )
  );
  // Dış paydaşlar (uzmanlar)
  dataUnsubs.push(
    onSnapshot(collection(db(), "professionals"), (snap) => {
      set({ professionals: snap.docs.map((d) => stripId<Professional>(d)) });
    })
  );
  // Mevzuat PDF'leri
  dataUnsubs.push(
    onSnapshot(collection(db(), "mevzuat"), (snap) => {
      set({ mevzuat: snap.docs.map((d) => stripId<MevzuatDoc>(d)) });
    })
  );
  // Ofis içi sohbet (son 100 mesaj)
  dataUnsubs.push(
    onSnapshot(
      query(collection(db(), "chat"), orderBy("at", "desc"), limit(100)),
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
        officeChecked: false,
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
    // Ofis var mı ve bu kullanıcı üye mi?
    const officeSnap = await getDoc(doc(db(), "office", "main"));
    const office = officeSnap.exists() ? (officeSnap.data() as Office) : null;
    applyOfficeSharedConfig(office);
    set({
      user: fbUser,
      authReady: true,
      office,
      officeChecked: true,
    });
    const meSnap = await getDoc(doc(db(), "members", fbUser.uid));
    if (meSnap.exists()) {
      set({ me: meSnap.data() as Member });
      startForMember(fbUser);
    } else {
      set({ me: null });
    }
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
  if (!u) throw new Error("Önce giriş yapın.");
  const office: Office = {
    name: officeName.trim() || "Mimarlık Ofisi",
    ownerUid: u.uid,
    createdAt: now(),
  };
  await setDoc(doc(db(), "office", "main"), office);
  const me: Member = {
    uid: u.uid,
    email: u.email ?? "",
    displayName: u.displayName ?? (u.email ?? "Yönetici"),
    photoURL: u.photoURL ?? undefined,
    role: "ADMIN",
    createdAt: now(),
  };
  await setDoc(doc(db(), "members", u.uid), stripUndefined(me));

  // Varsayılan hizmet türleri
  const batch = writeBatch(db());
  for (let i = 0; i < DEFAULT_SERVICES.length; i++) {
    const s = DEFAULT_SERVICES[i];
    const id = uid();
    batch.set(doc(db(), "serviceTypes", id), {
      name: s.name,
      order: i,
      stages: s.stages.map((name) => ({ id: uid(), name })),
    });
  }
  await batch.commit();
  set({ office, me });
  startForMember(u);
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
  // Hesap yeni oluşturuldu → davet var mı ve geçici şifre doğru mu?
  try {
    const inviteSnap = await getDoc(doc(db(), "invites", email));
    if (!inviteSnap.exists()) {
      await deleteUser(cred.user).catch(() => {});
      return {
        ok: false,
        message:
          "Bu e-posta ofise davet edilmemiş. Lütfen yöneticinizle görüşün.",
      };
    }
    const invite = inviteSnap.data() as Invite;
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
    await setDoc(doc(db(), "members", cred.user.uid), stripUndefined(me));
    await deleteDoc(doc(db(), "invites", email)).catch(() => {});
    set({ me });
    startForMember(cred.user);
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
  await updateDoc(doc(db(), "members", u.uid), { mustChangePassword: false });
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
  const alreadyMember = state.members.some(
    (m) => m.email.toLowerCase() === email
  );
  const alreadyInvited = state.invites.some((i) => i.email === email);
  if (!alreadyMember && !alreadyInvited && activeCount >= MAX_MEMBERS) {
    return {
      ok: false,
      message: `Ofis en fazla ${MAX_MEMBERS} kullanıcı olabilir. Önce bir yer açın.`,
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
  await setDoc(doc(db(), "invites", email), stripUndefined(invite));
  return { ok: true, message: "Çalışan eklendi. Geçici şifreyi paylaşın." };
}

export async function deleteInvite(emailRaw: string) {
  await deleteDoc(doc(db(), "invites", emailRaw.trim().toLowerCase()));
}

// ---- Ofis paylaşımlı ayarları (yalnızca yönetici) ----

export async function updateOfficeConfig(patch: {
  driveClientId?: string;
}) {
  await updateDoc(doc(db(), "office", "main"), patch);
}

// ---- Dış paydaşlar (uzmanlar) ----

export async function addProfessional(
  data: Omit<Professional, "id" | "createdAt">
) {
  const id = uid();
  await setDoc(
    doc(db(), "professionals", id),
    stripUndefined({ ...data, createdAt: now() })
  );
  return id;
}
export async function updateProfessional(
  id: string,
  data: Partial<Omit<Professional, "id" | "createdAt">>
) {
  await setDoc(doc(db(), "professionals", id), stripUndefined(data), {
    merge: true,
  });
}
export async function deleteProfessional(id: string) {
  await deleteDoc(doc(db(), "professionals", id));
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
    doc(db(), "mevzuat", id),
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
  await deleteDoc(doc(db(), "mevzuat", item.id));
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
  await addDoc(collection(db(), "chat"), {
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
  const path = `chat/${id}-${file.name}`;
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
  await addDoc(collection(db(), "chat"), {
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
  const snap = await getDocs(collection(db(), "chat"));
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
  await updateDoc(doc(db(), "members", u.uid), stripUndefined(patch));
}

export async function setMemberRole(uidToSet: string, role: "ADMIN" | "STAFF") {
  await updateDoc(doc(db(), "members", uidToSet), { role });
}

export async function removeMember(uidToRemove: string) {
  await deleteDoc(doc(db(), "members", uidToRemove));
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
  await addDoc(collection(db(), "projects", projectId, "activities"), {
    ...stripUndefined(payload),
    ts: serverTimestamp(),
  });
  // Panel "Son İşlemler" için ofis geneli akış (hata olsa da ana akışı kesme)
  await addDoc(
    collection(db(), "activity"),
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
    const ref = doc(collection(db(), "notifications"));
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
  await updateDoc(doc(db(), "notifications", id), { read: true });
}

export async function markAllNotificationsRead() {
  const unread = state.notifications.filter((n) => !n.read);
  const batch = writeBatch(db());
  for (const n of unread) {
    batch.update(doc(db(), "notifications", n.id), { read: true });
  }
  if (unread.length) await batch.commit();
}

export async function loadActivities(projectId: string): Promise<Activity[]> {
  const snap = await getDocs(
    query(
      collection(db(), "projects", projectId, "activities"),
      orderBy("at", "desc")
    )
  );
  return snap.docs.map((d) => stripId<Activity>(d));
}

// ---- Kişiler ----

export async function addContact(data: Omit<Contact, "id" | "createdAt">) {
  const id = uid();
  await setDoc(
    doc(db(), "contacts", id),
    stripUndefined({ ...data, createdAt: now() })
  );
  return id;
}
export async function updateContact(
  id: string,
  data: Partial<Omit<Contact, "id" | "createdAt">>
) {
  await setDoc(doc(db(), "contacts", id), stripUndefined(data), {
    merge: true,
  });
}
export async function deleteContact(id: string) {
  await deleteDoc(doc(db(), "contacts", id));
}

// ---- Hizmet türleri ----

export async function addServiceType(name: string) {
  const id = uid();
  const order = state.serviceTypes.length;
  await setDoc(doc(db(), "serviceTypes", id), { name, order, stages: [] });
}
export async function deleteServiceType(id: string) {
  await deleteDoc(doc(db(), "serviceTypes", id));
}
export async function addStage(serviceTypeId: string, name: string) {
  const st = state.serviceTypes.find((s) => s.id === serviceTypeId);
  if (!st) return;
  await updateDoc(doc(db(), "serviceTypes", serviceTypeId), {
    stages: [...st.stages, { id: uid(), name }],
  });
}
export async function deleteStage(serviceTypeId: string, stageId: string) {
  const st = state.serviceTypes.find((s) => s.id === serviceTypeId);
  if (!st) return;
  await updateDoc(doc(db(), "serviceTypes", serviceTypeId), {
    stages: st.stages.filter((s) => s.id !== stageId),
  });
}

// ---- Şablonlar ----

export async function addDocTemplate(
  t: Omit<CustomTemplate, "id" | "createdAt">
) {
  const id = uid();
  await setDoc(
    doc(db(), "docTemplates", id),
    stripUndefined({ ...t, createdAt: now() })
  );
  return id;
}
export async function deleteDocTemplate(id: string) {
  await deleteDoc(doc(db(), "docTemplates", id));
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
  await setDoc(doc(db(), "projects", id), stripUndefined(project));
  await addActivity(id, "PROJE_OLUSTURULDU", `${who.name} projeyi oluşturdu`);
  return id;
}

// Projeyi kısmi günceller; opsiyonel aktivite ve bildirim yazar.
export async function patchProject(
  projectId: string,
  patch: Partial<Project>,
  activity?: { type: ActivityType; text: string; notify?: boolean }
) {
  await updateDoc(doc(db(), "projects", projectId), {
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
  await deleteDoc(doc(db(), "projects", projectId));
}
