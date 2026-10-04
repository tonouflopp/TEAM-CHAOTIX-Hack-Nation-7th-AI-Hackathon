import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El frontend nunca ve las llaves: todo /api va al server local.
  server: { proxy: { '/api': 'http://localhost:3001' } },
})
