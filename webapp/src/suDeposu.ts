// Su deposu hesapları — yağmur suyu, kullanım suyu ve yangın suyu.
//
// Hesap motoru arayüzden ayrı tutulur ki tarayıcıda bağımsız test
// edilebilsin (bkz. dilekce.ts ile aynı yaklaşım).
//
// TASARIM KARARI: Katsayıların hiçbiri gizli sabit değildir. Her değer
// arayüzde görünür, düzenlenebilir ve dayandığı kaynak etiketiyle birlikte
// sunulur; her hesap da adım adım döndürülür. Ruhsat eki olacak bir hesabın
// müellif tarafından denetlenebilir olması gerekir.

export interface Adim {
  etiket: string;
  ifade: string;
  sonuc: string;
}

function m3(litre: number): number {
  return Math.round((litre / 1000) * 100) / 100;
}

function say(n: number, basamak = 2): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: basamak,
  });
}

/* ------------------------------------------------------------------ *
 * 1) YAĞMUR SUYU DEPOSU
 *
 * Dayanak: Yağmur Sularının Toplanması, Depolanması ve Deşarjı Hakkında
 * Yönetmelik (RG 23.06.2017 / 30105) ve TS EN 16941-1.
 *
 *   Yıllık toplanabilir yağmur suyu:  Y = A × h × e × η   (litre/yıl)
 *   Asgari depo hacmi:                V = Y × 0,06        (yıllık %6)
 *
 * A: çatı izdüşüm alanı (m²) · h: yıllık yağış (mm) · e: akış katsayısı
 * η: filtre verimi.  (1 mm yağış × 1 m² = 1 litre)
 * ------------------------------------------------------------------ */

export const CATI_TIPLERI = [
  { id: "egimli", ad: "Eğimli sert çatı (kiremit, metal)", e: 0.9 },
  { id: "duz", ad: "Düz çatı (beton, çakıl kaplı)", e: 0.8 },
  { id: "yesil", ad: "Yeşil çatı (ekstansif)", e: 0.4 },
  { id: "sert-zemin", ad: "Sert zemin (beton, asfalt)", e: 0.85 },
] as const;

// Yönetmeliğin asgari depo hacmi oranı: yıllık toplanabilir suyun %6'sı.
export const YAGMUR_DEPO_ORANI = 0.06;
// Zorunluluk eşikleri (Planlı Alanlar İmar Yönetmeliği'ne atıfla).
export const YAGMUR_ESIK_PARSEL_M2 = 2000;
export const YAGMUR_ESIK_CATI_M2 = 1000;
export const YAGMUR_ESIK_HACIM_M3 = 7;

export interface YagmurGirdi {
  catiAlani: number;
  yillikYagis: number;
  akisKatsayisi: number;
  filtreVerimi: number;
  parselAlani: number;
  depoOrani: number;
}

export interface YagmurSonuc {
  yillikLitre: number;
  yillikM3: number;
  depoM3: number;
  zorunlu: boolean;
  adimlar: Adim[];
}

export function hesaplaYagmurSuyu(g: YagmurGirdi): YagmurSonuc {
  const yillikLitre = g.catiAlani * g.yillikYagis * g.akisKatsayisi * g.filtreVerimi;
  const depoLitre = yillikLitre * g.depoOrani;
  const depoM3 = m3(depoLitre);

  // Yönetmelik eşiği: depolama ihtiyacı 7 m³'ü aşıyor VE parsel 2000 m²'yi
  // ya da çatı izdüşümü 1000 m²'yi geçiyorsa sistem zorunlu hale gelir.
  const zorunlu =
    depoM3 > YAGMUR_ESIK_HACIM_M3 &&
    (g.parselAlani > YAGMUR_ESIK_PARSEL_M2 ||
      g.catiAlani > YAGMUR_ESIK_CATI_M2);

  return {
    yillikLitre,
    yillikM3: m3(yillikLitre),
    depoM3,
    zorunlu,
    adimlar: [
      {
        etiket: "Yıllık toplanabilir yağmur suyu",
        ifade: `${say(g.catiAlani)} m² × ${say(g.yillikYagis)} mm × ${g.akisKatsayisi} × ${g.filtreVerimi}`,
        sonuc: `${say(yillikLitre, 0)} L/yıl  (${say(m3(yillikLitre))} m³/yıl)`,
      },
      {
        etiket: `Asgari depo hacmi (yıllık miktarın %${say(g.depoOrani * 100)}'sı)`,
        ifade: `${say(yillikLitre, 0)} L × ${g.depoOrani}`,
        sonuc: `${say(depoLitre, 0)} L  =  ${say(depoM3)} m³`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * 2) KULLANIM SUYU DEPOSU
 *
 * Dayanak: Ulusal tek bir yönetmelik yoktur. Kişi başı tüketim değerleri
 * ilgili su ve kanalizasyon idaresinin (İSKİ, ASKİ, MUSKİ vb.) esaslarına
 * ve TS 1258 / TS EN 806 serisine göre belirlenir. Bu yüzden değerler ön
 * tanımlı değil, seçilebilir ve düzenlenebilir biçimde sunulur.
 *
 *   Q = N × q                       (litre/gün)
 *   V = Q × gün × (1 + pay)         (litre)
 * ------------------------------------------------------------------ */

export const TUKETIM_ON_TANIMLARI = [
  { id: "konut-kuvet", ad: "Konut — küvetli", deger: 100, kaynak: "TS 1258" },
  { id: "konut-dus", ad: "Konut — duşlu", deger: 80, kaynak: "TS 1258" },
  { id: "konut-banyosuz", ad: "Konut — banyosuz", deger: 60, kaynak: "TS 1258" },
  { id: "konut-pratik", ad: "Konut — yaygın uygulama", deger: 150, kaynak: "Yaygın mühendislik pratiği" },
  { id: "ofis", ad: "Ofis / büro", deger: 50, kaynak: "Yaygın pratik (40–60 L)" },
] as const;

export interface KullanimGirdi {
  bagimsizBolum: number;
  kisiBasinaDaire: number;
  kisiBasiTuketim: number;
  depolamaGunu: number;
  guvenlikPayi: number;
}

export interface KullanimSonuc {
  kisiSayisi: number;
  gunlukLitre: number;
  depoM3: number;
  adimlar: Adim[];
}

export function hesaplaKullanimSuyu(g: KullanimGirdi): KullanimSonuc {
  const kisiSayisi = g.bagimsizBolum * g.kisiBasinaDaire;
  const gunlukLitre = kisiSayisi * g.kisiBasiTuketim;
  const hamLitre = gunlukLitre * g.depolamaGunu;
  const depoLitre = hamLitre * (1 + g.guvenlikPayi);

  return {
    kisiSayisi,
    gunlukLitre,
    depoM3: m3(depoLitre),
    adimlar: [
      {
        etiket: "Kullanıcı sayısı",
        ifade: `${say(g.bagimsizBolum, 0)} bağımsız bölüm × ${say(g.kisiBasinaDaire)} kişi`,
        sonuc: `${say(kisiSayisi, 0)} kişi`,
      },
      {
        etiket: "Günlük su ihtiyacı",
        ifade: `${say(kisiSayisi, 0)} kişi × ${say(g.kisiBasiTuketim)} L/kişi·gün`,
        sonuc: `${say(gunlukLitre, 0)} L/gün  (${say(m3(gunlukLitre))} m³/gün)`,
      },
      {
        etiket: `Depo hacmi (${say(g.depolamaGunu)} günlük, %${say(g.guvenlikPayi * 100)} güvenlik payı)`,
        ifade: `${say(gunlukLitre, 0)} L × ${say(g.depolamaGunu)} × ${say(1 + g.guvenlikPayi)}`,
        sonuc: `${say(depoLitre, 0)} L  =  ${say(m3(depoLitre))} m³`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * 3) YANGIN SUYU DEPOSU
 *
 * Dayanak: Binaların Yangından Korunması Hakkında Yönetmelik (BKK
 * 2007/12937, RG 19.12.2007 / 26735) Madde 92 ve Ek-8.
 *
 *   Madde 92/3 — Depo hacmi, bina tehlike sınıfına göre düşük 30 dk,
 *   orta 60 dk, yüksek 90 dk debiyi karşılayacak şekilde bulunur.
 *   Madde 92/5 — Ön hesap: Ek-8/B yağmurlama debisi + Ek-8/C yangın
 *   dolabı debisi + (varsa) hidrant debisi, süreyle çarpılır.
 *   Madde 92 — Hidrolik hesap yapılırsa onun sonucu esas alınır.
 *
 *   q_sprinkler = tasarım yoğunluğu (mm/dk) × etki alanı (m²)   → L/dk
 *   V = (q_sprinkler + q_dolap + q_hidrant) × süre              → litre
 * ------------------------------------------------------------------ */

export interface TehlikeSinifi {
  id: string;
  ad: string;
  sureDk: number;
  dolapLdk: number;
  hidrantLdk: number;
  yogunluk: number; // mm/dk
  etkiAlani: number; // m²
}

// Süreler ve dolap/hidrant debileri BYKHY Madde 92 + Ek-8/C'den;
// yağmurlama tasarım yoğunluğu ve etki alanları Ek-8/B ile aynı değerleri
// veren TS EN 12845 tablosundan.
export const TEHLIKE_SINIFLARI: TehlikeSinifi[] = [
  { id: "LH", ad: "Düşük tehlike (LH)", sureDk: 30, dolapLdk: 100, hidrantLdk: 400, yogunluk: 2.25, etkiAlani: 84 },
  { id: "OH1", ad: "Orta tehlike 1 (OH1)", sureDk: 60, dolapLdk: 100, hidrantLdk: 400, yogunluk: 5, etkiAlani: 72 },
  { id: "OH2", ad: "Orta tehlike 2 (OH2)", sureDk: 60, dolapLdk: 100, hidrantLdk: 1000, yogunluk: 5, etkiAlani: 144 },
  { id: "OH3", ad: "Orta tehlike 3 (OH3)", sureDk: 60, dolapLdk: 100, hidrantLdk: 1000, yogunluk: 5, etkiAlani: 216 },
  { id: "OH4", ad: "Orta tehlike 4 (OH4)", sureDk: 60, dolapLdk: 100, hidrantLdk: 1000, yogunluk: 5, etkiAlani: 360 },
  { id: "HHP1", ad: "Yüksek tehlike 1 (HHP1)", sureDk: 90, dolapLdk: 200, hidrantLdk: 1500, yogunluk: 7.5, etkiAlani: 260 },
  { id: "HHP2", ad: "Yüksek tehlike 2 (HHP2)", sureDk: 90, dolapLdk: 200, hidrantLdk: 1500, yogunluk: 10, etkiAlani: 260 },
  { id: "HHP3", ad: "Yüksek tehlike 3 (HHP3)", sureDk: 90, dolapLdk: 200, hidrantLdk: 1500, yogunluk: 12.5, etkiAlani: 260 },
];

// Madde 92 — yalnızca çevre hidrant sistemi bulunan yapılar için özel kural.
export const SADECE_CEVRE_HIDRANT = { debiLdk: 1900, sureDk: 90 };

export interface YanginGirdi {
  sinifId: string;
  sprinklerVar: boolean;
  dolapVar: boolean;
  hidrantVar: boolean;
  yogunluk: number;
  etkiAlani: number;
  dolapLdk: number;
  hidrantLdk: number;
  sureDk: number;
}

export interface YanginSonuc {
  sprinklerLdk: number;
  toplamLdk: number;
  depoM3: number;
  adimlar: Adim[];
  uyari: string | null;
}

export function hesaplaYanginSuyu(g: YanginGirdi): YanginSonuc {
  const sprinklerLdk = g.sprinklerVar ? g.yogunluk * g.etkiAlani : 0;
  const dolapLdk = g.dolapVar ? g.dolapLdk : 0;
  const hidrantLdk = g.hidrantVar ? g.hidrantLdk : 0;
  const toplamLdk = sprinklerLdk + dolapLdk + hidrantLdk;
  const depoLitre = toplamLdk * g.sureDk;

  const adimlar: Adim[] = [];
  if (g.sprinklerVar) {
    adimlar.push({
      etiket: "Yağmurlama (sprinkler) debisi — Ek-8/B",
      ifade: `${say(g.yogunluk)} mm/dk × ${say(g.etkiAlani)} m²`,
      sonuc: `${say(sprinklerLdk, 0)} L/dk`,
    });
  }
  if (g.dolapVar) {
    adimlar.push({
      etiket: "Yangın dolabı debisi — Ek-8/C",
      ifade: `${say(dolapLdk, 0)} L/dk`,
      sonuc: `${say(dolapLdk, 0)} L/dk`,
    });
  }
  if (g.hidrantVar) {
    adimlar.push({
      etiket: "Hidrant debisi — Ek-8/C",
      ifade: `${say(hidrantLdk, 0)} L/dk`,
      sonuc: `${say(hidrantLdk, 0)} L/dk`,
    });
  }
  adimlar.push({
    etiket: "Toplam tasarım debisi",
    ifade: [
      g.sprinklerVar ? say(sprinklerLdk, 0) : null,
      g.dolapVar ? say(dolapLdk, 0) : null,
      g.hidrantVar ? say(hidrantLdk, 0) : null,
    ]
      .filter(Boolean)
      .join(" + "),
    sonuc: `${say(toplamLdk, 0)} L/dk`,
  });
  adimlar.push({
    etiket: `Depo hacmi (Madde 92 — ${say(g.sureDk, 0)} dakika)`,
    ifade: `${say(toplamLdk, 0)} L/dk × ${say(g.sureDk, 0)} dk`,
    sonuc: `${say(depoLitre, 0)} L  =  ${say(m3(depoLitre))} m³`,
  });

  let uyari: string | null = null;
  if (!g.sprinklerVar && !g.dolapVar && !g.hidrantVar) {
    uyari = "En az bir sulu söndürme sistemi seçin.";
  } else if (!g.sprinklerVar && !g.dolapVar && g.hidrantVar) {
    // Madde 92: yapıda sadece çevre hidrant sistemi varsa en az 1900 L/dk
    // debiyi 90 dakika karşılayacak kapasite aranır.
    const ozelM3 = m3(SADECE_CEVRE_HIDRANT.debiLdk * SADECE_CEVRE_HIDRANT.sureDk);
    uyari =
      `Yapıda yalnızca çevre hidrant sistemi varsa Madde 92 en az ` +
      `${SADECE_CEVRE_HIDRANT.debiLdk} L/dk debiyi ${SADECE_CEVRE_HIDRANT.sureDk} dk ` +
      `karşılayacak kapasite arar (${say(ozelM3)} m³). Bu durumda büyük olan hacim esas alınır.`;
  }

  return { sprinklerLdk, toplamLdk, depoM3: m3(depoLitre), adimlar, uyari };
}
