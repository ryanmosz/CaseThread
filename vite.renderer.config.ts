import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: '../../../node_modules/pdfjs-dist/build/pdf.worker.min.js',
          dest: '.'
        }
      ]
    })
  ],
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
  publicDir: 'public',
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