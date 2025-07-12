import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/electron/renderer',
  build: {
    outDir: '../../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/electron/renderer/index.html'),
    },
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@renderer': resolve(__dirname, 'src/electron/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@components': resolve(__dirname, 'src/electron/renderer/components'),
      '@hooks': resolve(__dirname, 'src/electron/renderer/hooks'),
      '@utils': resolve(__dirname, 'src/electron/renderer/utils'),
    },
  },
  // CSS processing is handled by postcss.config.js
  server: {
    port: 3000,
    strictPort: true,
  },
}); 