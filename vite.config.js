import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

// Serves /api/debrief during `npm run dev` with the same handler Vercel runs.
// The key comes from .env.local into process.env on the server only; Vite never
// exposes it to the browser because it has no VITE_ prefix.
function debriefApi() {
  return {
    name: 'pulsecoach-debrief-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '');
      if (env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
      }
      server.middlewares.use('/api/debrief', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/debrief.js');
          await mod.default(req, res);
        } catch {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
          }
          res.end(JSON.stringify({ error: 'Debrief unavailable' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [debriefApi()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        educator: resolve(import.meta.dirname, 'educator.html'),
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
