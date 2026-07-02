// Matbu evrak/dilekçe şablonları. Köşeli parantezli alanlar ([...])
// düzenleyicide elle veya kayıtlı verilerden otomatik doldurulur.

export interface DocTemplate {
  id: string;
  title: string;
  description: string;
  icon: "scale" | "building" | "pen";
  body: string;
}

export const DOC_TEMPLATES: DocTemplate[] = [
  {
    id: "vekaletname",
    title: "Vekaletname Taslağı",
    description:
      "Arsa sahibinden alınacak, ruhsat ve resmi kurum işlemlerini kapsayan genel vekaletname taslağı.",
    icon: "scale",
    body: `
<h1>VEKALETNAME (TASLAK)</h1>
<p class="orta"><em>Bu metin taslaktır; vekaletname noter huzurunda düzenlenir.</em></p>
<p><strong>Vekalet Veren:</strong> [ARSA SAHİBİ ADI], T.C. Kimlik No: [ARSA SAHİBİ TC], Adres: [ARSA SAHİBİ ADRESİ]</p>
<p><strong>Vekil:</strong> [VEKİL ADI SOYADI], T.C. Kimlik No: [VEKİL TC]</p>
<p>Maliki bulunduğum, [İL] ili, [İLÇE] ilçesi, [MAHALLE] mahallesi, [ADA] ada, [PARSEL] parsel sayılı taşınmaz ile ilgili olarak; ilgili belediye başkanlıkları, imar ve şehircilik müdürlükleri, tapu ve kadastro müdürlükleri, çevre, şehircilik ve iklim değişikliği il müdürlükleri, elektrik-su-doğalgaz idareleri ve diğer tüm resmi kurum ve kuruluşlar nezdinde beni temsile;</p>
<ul>
  <li>Her türlü imar durumu, aplikasyon krokisi, röperli kroki ve benzeri belgeleri talep etmeye ve almaya,</li>
  <li>Mimari, statik, mekanik, elektrik ve diğer projeleri kurumlara sunmaya, tadilat ve revizyonlarını yaptırmaya,</li>
  <li>Yapı ruhsatı ve yapı kullanma izin belgesi (iskan) başvurularında bulunmaya, ilgili evrakı imzalamaya, harç ve ücretleri yatırmaya, belgeleri elden takip ederek teslim almaya,</li>
  <li>Numarataj, kanal bağlantı, zemin etüdü ve benzeri başvuruları yapmaya,</li>
  <li>Bu işlerle ilgili dilekçe, form, taahhütname ve tutanakları tanzim ve imzaya,</li>
</ul>
<p>yetkili olmak üzere yukarıda kimliği yazılı vekili tayin ettim.</p>
<p class="sag">Tarih: [TARİH]</p>
<p class="sag"><strong>Vekalet Veren</strong><br/>[ARSA SAHİBİ ADI]<br/>İmza: ______________</p>
`,
  },
  {
    id: "imar-durumu",
    title: "İmar Durumu Belgesi Başvuru Dilekçesi",
    description:
      "Belediyeye verilecek imar durumu (çap) belgesi talep dilekçesi.",
    icon: "building",
    body: `
<h1>[BELEDİYE] BELEDİYE BAŞKANLIĞI<br/>İMAR VE ŞEHİRCİLİK MÜDÜRLÜĞÜ'NE</h1>
<p><strong>Konu:</strong> İmar durumu belgesi talebi hk.</p>
<p>[İL] ili, [İLÇE] ilçesi, [MAHALLE] mahallesi, [ADA] ada, [PARSEL] parsel sayılı taşınmaza ilişkin güncel imar durumu belgesinin tarafıma verilmesini;</p>
<p>Gereğini bilgilerinize arz ederim.</p>
<p class="sag">Tarih: [TARİH]</p>
<p class="sag"><strong>Başvuru Sahibi</strong><br/>[BAŞVURAN ADI]<br/>T.C. Kimlik No: [BAŞVURAN TC]<br/>İmza: ______________</p>
<h2>İletişim ve Ekler</h2>
<p>Adres: [BAŞVURAN ADRESİ]<br/>Telefon: [TELEFON]</p>
<p>Ekler: 1- Tapu fotokopisi &nbsp; 2- Kimlik fotokopisi &nbsp; 3- Vekaletname (varsa)</p>
`,
  },
  {
    id: "hizmet-sozlesmesi",
    title: "Mimari Proje Hizmetleri Sözleşmesi",
    description:
      "Ofis ile iş sahibi arasında imzalanacak proje ve ruhsat takip hizmetleri sözleşme taslağı.",
    icon: "pen",
    body: `
<h1>MİMARİ PROJE HİZMETLERİ SÖZLEŞMESİ</h1>
<h2>Madde 1 — Taraflar</h2>
<p><strong>İş Sahibi:</strong> [MÜŞTERİ ADI], Adres: [MÜŞTERİ ADRESİ], Tel: [MÜŞTERİ TELEFON]</p>
<p><strong>Mimar / Müellif:</strong> [OFİS/MİMAR ADI], Adres: [OFİS ADRESİ], Tel: [OFİS TELEFON]</p>
<h2>Madde 2 — İşin Konusu</h2>
<p>[İL] ili, [İLÇE] ilçesi, [MAHALLE] mahallesi, [ADA] ada, [PARSEL] parsel sayılı taşınmaz üzerinde yapılacak [PROJE ADI] işine ait mimari proje hizmetlerinin (ön proje, kesin proje, uygulama projesi) hazırlanması ile yapı ruhsatı sürecinin takibidir.</p>
<h2>Madde 3 — Hizmet Bedeli ve Ödeme</h2>
<p>Toplam hizmet bedeli [BEDEL] TL + KDV olup; %[PEŞİN ORAN] tutarı sözleşme imzasında, kalan tutar [ÖDEME PLANI] şeklinde ödenecektir.</p>
<h2>Madde 4 — Süre</h2>
<p>Projelerin teslim süresi, sözleşme tarihinden ve gerekli belgelerin İş Sahibi tarafından tesliminden itibaren [SÜRE] iş günüdür. Resmi kurum inceleme süreleri bu süreye dahil değildir.</p>
<h2>Madde 5 — Tarafların Yükümlülükleri</h2>
<ul>
  <li>İş Sahibi; tapu, kimlik, vekaletname ve kurumlarca istenecek diğer belgeleri temin eder, harç ve kurum ücretlerini karşılar.</li>
  <li>Mimar; projeleri yürürlükteki imar mevzuatına ve ilgili yönetmeliklere uygun hazırlar, süreci İş Sahibine düzenli olarak bildirir.</li>
  <li>Statik, mekanik, elektrik projeleri ile zemin etüdü ve harita hizmetleri [KAPSAM NOTU] kapsamındadır/kapsam dışıdır.</li>
</ul>
<h2>Madde 6 — Fikri Haklar</h2>
<p>Projelerin telif hakları 5846 sayılı Kanun uyarınca müellife aittir; İş Sahibi projeleri yalnızca sözleşme konusu iş için kullanabilir.</p>
<h2>Madde 7 — Uyuşmazlık</h2>
<p>İşbu sözleşmeden doğan uyuşmazlıklarda [İL] mahkemeleri ve icra daireleri yetkilidir.</p>
<p>İşbu sözleşme [TARİH] tarihinde iki nüsha olarak düzenlenip taraflarca imzalanmıştır.</p>
<p><strong>İş Sahibi</strong><br/>[MÜŞTERİ ADI]<br/>İmza: ______________</p>
<p class="sag"><strong>Mimar / Müellif</strong><br/>[OFİS/MİMAR ADI]<br/>İmza: ______________</p>
`,
  },
];
