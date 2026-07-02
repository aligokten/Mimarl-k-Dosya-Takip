// Mimarlık/imar süreçlerinde en sık başvurulan Türkiye mevzuatı.
// Bu liste hem Mevzuat sekmesinde gösterilir hem de AI Asistan'a bağlam
// (grounding) olarak verilir. Özetler bilgilendirme amaçlıdır; bağlayıcı
// metin daima resmi kaynaktır (mevzuat.gov.tr / Resmî Gazete).

export type MevzuatKind = "Kanun" | "Yönetmelik";

export interface MevzuatItem {
  id: string;
  title: string;
  kind: MevzuatKind;
  summary: string;
  keyPoints: string[];
  url: string;
}

export interface MevzuatGroup {
  group: string;
  items: MevzuatItem[];
}

export const MEVZUAT: MevzuatGroup[] = [
  {
    group: "İmar ve Planlama",
    items: [
      {
        id: "imar-kanunu-3194",
        title: "İmar Kanunu (3194 sayılı)",
        kind: "Kanun",
        summary:
          "Yerleşme yerleri ile bu yerlerdeki yapılaşmanın; plan, fen, sağlık ve çevre şartlarına uygun oluşmasını düzenleyen temel kanun. Ruhsat, plan kademeleri ve yapı denetiminin çerçevesini çizer.",
        keyPoints: [
          "Yapı ruhsatı alınması zorunludur (madde 21); ruhsatsız/ruhsata aykırı yapılar için yıkım ve para cezası (madde 32, 42).",
          "Yapı kullanma izni (iskan) alınmadan yapı kullanılamaz (madde 30).",
          "Planlar: nazım imar planı ve uygulama imar planı kademeleri (madde 5–8).",
          "Arsa ve arazi düzenlemesi, düzenleme ortaklık payı (DOP) azami %45 (madde 18).",
          "Kamuya terk, yola cephe, ifraz-tevhit şartları belediyece plan ve yönetmeliğe göre denetlenir.",
        ],
        url: "https://www.mevzuat.gov.tr/mevzuatmetin/1.5.3194.pdf",
      },
      {
        id: "planli-alanlar-imar-yonetmeligi",
        title: "Planlı Alanlar İmar Yönetmeliği",
        kind: "Yönetmelik",
        summary:
          "İmar planı bulunan alanlarda yapılaşmaya ilişkin genel esasları; ruhsat, yapı ölçüleri, çekme mesafeleri, kat yükseklikleri, ortak alanlar ve tanımları belirleyen ana yönetmelik.",
        keyPoints: [
          "TAKS (Taban Alanı Katsayısı) ve KAKS/Emsal (Kat Alanı Katsayısı) tanımları ve hesabı.",
          "Bina cephe/komşu/arka bahçe çekme mesafeleri ve parsel büyüklükleri.",
          "Kat yükseklikleri, çıkma (balkon/kapalı çıkma) kuralları, saçak ve kot alınması.",
          "Ortak alanlar, sığınak, otopark, asansör ve merdiven şartlarına atıf.",
          "Ruhsat eki projeler (mimari, statik, mekanik, elektrik) ve müellif sorumluluğu.",
        ],
        url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=21472&MevzuatTur=7&MevzuatTertip=5",
      },
      {
        id: "otopark-yonetmeligi",
        title: "Otopark Yönetmeliği",
        kind: "Yönetmelik",
        summary:
          "Yapıların kullanım türüne göre asgari otopark sayısını ve otopark yerinin düzenlenmesini belirler.",
        keyPoints: [
          "Bağımsız bölüm/kullanım türüne göre asgari araç park yeri sayısı.",
          "Bina içi/parsel içi otopark zorunluluğu ve bölgesel otopark uygulamaları.",
          "Engelli otoparkı ve manevra/rampa ölçü şartları.",
        ],
        url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=32294&MevzuatTur=7&MevzuatTertip=5",
      },
    ],
  },
  {
    group: "Yapı Güvenliği (Deprem, Yangın, Sığınak)",
    items: [
      {
        id: "tbdy-2018-deprem",
        title: "Türkiye Bina Deprem Yönetmeliği (TBDY 2018)",
        kind: "Yönetmelik",
        summary:
          "Deprem etkisi altında binaların tasarımı ve güçlendirilmesine ilişkin kuralları içerir. 1 Ocak 2019'da yürürlüğe girmiştir.",
        keyPoints: [
          "Deprem yer hareketi düzeyleri (DD-1, DD-2, DD-3, DD-4) ve tasarım spektrumu.",
          "Bina kullanım/önem sınıfları ve düzensizlik durumları.",
          "Betonarme/çelik/yığma binalar için tasarım ve performans esasları.",
          "Zemin etüdü ve yerel zemin sınıfları ile bütünlük (harita.tdth.afad.gov.tr).",
        ],
        url: "https://www.resmigazete.gov.tr/eskiler/2018/03/20180318M1-2.htm",
      },
      {
        id: "yangin-yonetmeligi",
        title: "Binaların Yangından Korunması Hakkında Yönetmelik",
        kind: "Yönetmelik",
        summary:
          "Her türlü yapı, bina, tesis ve işletmenin yangına karşı korunmasında uyulacak tasarım ve önlem esaslarını belirler.",
        keyPoints: [
          "Kaçış yolları, kaçış mesafeleri, merdiven genişlikleri ve yangın güvenlik holü.",
          "Yangın kompartımanları, yangın dayanımı süreleri ve malzeme sınıfları.",
          "Bina yüksekliğine göre yangın algılama, söndürme ve duman tahliye sistemleri.",
          "Yapı ruhsatı ve iskan aşamasında yangın önlemlerinin aranması.",
        ],
        url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=12937&MevzuatTur=21&MevzuatTertip=5",
      },
      {
        id: "siginak-yonetmeligi",
        title: "Sığınak Yönetmeliği",
        kind: "Yönetmelik",
        summary:
          "Hangi yapılarda sığınak ayrılacağını, sığınak tür ve ölçülerini düzenler.",
        keyPoints: [
          "Bağımsız bölüm sayısı/alanına göre serpinti sığınağı zorunluluğu.",
          "Sığınak asgari alanı, tavan yüksekliği ve havalandırma şartları.",
          "Sığınakların barış zamanında ortak alan olarak kullanımı.",
        ],
        url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=8973&MevzuatTur=7&MevzuatTertip=5",
      },
    ],
  },
  {
    group: "Yapı Denetim, Enerji ve Dönüşüm",
    items: [
      {
        id: "yapi-denetimi-4708",
        title: "Yapı Denetimi Hakkında Kanun (4708 sayılı)",
        kind: "Kanun",
        summary:
          "Can ve mal güvenliğini sağlamak üzere yapı denetim kuruluşları eliyle yapı denetimini düzenler.",
        keyPoints: [
          "Yapı denetim kuruluşunun görev ve sorumlulukları; denetçi mimar/mühendisler.",
          "Yapı sahibi, müteahhit ve şantiye şefi sorumlulukları.",
          "Seviye tespit tutanakları ve hakediş esaslı denetim ödemeleri.",
        ],
        url: "https://www.mevzuat.gov.tr/mevzuatmetin/1.5.4708.pdf",
      },
      {
        id: "bep-enerji-yonetmeligi",
        title: "Binalarda Enerji Performansı Yönetmeliği (BEP)",
        kind: "Yönetmelik",
        summary:
          "Binalarda enerjinin verimli kullanımını ve Enerji Kimlik Belgesi (EKB) esaslarını düzenler.",
        keyPoints: [
          "Enerji Kimlik Belgesi (EKB) düzenlenmesi zorunluluğu.",
          "Yalıtım, ısıtma-soğutma ve aydınlatmada asgari performans.",
          "Yenilenebilir enerji ve merkezi sistem şartlarına atıf.",
        ],
        url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=13594&MevzuatTur=7&MevzuatTertip=5",
      },
      {
        id: "kentsel-donusum-6306",
        title: "Afet Riski Altındaki Alanların Dönüştürülmesi Kanunu (6306)",
        kind: "Kanun",
        summary:
          "Riskli yapı ve riskli alanların tespiti ile kentsel dönüşüm süreçlerini düzenler.",
        keyPoints: [
          "Riskli yapı tespiti ve itiraz süreci.",
          "Malik çoğunluğu (salt çoğunluk) ile karar ve uygulama.",
          "Kira yardımı, dönüşüm kredisi ve harç/vergi muafiyetleri.",
        ],
        url: "https://www.mevzuat.gov.tr/mevzuatmetin/1.5.6306.pdf",
      },
    ],
  },
];

// AI Asistan için düz metin bağlam üretir.
export function mevzuatContext(): string {
  const lines: string[] = [];
  for (const g of MEVZUAT) {
    lines.push(`# ${g.group}`);
    for (const it of g.items) {
      lines.push(`## ${it.title} (${it.kind})`);
      lines.push(it.summary);
      for (const kp of it.keyPoints) lines.push(`- ${kp}`);
      lines.push(`Kaynak: ${it.url}`);
    }
  }
  return lines.join("\n");
}
