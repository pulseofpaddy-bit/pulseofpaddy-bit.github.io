import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['android >= 60', 'chrome >= 60', 'ios >= 12'],
      renderLegacyChunks: true,
      modernPolyfills: true,
    }),
  ],
  base: '/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  }
});
