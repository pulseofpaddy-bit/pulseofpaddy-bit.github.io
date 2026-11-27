import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import fs from 'node:fs';

function sourceIndex() {
  return {
    name: 'pulse-source-index',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/' && path !== '/index.html') return next();
        const raw = fs.readFileSync(new URL('./index.source.html', import.meta.url), 'utf8');
        const html = await server.transformIndexHtml(req.url, raw);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(html);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    sourceIndex(),
    react(),
    legacy({
      targets: ['android >= 60', 'chrome >= 60', 'ios >= 12'],
      renderLegacyChunks: true,
      modernPolyfills: false,
    }),
  ],
  base: '/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: 'index.source.html',
      output: {
        manualChunks: undefined,
      }
    }
  }
});
