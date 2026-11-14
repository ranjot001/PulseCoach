import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        stage: resolve(import.meta.dirname, 'dev/stage.html'),
        debrief: resolve(import.meta.dirname, 'dev/debrief.html'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
