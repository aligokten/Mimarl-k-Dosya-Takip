import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base hem Firebase Hosting kök yayında hem de GitHub Pages
// /Mimarl-k-Dosya-Takip/ alt yolunda asset dosyalarının doğru yüklenmesini sağlar.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
