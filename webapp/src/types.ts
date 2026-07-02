export type ProjectStatus = "DEVAM_EDIYOR" | "TAMAMLANDI" | "DURDURULDU";
export type DocumentKind = "DIJITAL" | "FIZIKSEL" | "IKISI_DE";
export type Priority = "DUSUK" | "ORTA" | "YUKSEK";

export interface StageTemplate {
  id: string;
  name: string;
}

export interface ServiceType {
  id: string;
  name: string;
  stages: StageTemplate[];
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNo?: string;
  notes?: string;
  createdAt: string;
}

export interface LandOwner {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  tcNo?: string;
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

export interface Project {
  id: string;
  name: string;
  clientId: string;
  landOwnerId?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface DB {
  version: 1;
  clients: Client[];
  landOwners: LandOwner[];
  serviceTypes: ServiceType[];
  projects: Project[];
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DEVAM_EDIYOR: "Devam Ediyor",
  TAMAMLANDI: "Tamamlandı",
  DURDURULDU: "Durduruldu",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  DEVAM_EDIYOR: "bg-blue-50 text-blue-700 border-blue-200",
  TAMAMLANDI: "bg-green-50 text-green-700 border-green-200",
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
  DUSUK: "text-emerald-600",
  ORTA: "text-amber-600",
  YUKSEK: "text-red-600",
};
