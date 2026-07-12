// Şablon ([TOKEN]) doldurma için ortak alan hesaplama yardımcıları.
// Hem ekran içi düzenlenebilir şablonlar (TemplateEditor) hem de Word
// dosyasını XML seviyesinde dolduran Taahhütname akışı (Uzmanlar) aynı
// alan adlarını kullanır.
import type { Contact, Member, Professional, Project } from "./types";

export function buildProjectTokens(
  project: Project,
  contacts: Contact[]
): Record<string, string | undefined> {
  const client = contacts.find((c) => c.id === project.clientId);
  const owner = contacts.find((c) => c.id === project.landOwnerId);
  const contractor = contacts.find((c) => c.id === project.contractorId);

  return {
    "PROJE ADI": project.name,
    İL: project.province,
    İLÇE: project.district,
    MAHALLE: project.neighborhood,
    ADA: project.ada,
    PARSEL: project.parsel,
    PAFTA: project.pafta,
    BELEDİYE: project.district,
    "MÜŞTERİ ADI": client?.name,
    "MÜŞTERİ ADRESİ": client?.address,
    "MÜŞTERİ TELEFON": client?.phone,
    "ARSA SAHİBİ ADI": owner?.name,
    "ARSA SAHİBİ TC": owner?.tcNo,
    "ARSA SAHİBİ ADRESİ": owner?.address,
    "MÜTEAHHİT ADI": contractor?.name,
    "MÜTEAHHİT ADRESİ": contractor?.address,
    "MÜTEAHHİT TELEFON": contractor?.phone,
    "MÜTEAHHİT VERGİ NO": contractor?.taxNo,
    "BAŞVURAN ADI": owner?.name ?? client?.name,
    "BAŞVURAN TC": owner?.tcNo,
    "BAŞVURAN ADRESİ": owner?.address ?? client?.address,
    TELEFON: owner?.phone ?? client?.phone,
  };
}

export function buildVekilTokens(
  member: Member
): Record<string, string | undefined> {
  return {
    "VEKİL ADI": member.displayName,
    "VEKİL ÜNVAN": member.title,
    "VEKİL TELEFON": member.phone,
    "VEKİL E-POSTA": member.email,
    "İMZALAYAN ADI": member.displayName,
    İMZA: member.displayName,
  };
}

// Taahhütname belgelerinde kullanılan iki yaygın adlandırmayı (proje
// müellifi / fenni mesul) aynı uzman kaydından doldurur; şablonda hangisi
// kullanılmışsa o dolar, diğeri boş kalır.
export function buildProfessionalTokens(
  pro: Professional
): Record<string, string | undefined> {
  const fields: Record<string, string | undefined> = {
    ADI: pro.name,
    TC: pro.tcNo,
    MESLEK: pro.profession,
    FİRMA: pro.company,
    "ODA SİCİL NO": pro.odaSicilNo,
    "BÜRO TESCİL NO": pro.buroTescilNo,
    TELEFON: pro.phone,
    "E-POSTA": pro.email,
    ADRESİ: pro.address,
  };
  const tokens: Record<string, string | undefined> = {};
  for (const [suffix, value] of Object.entries(fields)) {
    tokens[`MÜELLİF ${suffix}`] = value;
    tokens[`FENNİ MESUL ${suffix}`] = value;
  }
  return tokens;
}
