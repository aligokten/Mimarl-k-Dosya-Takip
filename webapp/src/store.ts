import { useSyncExternalStore } from "react";
import type { Contact, DB } from "./types";

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
    version: 2,
    contacts: [],
    projects: [],
    docTemplates: [],
    serviceTypes: DEFAULT_SERVICES.map((s) => ({
      id: uid(),
      name: s.name,
      stages: s.stages.map((name) => ({ id: uid(), name })),
    })),
  };
}

// v1 (ayrı müşteri + arsa sahibi listeleri) → v2 (rollü tek kişi listesi).
// Aynı isimli müşteri ve arsa sahibi tek kişide birleştirilir; proje
// referansları korunur/güncellenir.
/* eslint-disable @typescript-eslint/no-explicit-any */
function migrateV1(old: any): DB {
  const contacts: Contact[] = [];
  const idRemap = new Map<string, string>();

  for (const client of old.clients ?? []) {
    contacts.push({
      id: client.id,
      name: client.name,
      roles: ["MUSTERI"],
      phone: client.phone,
      email: client.email,
      address: client.address,
      taxNo: client.taxNo,
      notes: client.notes,
      createdAt: client.createdAt ?? now(),
    });
  }

  for (const owner of old.landOwners ?? []) {
    const existing = contacts.find(
      (c) =>
        c.name.trim().toLocaleLowerCase("tr") ===
        String(owner.name ?? "").trim().toLocaleLowerCase("tr")
    );
    if (existing) {
      idRemap.set(owner.id, existing.id);
      if (!existing.roles.includes("ARSA_SAHIBI")) {
        existing.roles.push("ARSA_SAHIBI");
      }
      existing.phone = existing.phone ?? owner.phone;
      existing.email = existing.email ?? owner.email;
      existing.address = existing.address ?? owner.address;
      existing.tcNo = existing.tcNo ?? owner.tcNo;
      existing.poaNo = owner.poaNo;
      existing.poaDate = owner.poaDate;
      existing.notaryName = owner.notaryName;
      existing.poaUrl = owner.poaUrl;
      if (owner.notes) {
        existing.notes = existing.notes
          ? `${existing.notes}\n${owner.notes}`
          : owner.notes;
      }
    } else {
      contacts.push({
        id: owner.id,
        name: owner.name,
        roles: ["ARSA_SAHIBI"],
        phone: owner.phone,
        email: owner.email,
        address: owner.address,
        tcNo: owner.tcNo,
        poaNo: owner.poaNo,
        poaDate: owner.poaDate,
        notaryName: owner.notaryName,
        poaUrl: owner.poaUrl,
        notes: owner.notes,
        createdAt: owner.createdAt ?? now(),
      });
    }
  }

  const projects = (old.projects ?? []).map((p: any) => ({
    ...p,
    landOwnerId: p.landOwnerId
      ? (idRemap.get(p.landOwnerId) ?? p.landOwnerId)
      : undefined,
  }));

  return {
    version: 2,
    contacts,
    projects,
    serviceTypes: old.serviceTypes ?? [],
    docTemplates: [],
  };
}

function normalize(parsed: any): DB | null {
  if (!parsed) return null;
  if (parsed.version === 1) return migrateV1(parsed);
  if (parsed.version === 2) {
    return {
      ...parsed,
      contacts: parsed.contacts ?? [],
      projects: parsed.projects ?? [],
      serviceTypes: parsed.serviceTypes ?? [],
      docTemplates: parsed.docTemplates ?? [],
    } as DB;
  }
  return null;
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const migrated = normalize(JSON.parse(raw));
      if (migrated) {
        localStorage.setItem(KEY, JSON.stringify(migrated));
        return migrated;
      }
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
    const parsed = JSON.parse(text);
    if (
      !parsed ||
      !Array.isArray(parsed.projects) ||
      !Array.isArray(parsed.serviceTypes)
    ) {
      return { ok: false, message: "Geçersiz yedek dosyası." };
    }
    const migrated = normalize(parsed);
    if (!migrated) {
      return { ok: false, message: "Yedek dosyası sürümü tanınamadı." };
    }
    db = migrated;
    persistAndEmit();
    return { ok: true, message: "Yedek geri yüklendi." };
  } catch {
    return { ok: false, message: "Dosya okunamadı (geçerli bir JSON değil)." };
  }
}
