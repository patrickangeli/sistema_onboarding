import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/onboarding/',
  server: {
    host: true, // Libera acesso externo (Network)
    proxy: {
      '/process': 'http://localhost:3000',
      '/employees': 'http://localhost:3000',
      '/employee': 'http://localhost:3000',
      '/upload': 'http://localhost:3000',
      '/answer': 'http://localhost:3000',
      '/next-step': 'http://localhost:3000',
      '/file': 'http://localhost:3000',
    }
  }
})
