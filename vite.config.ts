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
      // Contenu Markdown de src/content/ (FAQ, confidentialité). Le surligneur de code
      // n'est pas utilisé, mais c'est cette option qui active le traitement des fichiers .md.
      content: { highlighter: 'prism' },
      // Pages générées au build (SSG). Écrire cette liste remplace la valeur par défaut,
      // qui ne contenait que '/' : l'accueil doit donc y figurer aussi.
      prerender: {
        routes: async () => ['/', '/faq'],
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
