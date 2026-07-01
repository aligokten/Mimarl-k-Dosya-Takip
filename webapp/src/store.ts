import { useSyncExternalStore } from "react";
import type { DB } from "./types";

const KEY = "mimarlik-dosya-takip-db-v1";

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
    stages: [
      "Saha Ölçümü",
      "Rapor Hazırlığı",
      "Kontrol / Onay",
      "İlgili Kuruma Teslim",
    ],
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
  {
    name: "Zemin Etüdü",
    stages: ["Saha Çalışması", "Laboratuvar", "Rapor Teslimi"],
  },
];

export function uid(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

function seedDb(): DB {
  return {
    version: 1,
    clients: [],
    landOwners: [],
    projects: [],
    serviceTypes: DEFAULT_SERVICES.map((s) => ({
      id: uid(),
      name: s.name,
      stages: s.stages.map((name) => ({ id: uid(), name })),
    })),
  };
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.version === 1) return parsed;
    }
  } catch {
    // bozuk kayıt — sıfırdan başla
  }
  const db = seedDb();
  localStorage.setItem(KEY, JSON.stringify(db));
  return db;
}

let db: DB = load();
const listeners = new Set<() => void>();

function persistAndEmit() {
  localStorage.setItem(KEY, JSON.stringify(db));
  listeners.forEach((l) => l());
}

export function getDb(): DB {
  return db;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function mutate(fn: (draft: DB) => void) {
  const draft = structuredClone(db);
  fn(draft);
  db = draft;
  persistAndEmit();
}

export function useDb(): DB {
  return useSyncExternalStore(subscribe, getDb);
}

export function exportBackup() {
  const blob = new Blob([JSON.stringify(db, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dosya-takip-yedek-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(text: string): { ok: boolean; message: string } {
  try {
    const parsed = JSON.parse(text) as DB;
    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.projects) ||
      !Array.isArray(parsed.clients) ||
      !Array.isArray(parsed.serviceTypes)
    ) {
      return { ok: false, message: "Geçersiz yedek dosyası." };
    }
    db = parsed;
    persistAndEmit();
    return { ok: true, message: "Yedek geri yüklendi." };
  } catch {
    return { ok: false, message: "Dosya okunamadı (geçerli bir JSON değil)." };
  }
}
