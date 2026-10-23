/// <reference types="vitest" />

import { defineConfig } from 'vite';
import analog from '@analogjs/platform';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    target: ['es2020'],
  },
  resolve: {
    mainFields: ['module'],
  },
  plugins: [
    analog({
      // Pages Markdown (FAQ, confidentialité, mod). Le surligneur de code n'est pas utilisé,
      // mais c'est cette option qui active le traitement des fichiers .md.
      // Attention : tout .md de src/content/ ou de src/app/pages/ devient une route.
      content: { highlighter: 'prism' },
      // Nitro sert comme route tout fichier de src/server/routes/ : sans cette règle,
      // health.spec.ts devenait une route /health.spec qui plantait en production.
      nitro: {
        ignore: ['**/*.spec.ts'],
      },
      // Pages générées au build (SSG). Écrire cette liste remplace la valeur par défaut,
      // qui ne contenait que '/' : l'accueil doit donc y figurer aussi.
      prerender: {
        routes: async () => ['/', '/faq', '/mod', '/confidentialite'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['**/*.spec.ts'],
    reporters: ['default'],
  },
}));
