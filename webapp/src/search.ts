// Panel geneli arama — proje, kişi, uzman ve şablonlarda tek kutudan arama.
//
// Arayüzden ayrı tutulur ki tarayıcıda bağımsız test edilebilsin.
//
// Türkçe notu: eşleştirme önce tr-TR kurallarıyla küçültülür, sonra aksanlı
// harfler sade karşılıklarına katlanır. Böylece "cesme" → "Çeşme",
// "ISTANBUL" → "İstanbul", "gumusluk" → "Gümüşlük" bulunur; klavyede Türkçe
// karakter kullanmadan arayanlar sonuçsuz kalmaz.

export type SonucTuru = "proje" | "kisi" | "uzman" | "sablon";

export interface AramaSonucu {
  tur: SonucTuru;
  id: string;
  baslik: string;
  altBaslik?: string;
  to: string;
  skor: number;
}

export const TUR_ETIKETLERI: Record<SonucTuru, string> = {
  proje: "Projeler",
  kisi: "Kişiler",
  uzman: "Uzmanlar",
  sablon: "Şablonlar",
};

const KATLAMA: Record<string, string> = {
  ı: "i",
  ş: "s",
  ğ: "g",
  ü: "u",
  ö: "o",
  ç: "c",
  â: "a",
  î: "i",
  û: "u",
};

// Eksik/bozuk kayıtlar (adı girilmemiş bir kişi gibi) aramayı çökertmesin.
export function norm(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[ışğüöçâîû]/g, (c) => KATLAMA[c] ?? c);
}

// Bir kaydı puanlar: başlıkta baştan eşleşme en yüksek, kelime başı orta,
// içinde geçmesi düşük, ikincil alanlar (telefon, ada/parsel vb.) en düşük.
// Terimlerin hepsi eşleşmek zorundadır (VE mantığı).
function puanla(
  terimler: string[],
  baslik: string | undefined,
  ikincil: (string | undefined)[]
): number {
  const b = norm(baslik);
  if (!b) return 0;
  const yedek = norm(ikincil.filter(Boolean).join(" "));
  let toplam = 0;

  for (const terim of terimler) {
    if (b.startsWith(terim)) {
      toplam += 100;
      continue;
    }
    if (new RegExp(`(^|\\s)${terim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(b)) {
      toplam += 60;
      continue;
    }
    if (b.includes(terim)) {
      toplam += 35;
      continue;
    }
    if (yedek.includes(terim)) {
      toplam += 12;
      continue;
    }
    return 0; // bu terim hiçbir alanda yok → kayıt elenir
  }
  return toplam;
}

export interface AranabilirVeri {
  projects: {
    id: string;
    name: string;
    province?: string;
    district?: string;
    neighborhood?: string;
    ada?: string;
    parsel?: string;
    pafta?: string;
    address?: string;
  }[];
  contacts: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    tcNo?: string;
    address?: string;
  }[];
  professionals: {
    id: string;
    name: string;
    profession?: string;
    company?: string;
    odaSicilNo?: string;
    phone?: string;
  }[];
  docTemplates: { id: string; title: string; description?: string }[];
}

export function ara(
  db: AranabilirVeri,
  sorgu: string,
  limit = 8
): AramaSonucu[] {
  const terimler = norm(sorgu)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terimler.length === 0) return [];

  const sonuclar: AramaSonucu[] = [];

  for (const p of db.projects) {
    const skor = puanla(terimler, p.name, [
      p.province,
      p.district,
      p.neighborhood,
      p.ada,
      p.parsel,
      p.pafta,
      p.address,
    ]);
    if (skor === 0) continue;
    const yer = [p.district, p.neighborhood].filter(Boolean).join(" · ");
    const imar =
      p.ada || p.parsel
        ? `${p.ada ? `Ada ${p.ada}` : ""}${p.ada && p.parsel ? "/" : ""}${
            p.parsel ? `Parsel ${p.parsel}` : ""
          }`
        : "";
    sonuclar.push({
      tur: "proje",
      id: p.id,
      baslik: p.name,
      altBaslik: [yer, imar].filter(Boolean).join(" · ") || undefined,
      to: `/projeler/${p.id}`,
      skor,
    });
  }

  for (const c of db.contacts) {
    const skor = puanla(terimler, c.name, [
      c.phone,
      c.email,
      c.tcNo,
      c.address,
    ]);
    if (skor === 0) continue;
    sonuclar.push({
      tur: "kisi",
      id: c.id,
      baslik: c.name,
      altBaslik: c.phone ?? c.email ?? c.address,
      to: `/kisiler/${c.id}`,
      skor,
    });
  }

  for (const u of db.professionals) {
    const skor = puanla(terimler, u.name, [
      u.profession,
      u.company,
      u.odaSicilNo,
      u.phone,
    ]);
    if (skor === 0) continue;
    sonuclar.push({
      tur: "uzman",
      id: u.id,
      baslik: u.name,
      altBaslik: [u.profession, u.company].filter(Boolean).join(" · ") || undefined,
      // Uzmanlar sayfasında ayrı detay rotası yok; listeye gidilir.
      to: "/uzmanlar",
      skor,
    });
  }

  for (const t of db.docTemplates) {
    const skor = puanla(terimler, t.title, [t.description]);
    if (skor === 0) continue;
    sonuclar.push({
      tur: "sablon",
      id: t.id,
      baslik: t.title,
      altBaslik: t.description,
      to: `/sablonlar/${t.id}`,
      skor,
    });
  }

  return sonuclar
    .sort((a, b) => b.skor - a.skor || a.baslik.localeCompare(b.baslik, "tr"))
    .slice(0, limit);
}
