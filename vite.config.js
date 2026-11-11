import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// If you already have a vite.config.js, just copy the `server.proxy` block into it.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev only: JioSaavn's home feed has no CORS headers, so Vite fetches it on the browser's behalf.
      '/saavn-launch': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        rewrite: (p) => '/api.php?__call=webapi.getLaunchData&api_version=4&_format=json&_marker=0&ctx=web6dot0&' + (p.split('?')[1] || ''),
        configure: (proxy) => proxy.on('proxyReq', (pReq) => {
          const langs = new URLSearchParams(pReq.path.split('?')[1]).get('languages') || 'hindi,english';
          pReq.setHeader('Cookie', `L=${encodeURIComponent(langs)}`);
          pReq.setHeader('User-Agent', 'Mozilla/5.0');
        }),
      },
    },
  },
});
