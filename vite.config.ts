/// <reference types="vitest" />

import { defineConfig, loadEnv, type Plugin } from 'vite';
import analog from '@analogjs/platform';

import { PAGES_PRERENDUES } from './scripts/pages-prerendues.mjs';

/**
 * Construit le client puis le SSR l'un après l'autre, au lieu d'en parallèle.
 *
 * Analog 2.9 lance les deux builds avec Promise.all et des plugins partagés : le plugin Angular
 * n'a qu'une compilation pour les deux. Si le client finit le premier, il la libère pendant que
 * le SSR en a encore besoin, et le SSR embarque des composants non compilés (pages prérendues
 * vides). Ça arrive sous charge, et presque à chaque fois dans le conteneur Docker de la CI.
 * Enchaînés, chaque build fait sa propre compilation. Le garde-fou reste
 * scripts/verifier-prerendu.mjs.
 */
function buildsSequentiels(): Plugin {
  return {
    name: 'builds-sequentiels',
    enforce: 'post',
    config(config) {
      const buildApp = config.builder?.buildApp;
      if (!buildApp) return;
      return {
        builder: {
          buildApp: async (builder) => {
            const build = builder.build.bind(builder);
            let precedent: Promise<unknown> = Promise.resolve();
            builder.build = (environment) => {
              const suivant = precedent.then(() => build(environment));
              precedent = suivant.catch(() => undefined);
              return suivant;
            };
            await buildApp(builder);
          },
        },
      };
    },
  };
}

/**
 * Recopie NITRO_API_URL du fichier .env dans process.env, pour le serveur de dev.
 *
 * Vite ne lit .env que pour import.meta.env, côté client ; src/server/utils/spring.ts lit
 * process.env. Une variable déjà posée dans le shell garde la priorité. Ni le build (rien n'y
 * appelle Spring) ni les tests (qui posent leur propre adresse) ne sont concernés ; `npm run
 * preview` lit le même fichier avec --env-file-if-exists.
 */
function chargerEnvLocal(command: string, mode: string): void {
  if (command !== 'serve' || mode === 'test') return;
  const { NITRO_API_URL } = loadEnv(mode, process.cwd(), 'NITRO_');
  if (NITRO_API_URL) process.env['NITRO_API_URL'] ??= NITRO_API_URL;
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  chargerEnvLocal(command, mode);
  return {
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
        // Nitro charge tout fichier de src/server/ (routes, middleware, plugins) : sans cette règle,
        // health.spec.ts devenait une route /health.spec qui plantait en production.
        nitro: {
          ignore: ['**/*.spec.ts'],
          // Adresse de l'API Spring : variable NITRO_API_URL (fichier .env en local, voir
          // chargerEnvLocal), lue à chaque appel par src/server/utils/spring.ts.
        },
        // Pages générées au build (SSG). Écrire cette liste remplace la valeur par défaut,
        // qui ne contenait que '/' : l'accueil doit donc y figurer aussi.
        prerender: {
          routes: async () => PAGES_PRERENDUES,
        },
      }),
      buildsSequentiels(),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/test-setup.ts'],
      include: ['**/*.spec.ts'],
      reporters: ['default'],
      // Mesure indicative : pas de seuil bloquant. `npm run test:couverture`.
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.spec.ts', 'src/**/*.d.ts', 'src/main*.ts', 'src/test-setup.ts', 'src/**/*.config.ts'],
      },
    },
  };
});
