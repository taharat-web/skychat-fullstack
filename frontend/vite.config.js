import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, Vite proxies /api and /socket.io straight to the backend so the
// browser sees everything as same-origin - no CORS headaches, and the
// refresh-token cookie behaves exactly like it will in production behind
// Nginx.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
