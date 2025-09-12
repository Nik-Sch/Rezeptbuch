import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteTsconfigPaths(),
    svgr({
      include: '**/*.svg?react',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3040/",
        changeOrigin: true,
        ws: true,
        secure: false
      }
    }
  }
});
