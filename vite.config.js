import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SPA en GitHub Pages → necesita base path coincidente con el subdirectorio del repo.
// VITE_BASE_PATH puede sobrescribirse en CI; en dev local usar default.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/salud-familiar-comunitaria/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'recharts': ['recharts'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['./tests/**/*.{test,spec}.{js,jsx}'],
  },
});
