import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Allow LAN / public IP / Cloudflare tunnel hostnames in development.
    host: true,
    allowedHosts: true,
    // The Medora API (server/) runs on :4000 in development.
    proxy: { '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false } },
  },
  preview: {
    proxy: { '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false } },
  },
})
