import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/pdfkit/js/data/*.afm',
          dest: 'data'
        },
        {
          src: 'node_modules/pdfkit/js/data/*.icc',
          dest: 'data'
        }
      ]
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/electron/main/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['electron'],
    },
    outDir: 'dist/main',
    emptyOutDir: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@main': resolve(__dirname, 'src/electron/main'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
}); 