import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages proje sitesi altında yayınlanır:
// https://aligokten.github.io/Mimarl-k-Dosya-Takip/
export default defineConfig({
  base: "/Mimarl-k-Dosya-Takip/",
  plugins: [react(), tailwindcss()],
});
