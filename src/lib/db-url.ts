// Vercel'in Neon/Postgres entegrasyonları bağlantı adresini farklı
// isimlerle ekleyebiliyor; hangisi varsa onu kullan.
export function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "Veritabanı bağlantı adresi bulunamadı. DATABASE_URL ortam değişkenini tanımlayın (Vercel'de Storage sekmesinden bir Postgres veritabanı oluşturup projeye bağlayın)."
    );
  }
  return url;
}
