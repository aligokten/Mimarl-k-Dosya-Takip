# Mimarlık Ofisi Dosya Takip Sistemi

Mimari proje, akustik rapor ve yapı ruhsatı süreçlerinin; müşteri, arsa
sahibi/vekaletname, hizmet aşamaları ve evrak (dijital + fiziksel) takibini
tek yerden yapmanızı sağlayan ofis içi web uygulaması.

## 🖥️ Windows Uygulaması

Kurulum dosyası (.exe) [**Releases**](../../releases) sayfasından indirilir:
`MimarlikDosyaTakip-Kurulum-x.y.z.exe` dosyasını çalıştırmanız yeterli;
masaüstüne kısayol eklenir. Uygulama canlı sistemi yüklediği için web'e
gelen güncellemeler masaüstünde de otomatik geçerlidir (internet gerekir).
İmzasız olduğu için Windows SmartScreen uyarısında **"Ek bilgi" → "Yine de
çalıştır"** deyin. Yeni kurulum dosyası üretmek için: GitHub → Actions →
**"Windows Kurulum Dosyası"** → Run workflow (kaynak: `desktop/dosyatakip/`).

## 🌐 Web Sürümü (kullanımda) — GitHub Pages

**https://aligokten.github.io/Mimarl-k-Dosya-Takip/**

`webapp/` klasöründeki bu sürüm tarayıcıda çalışır; kendi sunucunuzu
kurmanız gerekmez. Veriler **Firebase (Google) bulut veritabanında**
(Firestore) tutulur; böylece **aynı ofisteki 10 kullanıcıya kadar** ekip
üyesi gerçek zamanlı olarak aynı verileri görür. `main` dalına yapılan her
push, GitHub Actions ile otomatik yayınlanır (`.github/workflows/pages.yml`).

**Çoklu kullanıcı / ofis**: Uygulamaya ilk giren kişi ofisi kurar ve
**yönetici (admin)** olur. Yönetici, Ayarlar → Ekip Yönetimi'nden bir
**davet linki** üretir; bu linki alan çalışanlar kendi **Gmail** hesabıyla
giriş yapıp ofise katılır (en fazla 10 kişi). Her çalışan Profil
ayarlarından kişisel bilgilerini doldurur, yönetici tarafından projelere
**görevli** olarak atanır. Her projede **Proje Bilgileri**, **Notlar** ve
**Geçmiş Aktiviteler** (kim hangi dosyayı yükledi/indirdi) sekmeleri
bulunur; projedeki ilerlemeler, o projeye görevli tüm kullanıcılara
**uygulama içi bildirim** olarak iletilir.

**Google Drive entegrasyonu** (isteğe bağlı): Evrak dosyalarını
doğrudan Drive'daki proje klasörlerine yüklemek için Ayarlar → Google
Drive bölümünden bir kerelik OAuth Client ID ile bağlanabilirsiniz.
Uygulama `drive.file` kapsamı kullanır: yalnızca kendi oluşturduğu
"Mimarlık Ofisi Dosya Takip" klasörüne erişir. (Proje verileri artık
Firestore'da tutulur; Drive yalnızca dosya depolamak içindir.)

### 🔧 İlk kurulum — Firebase (yalnızca bir kez, yönetici yapar)

Uygulamanın çalışması için ücretsiz bir Firebase projesi bağlamanız gerekir:

1. [console.firebase.google.com](https://console.firebase.google.com/) →
   **Proje ekle** → bir ad verin (ör. `mimarlik-ofisi`) → oluşturun.
2. Sol menüden **Build → Authentication → Get started** → **Sign-in
   method** sekmesi → **Google**'ı etkinleştirin ve kaydedin.
3. **Build → Firestore Database → Create database** → konum seçin →
   **production mode** ile başlatın.
4. Firestore güvenlik kurallarını yükleyin: **Firestore → Rules** sekmesine
   gidip bu depodaki [`webapp/firestore.rules`](webapp/firestore.rules)
   dosyasının içeriğini yapıştırın → **Publish**. (Bu kurallar; yalnızca
   ofis üyelerinin veriye erişmesini, bildirimlerin yalnızca sahibi
   tarafından okunmasını ve ofis sahibinin değiştirilememesini sağlar.)
5. **Proje Ayarları (⚙️) → General → Your apps → Web (`</>`)** ile bir web
   uygulaması ekleyin; size verilen `firebaseConfig` değerlerini kopyalayın.
6. **Authentication → Settings → Authorized domains** listesine
   `aligokten.github.io` alan adını ekleyin (Google girişinin GitHub Pages
   üzerinde çalışması için gerekir).
7. Yayınlanmış uygulamayı açın; ilk açılışta çıkan **Firebase Kurulumu**
   ekranına 5. adımdaki config değerlerini yapıştırıp kaydedin. (Config
   gizli değildir; isterseniz `webapp/src/firebase-config.ts` içindeki
   `BUILTIN_FIREBASE_CONFIG`'e yazıp derlemeye gömebilirsiniz — o zaman
   kurulum ekranı hiç görünmez.)

> Firebase config değerleri **gizli değildir**; güvenlik, yukarıdaki
> Firestore kuralları ve Google girişi ile sağlanır.

> Not: Deponun geri kalanı (aşağıda anlatılan Next.js + PostgreSQL tam
> sürüm), farklı bir kurulum senaryosu için hazır bekleyen alternatif
> sürümdür; web sürümünü etkilemez.

## Özellikler

- **Çoklu kullanıcı ofis**: Gmail ile giriş, davet linkiyle ofise katılma
  (10 kişiye kadar), yönetici (admin) / çalışan (staff) rolleri, profil
  ayarları. Yönetici çalışanları projelere görevli olarak atar.
- **Kişiler**: Müşteri, arsa sahibi ve müteahhit tek "Kişi" kartında birden
  fazla rolle tutulur; vekaletname no/tarih/noter bilgisi ve taranmış
  vekaletname dosyası dahil.
- **Projeler**: Adres/ada/parsel/pafta bilgisi, kişi ilişkileri; her projede
  **Proje Bilgileri**, **Hizmetler ve Aşamalar**, **Evraklar**, **Notlar** ve
  **Geçmiş Aktiviteler** sekmeleri.
- **Hizmetler ve Aşamalar**: Her projeye Mimari Proje, Akustik Rapor, Yapı
  Ruhsatı, İskan, Zemin Etüdü gibi hizmetler eklenir; her hizmetin kendi
  aşama/checklist'i (Ayarlar sayfasından özelleştirilebilir) proje bazında
  işaretlenir, hedef tarih ve durum takibi yapılır.
- **Evraklar**: Dijital evraklar Google Drive'a proje klasörüne yüklenir;
  fiziksel (basılı) evraklar için dolap/raf/klasör konumu kaydedilir. Kim
  hangi dosyayı yükledi/indirdi, aktivite geçmişinde tutulur.
- **Bildirimler**: Projedeki ilerlemeler (aşama tamamlama, evrak yükleme,
  not ekleme, görevli atama) o projeye görevli tüm kullanıcılara uygulama
  içi bildirim olarak iletilir.
- **Evrak şablonları**: Hazır dilekçe/sözleşme şablonları veya kendi
  yüklediğiniz Word/metin şablonları; proje verileriyle otomatik doldurma,
  PDF olarak yazdırma.
- **Panel**: Devam eden/tamamlanan proje sayıları, yaklaşan hedef tarihler,
  takvim ve koyu mod.

## Teknoloji

Next.js (App Router) + TypeScript + Tailwind CSS, Prisma + PostgreSQL
(Neon/Vercel Postgres veya kendi sunucunuz), NextAuth (Auth.js) ile kimlik
doğrulama, Google Drive API (googleapis) ile dosya depolama.

## İnternete Açma (Vercel + Neon Postgres) — Önerilen

Uygulamayı `https://PROJE-ADI.vercel.app` gibi bir adresten tarayıcıyla
kullanmak için (ücretsiz):

1. [vercel.com](https://vercel.com) adresine gidin, **"Continue with
   GitHub"** ile giriş yapın.
2. **Add New… → Project** deyin ve `Mimarl-k-Dosya-Takip` deposunu
   **Import** edin.
3. Deploy etmeden önce **Environment Variables** bölümüne şunları ekleyin:
   - `AUTH_SECRET`: uzun rastgele bir metin (ör. `openssl rand -base64 32`
     çıktısı ya da rastgele 40+ karakter).
   - `SEED_ADMIN_PASSWORD`: yönetici hesabının ilk şifresi — **mutlaka
     kendiniz belirleyin**, varsayılan şifreyle internete açmayın.
4. **Deploy** butonuna basın. İlk deploy veritabanı olmadığı için
   **başarısız olabilir** — sorun değil, sıradaki adımla düzelecek.
5. Proje panelinde **Storage** sekmesine gidin → **Create Database** →
   **Neon (Serverless Postgres)** seçin → oluşturun ve projeye bağlayın.
   Bu işlem `DATABASE_URL` değişkenini otomatik ekler.
6. **Deployments** sekmesinden son deployment'ın yanındaki **⋯ →
   Redeploy** deyin. Build sırasında migration'lar ve başlangıç verileri
   (yönetici hesabı + hizmet türleri) otomatik yüklenir.
7. Verilen `https://....vercel.app` adresini açın,
   `SEED_ADMIN_EMAIL` (varsayılan `aligokten99@gmail.com`) ve
   belirlediğiniz `SEED_ADMIN_PASSWORD` ile giriş yapın.

Google Drive bağlantısı için aşağıdaki "Google Drive Bağlantısı Kurulumu"
bölümündeki adımları izleyin; redirect URI olarak
`https://SIZIN-VERCEL-ADRESINIZ/api/drive/callback` girin ve
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` değişkenlerini Vercel'e ekleyip
yeniden deploy edin.

> Not: Vercel'in ücretsiz planında tek istekte yüklenebilecek dosya boyutu
> ~4.5MB ile sınırlıdır. Daha büyük taranmış evraklar için dosyayı Drive'a
> elle yükleyip uygulamada "Fiziksel" kayıt + not olarak tutabilir ya da
> ileride doğrudan tarayıcıdan Drive'a yükleme özelliği ekletebilirsiniz.

## Yerel Kurulum (geliştirme)

Yerelde PostgreSQL çalışıyor olmalı (ör. `postgresql://postgres:postgres@localhost:5432/mimarlik`).

```bash
npm install
cp .env.example .env    # DATABASE_URL ve AUTH_SECRET doldurun
npx prisma migrate dev
npm run db:seed
npm run dev
```

Seed script'i `.env` içindeki `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` ile
(varsayılan: `aligokten99@gmail.com` / `degistirin123`) bir yönetici hesabı
oluşturur. Şifrenizi giriş yaptıktan sonra **Ayarlar → Şifremi Değiştir**
bölümünden güncelleyebilirsiniz.

`http://localhost:3000` adresinden giriş yapabilirsiniz.

## Google Drive Bağlantısı Kurulumu

Uygulama, dijital evrakları **ofisin ortak Google hesabına** (bu durumda
`aligokten99@gmail.com` ve buna bağlı 5TB Google AI Pro depolama alanına)
yükler. Tüm çalışanlar sisteme kendi hesabıyla giriş yapar, ancak dosyalar
tek bir merkezi Drive bağlantısı üzerinden saklanır. Bunu kurmak için:

1. [Google Cloud Console](https://console.cloud.google.com/) üzerinde yeni
   bir proje oluşturun (veya mevcut bir projeyi kullanın).
2. **APIs & Services > Library** kısmından **Google Drive API**'yi etkinleştirin.
3. **APIs & Services > OAuth consent screen** kısmından bir OAuth ekranı
   yapılandırın:
   - User Type: **External** (ya da Google Workspace kullanıyorsanız Internal).
   - Uygulama adı, destek e-postası vb. bilgileri girin.
   - Test kullanıcıları kısmına `aligokten99@gmail.com` adresini ekleyin
     (uygulama "Production"a alınmadığı sürece sadece test kullanıcıları
     giriş yapabilir; bu, tek hesaplı ofis kullanımı için sorun değildir).
4. **APIs & Services > Credentials** kısmından **Create Credentials > OAuth
   client ID** seçin:
   - Application type: **Web application**.
   - Authorized redirect URIs kısmına şunu ekleyin:
     - Yerel geliştirme için: `http://localhost:3000/api/drive/callback`
     - Canlı ortam için: `https://SIZIN-DOMAININIZ/api/drive/callback`
       (Vercel kullanıyorsanız `https://PROJE-ADI.vercel.app/api/drive/callback`)
5. Oluşturulan **Client ID** ve **Client Secret** değerlerini
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` ortam değişkenlerine yazın
   (yerelde `.env` dosyası, Vercel'de proje ayarlarındaki Environment
   Variables). Yönlendirme adresi uygulamanın çalıştığı alan adından
   otomatik türetilir; isterseniz `GOOGLE_REDIRECT_URI` ile elle de
   belirleyebilirsiniz.
6. Uygulamayı başlatıp `aligokten99@gmail.com` ile giriş yapın, **Ayarlar**
   sayfasından **"Google Drive'a Bağlan"** butonuna tıklayın ve Google hesabı
   ile yetkilendirmeyi tamamlayın (izin ekranında `aligokten99@gmail.com`
   hesabını seçtiğinizden emin olun).
7. Bağlantı kurulduğunda uygulama Drive'ınızda otomatik olarak
   **"Mimarlık Ofisi Dosya Takip"** adında bir kök klasör oluşturur; her
   proje için bu klasörün altında proje adıyla bir alt klasör açılır.

> Not: Uygulama yalnızca **kendi oluşturduğu dosya ve klasörlere** erişim
> ister (`drive.file` kapsamı). Google hesabınızdaki diğer dosyalarınıza
> erişemez.

## Kullanıcı Yönetimi

Ayarlar sayfasındaki **Kullanıcılar** bölümünden yönetici hesabıyla yeni
personel hesapları (Personel/Yönetici rolü seçerek) oluşturabilirsiniz.
Personel rolü proje/müşteri/evrak işlemlerini yapabilir; Drive bağlantısı,
hizmet türü/aşama şablonu düzenleme ve kullanıcı yönetimi yalnızca
Yönetici rolüne açıktır.

## Veri Modeli Notu

Varsayılan olarak 5 hizmet türü ve aşama şablonuyla gelir (Mimari Proje,
Akustik Rapor, Yapı Ruhsatı, Yapı Kullanma İzni/İskan, Zemin Etüdü). Bunlar
Ayarlar sayfasından tamamen özelleştirilebilir: yeni hizmet türü ekleyebilir,
her hizmetin aşama/checklist adımlarını düzenleyebilirsiniz.

## Komutlar

- `npm run dev` — geliştirme sunucusu
- `npm run build` — migration + seed + production build (Vercel bunu kullanır)
- `npm run build:local` — yalnızca build (veritabanına dokunmadan)
- `npm run start` — production sunucusu
- `npm run lint` — ESLint
- `npm run db:migrate` — yeni migration oluştur/uygula
- `npm run db:seed` — başlangıç verilerini (yönetici + hizmet türleri) yükle
- `npm run db:studio` — Prisma Studio ile veritabanını görsel olarak incele
