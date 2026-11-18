import { getRequestHost, getRequestProtocol, type H3Event } from 'h3';

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

/** En-têtes qui disent à Spring l'adresse publique du front. */
export interface EnTetesOrigine {
  'x-forwarded-host': string;
  'x-forwarded-proto': 'http' | 'https';
  'x-forwarded-port': string;
}

/**
 * Adresse publique du front, telle que le navigateur la voit, à transmettre à Spring.
 *
 * Pourquoi : Spring construit la redirect_uri de Discord (et ses redirections absolues) à partir
 * des X-Forwarded-*. Sans eux, il prendrait son propre hôte et Discord renverrait le joueur chez
 * Spring ou sur l'ancien site. Les valeurs posées ici remplacent celles du client dans proxyRequest.
 *
 * - En production, Traefik pose X-Forwarded-Host et X-Forwarded-Proto devant Nitro : on les relit.
 * - En dev, pas de proxy : Host vaut localhost:5173, et le protocole celui de la connexion.
 * - Port : celui de l'hôte s'il y en a un, sinon le port par défaut du protocole.
 *
 * Sans proxy devant Nitro, un client peut envoyer son propre X-Forwarded-Host : il est alors
 * répercuté tel quel. C'est accepté : il ne change que la réponse de ce client (une redirect_uri
 * que Discord refuse, car elle n'est pas enregistrée), jamais celle d'un autre joueur, et en
 * production Traefik écrase ces en-têtes.
 */
export function enTetesOrigine(event: H3Event): EnTetesOrigine {
  const host = getRequestHost(event, { xForwardedHost: true });
  const proto = getRequestProtocol(event, { xForwardedProto: true }) === 'https' ? 'https' : 'http';
  // Le port suit le dernier « : » hors crochets ([::1]:5173 → 5173, [::1] → aucun).
  const port = /:(\d+)$/.exec(host)?.[1] ?? (proto === 'https' ? '443' : '80');
  return { 'x-forwarded-host': host, 'x-forwarded-proto': proto, 'x-forwarded-port': port };
}

/**
 * Location d'une redirection de Spring, réécrite en chemin relatif si elle pointe sur Spring ou
 * sur l'origine publique du front ; toute autre adresse (discord.com) est renvoyée telle quelle.
 *
 * Pourquoi : derrière le relais, une adresse absolue de Spring (http://celeste-web-1/login…)
 * enverrait le navigateur hors du front. Un chemin relatif le garde sur l'origine qu'il voit.
 * Une Location déjà relative ou illisible n'est pas touchée.
 */
export function locationRelative(location: string, origines: readonly string[]): string {
  let url: URL;
  try {
    url = new URL(location);
  } catch {
    return location; // déjà relative (ou illisible) : rien à réécrire
  }
  // URL.origin normalise casse et port par défaut (https://x:443 → https://x).
  const connues = origines.flatMap((o) => {
    try {
      return [new URL(o).origin];
    } catch {
      return [];
    }
  });
  if (!connues.includes(url.origin)) return location;
  const chemin = `${url.pathname}${url.search}${url.hash}`;
  // Un chemin qui commence par `//` (ou `/\`, que les navigateurs lisent pareil) est une adresse
  // externe relative au protocole : http://spring//evil.fr/x deviendrait //evil.fr/x, soit
  // evil.fr. Dans ce cas, on renvoie la Location d'origine, qui reste sur Spring.
  return /^\/[/\\]/.test(chemin) ? location : chemin;
}
