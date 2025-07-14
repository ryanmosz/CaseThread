import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/electron/preload/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['electron'],
    },
    outDir: 'dist/preload',
    emptyOutDir: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@preload': resolve(__dirname, 'src/electron/preload'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
}); 