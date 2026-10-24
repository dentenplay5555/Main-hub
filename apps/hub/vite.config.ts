import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// HUB_BASE is set by the monorepo build, e.g. "/dentenplay-hub/". Defaults to "/".
export default defineConfig({
  base: process.env.HUB_BASE ?? '/',
  plugins: [react()],
});
