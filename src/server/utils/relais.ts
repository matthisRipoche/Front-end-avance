import { springUrl } from './spring';

// Correspondance à la limite d'un segment : /api/ingest et /api/ingest/… refusés,
// /api/ingestion relayé.
const REFUSES = /^\/api\/(_analog|ingest)(?:\/|$)/;

/**
 * Adresse Spring où relayer une requête /api/…, ou null si elle doit être refusée (404).
 *
 * La décision porte sur l'adresse telle que Spring la recevra, pas sur le chemin brut :
 * l'URL WHATWG résout `..` et `%2e%2e`, donc /api/x/%2e%2e/ingest partirait vers /api/ingest.
 * Le filtre des préfixes lit le chemin décodé, pour que /api/%69ngest ne passe pas non plus.
 *
 * Deux préfixes sont refusés :
 * - /api/_analog : points d'entrée internes d'Analog (les load des pages y sont servis) ;
 * - /api/ingest : réservé au mod, qui appelle Spring en direct avec son jeton Bearer.
 *
 * La query n'est pas touchée : l'encodage du SID (Celeste%2F1-…) arrive intact à Spring.
 */
export function cibleSpring(path: string): URL | null {
  let cible: URL;
  try {
    cible = new URL(springUrl(path));
  } catch {
    return null;
  }
  if (!cible.pathname.startsWith('/api/')) return null;

  let decode: string;
  try {
    decode = decodeURIComponent(cible.pathname);
  } catch {
    return null; // encodage invalide (%zz) : on ne devine pas ce que Spring en ferait
  }
  // Un %2F décodé peut reformer un segment `..` que l'URL n'a pas résolu (/api/x%2F..%2Fingest).
  if (decode.split('/').includes('..')) return null;
  return REFUSES.test(decode) ? null : cible;
}
