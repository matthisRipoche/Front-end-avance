import { useRuntimeConfig } from 'nitropack/runtime';

// Fait connaître à TypeScript la clé déclarée dans runtimeConfig (vite.config.ts).
declare module 'nitropack' {
  interface NitroRuntimeConfig {
    apiUrl: string;
  }
}

/**
 * Adresse complète d'une route de l'API Spring : springUrl('/api/auth/me').
 * La base vient de la configuration du serveur (apiUrl, remplacée par NITRO_API_URL) :
 * aucune route serveur n'écrit l'adresse de Spring en dur.
 */
export function springUrl(path: string): string {
  const base = useRuntimeConfig().apiUrl.replace(/\/+$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
