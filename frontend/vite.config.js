import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Saat development, semua request ke /api diteruskan ke backend di port 5000
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
