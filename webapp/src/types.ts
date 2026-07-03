export type ProjectStatus = "DEVAM_EDIYOR" | "TAMAMLANDI" | "DURDURULDU";
export type DocumentKind = "DIJITAL" | "FIZIKSEL" | "IKISI_DE";
export type Priority = "DUSUK" | "ORTA" | "YUKSEK";
export type ContactRole = "MUSTERI" | "ARSA_SAHIBI" | "MUTEAHHIT";

export interface StageTemplate {
  id: string;
  name: string;
}

export interface ServiceType {
  id: string;
  name: string;
  stages: StageTemplate[];
}

export interface Contact {
  id: string;
  name: string;
  roles: ContactRole[];
  phone?: string;
  email?: string;
  address?: string;
  tcNo?: string;
  taxNo?: string;
  poaNo?: string;
  poaDate?: string;
  notaryName?: string;
  poaUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectService {
  id: string;
  serviceTypeId: string;
  status: ProjectStatus;
  targetDate?: string;
  completedStageIds: string[];
}

export interface ProjectDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  url?: string;
  physicalLocation?: string;
  projectServiceId?: string;
  createdAt: string;
}

export interface ProjectNote {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  landOwnerId?: string;
  contractorId?: string;
  province?: string;
  district?: string;
  neighborhood?: string;
  ada?: string;
  parsel?: string;
  pafta?: string;
  address?: string;
  notes?: string;
  status: ProjectStatus;
  priority?: Priority;
  services: ProjectService[];
  documents: ProjectDocument[];
  noteList?: ProjectNote[];
  memberIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type MemberRole = "ADMIN" | "STAFF";

export interface Member {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phone?: string;
  title?: string;
  role: MemberRole;
  mustChangePassword?: boolean;
  createdAt: string;
}

// Yönetici tarafından e-posta ile eklenen, henüz ilk girişini yapmamış
// çalışan. tempPassword ilk hesabı oluşturmak için kullanılır; ilk girişte
// çalışan kendi şifresini belirler.
export interface Invite {
  email: string;
  tempPassword: string;
  role: MemberRole;
  displayName?: string;
  createdAt: string;
}

export interface Office {
  name: string;
  ownerUid: string;
  inviteCode?: string;
  createdAt: string;
  // Ofis genelinde paylaşılan ayarlar (yalnızca yönetici düzenler).
  geminiKey?: string;
  geminiModel?: string;
  driveClientId?: string;
}

export type ActivityType =
  | "PROJE_OLUSTURULDU"
  | "PROJE_GUNCELLENDI"
  | "DURUM_DEGISTI"
  | "HIZMET_EKLENDI"
  | "HIZMET_KALDIRILDI"
  | "ASAMA_TAMAMLANDI"
  | "ASAMA_GERI_ALINDI"
  | "EVRAK_YUKLENDI"
  | "EVRAK_INDIRILDI"
  | "EVRAK_SILINDI"
  | "NOT_EKLENDI"
  | "GOREVLI_ATANDI";

export interface Activity {
  id: string;
  projectId: string;
  projectName?: string;
  type: ActivityType;
  text: string;
  byUid: string;
  byName: string;
  at: string;
}

// Dış paydaşlar: birlikte çalışılan mühendis, mimar, şantiye şefi, müteahhit.
export type ProfessionalRole =
  | "MUHENDIS"
  | "MIMAR"
  | "SANTIYE_SEFI"
  | "MUTEAHHIT"
  | "DIGER";

export interface Professional {
  id: string;
  name: string;
  role: ProfessionalRole;
  profession?: string; // ör. İnşaat Mühendisi, Elektrik Mühendisi
  company?: string;
  tcNo?: string;
  odaSicilNo?: string; // meslek odası sicil no
  buroTescilNo?: string; // büro tescil no
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export const PROFESSIONAL_ROLE_LABELS: Record<ProfessionalRole, string> = {
  MUHENDIS: "Mühendis",
  MIMAR: "Mimar",
  SANTIYE_SEFI: "Şantiye Şefi",
  MUTEAHHIT: "Müteahhit",
  DIGER: "Diğer",
};

export const PROFESSIONAL_ROLE_CHIP: Record<ProfessionalRole, string> = {
  MUHENDIS: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  MIMAR:
    "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  SANTIYE_SEFI:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  MUTEAHHIT:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  DIGER: "bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-slate-300",
};

// Mevzuat: yöneticinin yüklediği PDF mevzuat belgeleri (Firebase Storage'da).
export interface MevzuatDoc {
  id: string;
  title: string;
  category?: string;
  fileUrl: string;
  storagePath: string;
  createdAt: string;
  byName?: string;
}

// Sohbet mesajı (kalıcı değil; ofis üyeleri arası anlık yazışma).
export interface ChatMessage {
  id: string;
  fromUid: string;
  fromName: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileKind?: "image" | "pdf" | "file";
  storagePath?: string;
  at: string;
}

export interface AppNotification {
  id: string;
  forUid: string;
  projectId: string;
  projectName: string;
  text: string;
  byName: string;
  read: boolean;
  at: string;
}

export interface CustomTemplate {
  id: string;
  title: string;
  description?: string;
  body: string;
  createdAt: string;
}

export interface DB {
  version: 2;
  contacts: Contact[];
  serviceTypes: ServiceType[];
  projects: Project[];
  docTemplates: CustomTemplate[];
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DEVAM_EDIYOR: "Devam Ediyor",
  TAMAMLANDI: "Tamamlandı",
  DURDURULDU: "Durduruldu",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  DEVAM_EDIYOR: "bg-orange-50 text-orange-600 border-orange-200",
  TAMAMLANDI: "bg-blue-50 text-blue-700 border-blue-200",
  DURDURULDU: "bg-slate-100 text-slate-600 border-slate-200",
};

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  DIJITAL: "Dijital",
  FIZIKSEL: "Fiziksel",
  IKISI_DE: "Dijital + Fiziksel",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  DUSUK: "Düşük",
  ORTA: "Orta",
  YUKSEK: "Yüksek",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  DUSUK: "text-emerald-600 dark:text-emerald-400",
  ORTA: "text-amber-600 dark:text-amber-400",
  YUKSEK: "text-red-600 dark:text-red-400",
};

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  MUSTERI: "Müşteri / İş Sahibi",
  ARSA_SAHIBI: "Arsa Sahibi",
  MUTEAHHIT: "Müteahhit",
};

export const CONTACT_ROLE_CHIP: Record<ContactRole, string> = {
  MUSTERI:
    "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  ARSA_SAHIBI:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  MUTEAHHIT:
    "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: "Yönetici",
  STAFF: "Çalışan",
};

export const MAX_MEMBERS = 10;
