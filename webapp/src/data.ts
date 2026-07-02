import { useSyncExternalStore } from "react";
import {
  signInWithPopup,
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
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
  writeBatch,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import type {
  Activity,
  ActivityType,
  AppNotification,
  Contact,
  CustomTemplate,
  Member,
  Office,
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
  contacts: Contact[];
  serviceTypes: ServiceType[];
  docTemplates: CustomTemplate[];
  projects: Project[];
  notifications: AppNotification[];
}

let state: AppState = {
  authReady: false,
  user: null,
  office: null,
  officeChecked: false,
  me: null,
  members: [],
  contacts: [],
  serviceTypes: [],
  docTemplates: [],
  projects: [],
  notifications: [],
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

async function startForMember(fbUser: FbUser) {
  clearDataSubs();

  const officeRef = doc(db(), "office", "main");
  const meRef = doc(db(), "members", fbUser.uid);

  dataUnsubs.push(
    onSnapshot(officeRef, (snap) => {
      set({
        office: snap.exists() ? (snap.data() as Office) : null,
        officeChecked: true,
      });
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
}

export function initAuth() {
  onAuthStateChanged(auth(), async (fbUser) => {
    if (!fbUser) {
      clearDataSubs();
      set({
        authReady: true,
        user: null,
        office: null,
        officeChecked: false,
        me: null,
        members: [],
        contacts: [],
        serviceTypes: [],
        docTemplates: [],
        projects: [],
        notifications: [],
      });
      return;
    }
    // Ofis var mı ve bu kullanıcı üye mi?
    const officeSnap = await getDoc(doc(db(), "office", "main"));
    set({
      user: fbUser,
      authReady: true,
      office: officeSnap.exists() ? (officeSnap.data() as Office) : null,
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

function randomInvite(): string {
  return Math.random().toString(36).slice(2, 10);
}

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
    inviteCode: randomInvite(),
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

export async function joinOffice(inviteCode: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const u = auth().currentUser;
  if (!u) return { ok: false, message: "Önce giriş yapın." };
  const officeSnap = await getDoc(doc(db(), "office", "main"));
  if (!officeSnap.exists()) {
    return { ok: false, message: "Bu ofis henüz kurulmamış." };
  }
  const office = officeSnap.data() as Office;
  if (office.inviteCode !== inviteCode.trim()) {
    return { ok: false, message: "Davet kodu geçersiz veya süresi dolmuş." };
  }
  const membersSnap = await getDocs(collection(db(), "members"));
  const already = membersSnap.docs.find((d) => d.id === u.uid);
  if (already) {
    set({ me: already.data() as Member });
    startForMember(u);
    return { ok: true, message: "Zaten üyesiniz." };
  }
  if (membersSnap.size >= MAX_MEMBERS) {
    return {
      ok: false,
      message: `Bu ofis en fazla ${MAX_MEMBERS} kullanıcıya sahip olabilir. Yönetici bir yer açmalı.`,
    };
  }
  const me: Member = {
    uid: u.uid,
    email: u.email ?? "",
    displayName: u.displayName ?? (u.email ?? "Çalışan"),
    photoURL: u.photoURL ?? undefined,
    role: "STAFF",
    createdAt: now(),
  };
  await setDoc(doc(db(), "members", u.uid), stripUndefined(me));
  set({ me });
  startForMember(u);
  return { ok: true, message: "Ofise katıldınız." };
}

export async function regenerateInvite() {
  await updateDoc(doc(db(), "office", "main"), { inviteCode: randomInvite() });
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
  await addDoc(collection(db(), "projects", projectId, "activities"), {
    projectId,
    type,
    text,
    byUid: who.uid,
    byName: who.name,
    at: now(),
    ts: serverTimestamp(),
  });
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
