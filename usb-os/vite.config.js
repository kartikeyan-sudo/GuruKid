import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5176,
    allowedHosts: [
      "acres-replies-floyd-lol.trycloudflare.com",
    ],
  },
});
