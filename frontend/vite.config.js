import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: "window",
  },
  server: {
    host: true, // penting agar bisa diakses dari jaringan luar
    allowedHosts: ['fc3b8e8e9621.ngrok-free.app'],
  }
});
