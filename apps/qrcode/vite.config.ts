import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// QRCODE_BASE is set by the monorepo build. Defaults to "/" for local dev.
export default defineConfig({
  base: process.env.QRCODE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5175,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
