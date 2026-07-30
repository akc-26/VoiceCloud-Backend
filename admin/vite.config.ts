import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, '../dist/admin'),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mui/x-data-grid')) {
              return 'vendor-mui-datagrid';
            }
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'vendor-mui';
            }
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('node_modules/react/') ||
              id.includes('scheduler') ||
              id.includes('use-sync-external-store')
            ) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-tanstack-query';
            }
            if (
              id.includes('recharts') ||
              id.includes('d3-') ||
              id.includes('victory')
            ) {
              return 'vendor-recharts';
            }
            if (
              id.includes('axios') ||
              id.includes('zustand') ||
              id.includes('date-fns') ||
              id.includes('lodash')
            ) {
              return 'vendor-utilities';
            }
            return 'vendor-others';
          }
        },
      },
    },
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
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
