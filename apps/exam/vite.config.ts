import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// EXAM_BASE is set by the monorepo build, e.g. "/dentenplay-hub/exam/". Defaults to "/" for standalone use.
export default defineConfig({
  base: process.env.EXAM_BASE ?? '/',
  plugins: [react()],
});
