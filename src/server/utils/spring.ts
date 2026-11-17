import { createError, getRequestHeader, isError, setResponseStatus, type H3Error, type H3Event } from 'h3';

// Adresse de l'API Spring : variable d'environnement NITRO_API_URL, lue à l'exécution à chaque appel
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

/** Délai par défaut d'un appel à Spring : une page ou une route ne doit pas pendre. */
const DELAI_SPRING_MS = 5000;

/** Options d'un appel à Spring. `body` est envoyé en JSON. */
export interface OptionsSpring {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

/**
 * Appelle Spring au nom de l'utilisateur de la requête en cours et renvoie le JSON de la réponse.
 *
 * Le cookie de session et le jeton CSRF viennent de la requête en cours, jamais d'une variable de
 * module (elle serait partagée entre tous les joueurs) : cette fonction ne garde aucun état.
 * Les `Set-Cookie` de Spring ne sont jamais recopiés : seuls le login et le logout, par le relais
 * /api, ont le droit de changer la session du navigateur.
 *
 * Lance une erreur h3 déjà traduite (voir springError) : 503 si Spring est injoignable ou trop
 * lent, 502 si sa réponse est illisible.
 */
export async function callSpring<T>(event: H3Event, path: string, init: OptionsSpring = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers({ accept: 'application/json' });
  // Seulement s'ils existent : un en-tête vide ferait croire à Spring qu'on a tenté quelque chose.
  const cookie = getRequestHeader(event, 'cookie');
  if (cookie) headers.set('cookie', cookie);
  const xsrf = getRequestHeader(event, 'x-xsrf-token');
  if (xsrf) headers.set('x-xsrf-token', xsrf);

  let body: string | undefined;
  if (init.body !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.body);
  }

  const signal = AbortSignal.timeout(init.timeoutMs ?? DELAI_SPRING_MS);
  let res: Response;
  try {
    res = await fetch(avecQuery(springUrl(path), init.query), { method, headers, body, signal });
  } catch {
    journaliser(method, path, 'injoignable');
    throw indisponible();
  }

  if (!res.ok) {
    void res.body?.cancel().catch(() => undefined);
    journaliser(method, path, res.status);
    throw springError(res.status);
  }
  try {
    return (await res.json()) as T;
  } catch {
    // Le délai peut aussi tomber pendant la lecture du corps : c'est encore un Spring trop lent.
    if (signal.aborted) {
      journaliser(method, path, 'injoignable');
      throw indisponible();
    }
    journaliser(method, path, 'réponse illisible');
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: "Erreur de l'API" });
  }
}

/**
 * Traduit le statut d'une réponse de Spring en erreur h3 à lancer, avec un message en français et
 * sans aucun détail venu de Spring. Un 5xx (ou tout statut imprévu) devient 502 : l'erreur vient
 * de Spring, pas du front.
 *
 * Le texte va dans `message` : h3 retire les accents de `statusMessage` (ligne de statut HTTP).
 */
export function springError(status: number): H3Error {
  switch (status) {
    case 400:
      return createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Requête invalide' });
    case 401:
      return createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Connexion requise' });
    case 403:
      return createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'Accès refusé' });
    case 404:
      return createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Introuvable' });
    default:
      return createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: "Erreur de l'API" });
  }
}

/**
 * Répond à une erreur attrapée dans une route dédiée : pose le statut et renvoie `{ message }`,
 * le même corps que le relais /api, plutôt que le JSON d'erreur de Nitro (qui porte `url`, `stack`
 * en dev…). Une erreur qui n'est pas une erreur h3 est un bug du front : 500, détail au journal.
 */
export function repondreErreur(event: H3Event, e: unknown): { message: string } {
  if (isError(e)) {
    setResponseStatus(event, e.statusCode, e.statusMessage);
    return { message: e.message };
  }
  // Le nom et le message de l'erreur seulement : ni pile, ni requête, ni cookie.
  const detail = e instanceof Error ? `${e.name}: ${e.message}` : 'erreur inconnue';
  console.error(`[api] ${event.method} ${event.path.split('?')[0]} → erreur interne (${detail})`);
  setResponseStatus(event, 500, 'Internal Server Error');
  return { message: 'Erreur interne' };
}

function indisponible(): H3Error {
  return createError({ statusCode: 503, statusMessage: 'Service Unavailable', message: 'API indisponible' });
}

function avecQuery(url: string, query: OptionsSpring['query']): string {
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(query)) {
    if (valeur !== undefined) params.set(cle, String(valeur));
  }
  const texte = params.toString();
  if (!texte) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${texte}`;
}

/**
 * Méthode, chemin Spring et statut seulement : jamais de cookie, d'en-tête ni de query (un SID ou
 * un code OAuth peut s'y trouver).
 */
function journaliser(method: string, path: string, statut: number | 'injoignable' | 'réponse illisible'): void {
  console.error(`[spring] ${method} ${path.split('?')[0]} → Spring ${statut}`);
}
