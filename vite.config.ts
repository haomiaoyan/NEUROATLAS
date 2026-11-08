import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/* GitHub Pages 部署在 /NEUROATLAS/ 子路径下：CI 设 PAGES_BASE，本地默认 '/' */
export default defineConfig({
  base: process.env.PAGES_BASE || '/',
  plugins: [react()],
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
});

