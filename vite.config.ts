import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    target: 'esnext',
  },
  // Add history API fallback for client-side routing
  optimizeDeps: {
    include: ['@solidjs/router']
  }
});
