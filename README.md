# Mimarlık Ofisi Dosya Takip Sistemi

Mimari proje, akustik rapor ve yapı ruhsatı süreçlerinin; müşteri, arsa
sahibi/vekaletname, hizmet aşamaları ve evrak (dijital + fiziksel) takibini
tek yerden yapmanızı sağlayan ofis içi web uygulaması.

## 🌐 Web Sürümü (kullanımda) — GitHub Pages

**https://aligokten.github.io/Mimarl-k-Dosya-Takip/**

`webapp/` klasöründeki bu sürüm tarayıcıda çalışır; kurulum, sunucu ve
veritabanı gerektirmez. Veriler kullanılan tarayıcıda saklanır — düzenli
olarak **Ayarlar → Veri Yedekleme** bölümünden yedek alın; yedeği başka bir
bilgisayarda geri yükleyebilirsiniz. `main` dalına yapılan her push,
GitHub Actions ile otomatik yayınlanır (`.github/workflows/pages.yml`).

**Google Drive entegrasyonu**: Ayarlar → Google Drive bölümünden, bir
kerelik oluşturacağınız OAuth Client ID ile (adımlar uygulamanın içinde
yazıyor) Google hesabınıza bağlanabilirsiniz. Bağlandıktan sonra evrak
dosyaları uygulama içinden doğrudan Drive'daki proje klasörlerine
yüklenir ve tüm veriler her değişiklikte Drive'a otomatik yedeklenir
(başka bir cihazda "Drive'daki Yedeği Geri Yükle" ile açılabilir).
Uygulama `drive.file` kapsamı kullanır: yalnızca kendi oluşturduğu
"Mimarlık Ofisi Dosya Takip" klasörüne erişebilir.

> Not: Deponun geri kalanı (aşağıda anlatılan Next.js + PostgreSQL tam
> sürüm), çok kullanıcılı/sunuculu kuruluma geçilmek istendiğinde hazır
> bekleyen gelişmiş sürümdür; web sürümünü etkilemez.

## Özellikler

- **Kullanıcılar ve roller**: Yönetici / Personel ayrımıyla çoklu kullanıcı girişi.
- **Müşteriler**: İletişim ve fatura bilgileri, bağlı projeler.
- **Arsa Sahipleri**: Vekaletname no/tarih/noter bilgisi ve taranmış vekaletname dosyası.
- **Projeler**: Adres/ada/parsel/pafta bilgisi, müşteri ve arsa sahibi ilişkisi.
- **Hizmetler ve Aşamalar**: Her projeye Mimari Proje, Akustik Rapor, Yapı
  Ruhsatı, İskan, Zemin Etüdü gibi hizmetler eklenir; her hizmetin kendi
  aşama/checklist'i (Ayarlar sayfasından özelleştirilebilir) proje bazında
  işaretlenir, hedef tarih ve durum takibi yapılır.
- **Evraklar**: Dijital evraklar Google Drive'a otomatik olarak proje
  klasörüne yüklenir; fiziksel (basılı) evraklar için dolap/raf/klasör
  konumu kaydedilir; bir evrak hem dijital hem fiziksel olarak işaretlenebilir.
- **Panel**: Devam eden/tamamlanan proje sayıları, yaklaşan hedef tarihler.

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
