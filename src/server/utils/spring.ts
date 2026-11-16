// Adresse de l'API Spring : variable d'environnement NITRO_API_URL, lue au démarrage du serveur
// (pas figée au build). Par défaut, l'API Spring lancée en local.
//
// Pourquoi pas useRuntimeConfig() de nitropack/runtime : en `npm run dev`, Analog charge les
// middlewares de src/server/middleware/ par Vite, hors de Nitro, où nitropack/runtime ne se charge
// pas (modules virtuels #nitro-internal-virtual/*) et fait tomber le serveur de dev. Nitro lisait de
// toute façon la même variable (NITRO_API_URL → runtimeConfig.apiUrl) : une seule source suffit.
export const API_URL_PAR_DEFAUT = 'http://localhost:5000';

/**
 * Adresse complète d'une route de l'API Spring : springUrl('/api/auth/me').
 * Aucune route serveur n'écrit l'adresse de Spring en dur.
 */
export function springUrl(path: string): string {
  const base = (process.env['NITRO_API_URL'] || API_URL_PAR_DEFAUT).replace(/\/+$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
