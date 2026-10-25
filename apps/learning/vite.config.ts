import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// LEARNING_BASE is set by the monorepo build, e.g. "/Main-hub/learning/". Defaults to "/".
export default defineConfig({
  base: process.env.LEARNING_BASE ?? '/',
  plugins: [react()],
});
