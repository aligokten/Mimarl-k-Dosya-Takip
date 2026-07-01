# Mimarlık Ofisi Dosya Takip Sistemi

Mimari proje, akustik rapor ve yapı ruhsatı süreçlerinin; müşteri, arsa
sahibi/vekaletname, hizmet aşamaları ve evrak (dijital + fiziksel) takibini
tek yerden yapmanızı sağlayan ofis içi web uygulaması. Dijital evraklar
Google Drive'a (ofis Google hesabınızın depolama alanına) yüklenir.

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

Next.js (App Router) + TypeScript + Tailwind CSS, Prisma + SQLite (yerel
veritabanı dosyası), NextAuth (Auth.js) ile kimlik doğrulama, Google Drive
API (googleapis) ile dosya depolama.

## Yerel Kurulum

```bash
npm install
cp .env.example .env
```

`.env` dosyasında `AUTH_SECRET` için rastgele bir değer üretin:

```bash
openssl rand -base64 32
```

Veritabanını oluşturun ve başlangıç verilerini (yönetici hesabı + varsayılan
hizmet türleri/aşamaları) yükleyin:

```bash
npx prisma migrate dev --name init
npm run db:seed
```

Seed script'i `.env` içindeki `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` ile
(varsayılan: `aligokten99@gmail.com` / `degistirin123`) bir yönetici hesabı
oluşturur. **İlk girişten sonra bu şifreyi Ayarlar sayfasından değiştirmeniz
önerilir** (şu an şifre değiştirme arayüzü yoksa, `npx prisma studio` ile
`User` tablosundan `passwordHash` alanını güncelleyebilir veya yeni bir
yönetici kullanıcı oluşturup eskisini silebilirsiniz).

Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

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
5. Oluşturulan **Client ID** ve **Client Secret** değerlerini `.env`
   dosyasındaki `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` alanlarına
   yazın. Canlı ortamda `GOOGLE_REDIRECT_URI` değerini de gerçek domaininize
   göre güncelleyin.
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

## Dağıtım (Production) Notu

Veritabanı SQLite dosyası olarak diskte tutulur (`dev.db`). Bu nedenle:

- **Kendi sunucunuzda / VPS'de (önerilen)**: Node.js uygulamasını `npm run
  build && npm run start` ile veya Docker ile kalıcı bir disk üzerinde
  çalıştırın; `dev.db` dosyası ve `.env` dosyanızı düzenli yedekleyin.
- **Vercel gibi sunucusuz (serverless) platformlar**: Dosya sistemi kalıcı
  olmadığından SQLite bu tür ortamlarda **çalışmaz**. Serverless'a
  dağıtmak isterseniz `DATABASE_URL`'i barındırılan bir Postgres'e (örn.
  Vercel Postgres, Neon, Supabase) yönlendirip Prisma adaptörünü
  (`@prisma/adapter-pg` vb.) değiştirmeniz gerekir.

## Komutlar

- `npm run dev` — geliştirme sunucusu
- `npm run build` / `npm run start` — production build ve çalıştırma
- `npm run lint` — ESLint
- `npm run db:migrate` — yeni migration oluştur/uygula
- `npm run db:seed` — başlangıç verilerini (yönetici + hizmet türleri) yükle
- `npm run db:studio` — Prisma Studio ile veritabanını görsel olarak incele
