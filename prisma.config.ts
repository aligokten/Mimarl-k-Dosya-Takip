import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migration'lar (prisma migrate deploy) için mümkünse "pooled" olmayan
// bağlantı adresini kullan: Neon/Vercel entegrasyonu bunları farklı
// isimlerle ekleyebiliyor.
const migrationUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
