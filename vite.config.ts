import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Darjeeling/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4173,
  },
})
