import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/evaluation': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/predict': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/save': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  }
})