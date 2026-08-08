import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/creator/',
  plugins: [react()],
  root: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, '../shared/branding/public'),
  build: {
    outDir: path.resolve(__dirname, '../dist/creator'),
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@shared/api': path.resolve(__dirname, '../shared/api'),
      '@shared/contracts': path.resolve(__dirname, '../shared/contracts'),
      '@shared/dto': path.resolve(__dirname, '../shared/dto'),
      '@shared/enums': path.resolve(__dirname, '../shared/enums'),
      '@shared/constants': path.resolve(__dirname, '../shared/constants'),
      '@shared/permissions': path.resolve(__dirname, '../shared/permissions'),
      '@shared/validators': path.resolve(__dirname, '../shared/validators'),
      '@shared/utils': path.resolve(__dirname, '../shared/utils'),
      '@shared/config': path.resolve(__dirname, '../shared/config'),
      '@shared/theme': path.resolve(__dirname, '../shared/theme'),
      '@shared/branding': path.resolve(__dirname, '../shared/branding'),
    },
  },
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
