import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Taranmış evrak yüklemeleri için; Vercel'in kendi platform sınırı
      // (Hobby planda ~4.5MB) yine de geçerlidir.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
