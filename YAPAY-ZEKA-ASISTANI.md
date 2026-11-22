# Yapay Zekâ Asistanı

Her projenin sayfasında **Yapay Zekâ Asistanı** sekmesi bulunur. Kullanıcılar
düğmelere tıklayarak veya sohbet kutusuna yazarak asistanla çalışır:

| Düğme | Ne yapar |
|---|---|
| İmar analizi | Emsal, TAKS, Hmax, çekme mesafeleri, otopark ve plan notları için ön analiz; resmî kaynakları bağlantılarıyla listeler |
| Eksik evrak kontrolü | Hizmet aşamalarına ve evrak listesine göre eksik ve süresi dolan belgeler |
| Sonraki adımlar | Öncelik sırasıyla 3–5 somut iş |
| Dilekçe hazırla | Belediyeye dilekçe taslağı (kişisel bilgiler yer tutucuyla) |
| İşveren raporu | İşverene gönderilebilecek sade durum raporu |

Asistan, mevzuatı web aramasıyla güncel resmî kaynaklardan (mevzuat.gov.tr,
Resmî Gazete, ÇŞİDB, TKGM, AFAD, belediyeler) doğrular ve kaynakları yanıtın
altında gösterir. Projeye **not ekleme** veya bir **aşamayı tamamlandı
işaretleme** önerebilir; bu öneriler kullanıcı **Uygula** demeden projeye
işlenmez ve kullanıcının kendi yetkisiyle uygulanır.

Asistanın bilgi tabanı, Arch Studio Türkiye uyarlamasındaki imar, parsel,
tescil, yapı kayıtları ve meslek pratiği becerilerinden özetlenmiştir
(`functions/ai-prompts.js`).

## Mimari

```
Ruhsat360 (webapp)  ──httpsCallable──▶  aiAssistant (Cloud Function, europe-west1)
  Proje › Yapay Zekâ Asistanı               │ 1. Giriş + ofis üyeliği + abonelik kontrolü
  ▲                                          │ 2. aiPlans/{ofis} → aylık sınır, aiUsage sayacı
  │ onSnapshot                               │ 3. Proje özeti (TC/telefon/adres/evrak linkleri SÜZÜLÜR)
  │                                          │ 4. Claude API (claude-opus-5-5, web arama + öneri aracı)
  └── offices/{ofis}/projects/{proje}/aiMessages ◀── 5. Yanıt, kaynaklar ve öneriler yazılır
```

| Yol | İçerik | Kim yazar |
|---|---|---|
| `offices/{ofis}/projects/{proje}/aiMessages` | Sohbet geçmişi, kaynaklar, öneriler | Fonksiyon (yanıtlar), üye (uygulandı işareti) |
| `aiPlans/{ofis}` | `monthlyLimit` (sayı), `enabled` (true/false) | Yalnızca platform yöneticisi |
| `aiUsage/{ofis}/months/{YYYY-AA}` | İstek ve token sayaçları | Yalnızca fonksiyon |

Plan ve kullanım kayıtları ofis ağacının dışında tutulur; ofis üyeleri kendi
kotalarını değiştiremez (`firestore.rules`).

## Kurulum (bir kez, platform yöneticisi)

1. **Anthropic API anahtarı alın:** [console.anthropic.com](https://console.anthropic.com)
   → API Keys → Create Key. Ödeme yöntemi ekleyin ve bir aylık harcama sınırı belirleyin.
2. **Anahtarı Firebase'e gizli değer olarak kaydedin** (anahtar koda veya
   depoya asla yazılmaz):

   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```

3. **Fonksiyonu ve kuralları yayınlayın:**

   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions:aiAssistant,firestore:rules
   ```

4. Web uygulaması `main` dalına birleştirildiğinde GitHub Pages iş akışıyla
   otomatik yayınlanır.

## Ofis planları ve maliyet

- Varsayılan sınır: ofis başına **ayda 100 istek** (`DEFAULT_MONTHLY_LIMIT`,
  `functions/ai.js`). Bir ofisin sınırını değiştirmek veya asistanı kapatmak
  için Firestore'da `aiPlans/{ofisId}` belgesini oluşturun:
  `{ "monthlyLimit": 300 }` veya `{ "enabled": false }`.
- Her ofisin aylık kullanımı `aiUsage/{ofisId}/months/{YYYY-AA}` altında
  istek, giriş/çıkış token ve web araması sayısı olarak tutulur; bunu
  müşteriye faturalandırmak için kullanabilirsiniz.
- Model: `claude-opus-5-5` (1M token başına giriş 4 $, çıkış 20 $; web
  araması ayrıca ücretlendirilir). Sistem talimatı önbelleğe alındığı için
  tekrar eden kısım daha ucuz faturalanır. Gerçek maliyeti ilk haftanın
  `aiUsage` kayıtlarından ve Anthropic Console'dan izleyin.

## Gizlilik (KVKK)

Modele gönderilen proje özeti yalnızca proje adı, il/ilçe/mahalle, ada/parsel/
pafta, kişilerin adı ve rolü, vekaletname bitiş tarihi, hizmetler/aşamalar ve
evrak adları/geçerlilik tarihlerinden oluşur. **TC kimlik no, telefon,
e-posta, adres, evrak bağlantıları, ofis içi notlar ve ekip bilgileri
gönderilmez** (`buildProjectContext`, `functions/ai.js`; test:
`functions/test/ai.test.js`). Kullanıcıların sohbete kendi yazdıkları metin
olduğu gibi gönderilir; kullanıcı sözleşmenizde ve aydınlatma metninizde
yapay zekâ hizmet sağlayıcısına (Anthropic) aktarımı belirtin.

## Testler

```bash
cd functions && npm test
```

Fonksiyonun saf mantığı (kişisel veri süzgeci, öneri doğrulama, araç döngüsü)
sahte bir Claude istemcisiyle test edilir; gerçek API çağrısı yapılmaz.
