import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    headers: {
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  },
  preview: {
    headers: {
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  },
})
