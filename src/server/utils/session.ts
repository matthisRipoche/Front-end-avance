import {
  getRequestHeader,
  parseCookies,
  send,
  sendRedirect,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from 'h3';

import { adresseDeConnexion } from '../../app/auth/retour';
import { CLE_SESSION, estPageConnectee, type EtatSession, type Utilisateur } from '../../app/auth/session-contrat';
import { springUrl } from './spring';

// L'état lu est aussi rangé dans event.context, pour les routes Nitro qui suivent le middleware.
declare module 'h3' {
  interface H3EventContext {
    session?: EtatSession;
  }
}

/** Délai au-delà duquel Spring est considéré comme injoignable : la page ne doit pas pendre. */
const DELAI_SPRING_MS = 3000;

/** Préfixes jamais concernés : API (relais et `load` d'Analog), interne d'Analog, contrôle de santé. */
const PREFIXES_IGNORES = ['/api', '/_analog', '/health'];

/**
 * La requête demande-t-elle une page à rendre ?
 *
 * Seules les pages (GET ou HEAD, hors API et hors fichiers statiques) ont besoin de connaître la
 * session : vérifier aussi les scripts, images ou appels d'API multiplierait les appels à Spring.
 */
export function doitVerifierSession(event: H3Event): boolean {
  if (event.method !== 'GET' && event.method !== 'HEAD') return false;
  const adresse = cheminDemande(event);
  // Une page connectée est toujours vérifiée, même si son adresse contient un point
  // (`/tableau-de-bord;v=1.0`) : sinon la garde, sans état, répondrait 503 au lieu du 302.
  if (estPageConnectee(adresse)) return true;
  const chemin = adresse.split('?', 1)[0];
  if (PREFIXES_IGNORES.some((prefixe) => chemin === prefixe || chemin.startsWith(`${prefixe}/`))) {
    return false;
  }
  // Un point dans le dernier segment signale un fichier (`/assets/a.js`, `/favicon.ico`).
  const dernier = chemin.split('/').pop() ?? '';
  return !dernier.includes('.');
}

/**
 * Adresse demandée par le navigateur, query comprise.
 *
 * En `npm run dev`, Vite réécrit `req.url` en `/index.html` avant les middlewares d'Analog ; la
 * vraie adresse reste dans `req.originalUrl` (c'est celle qu'Analog rend). En production (Nitro),
 * `originalUrl` n'existe pas et `event.path` est la bonne.
 */
export function cheminDemande(event: H3Event): string {
  return (event.node.req as { originalUrl?: string }).originalUrl || event.path;
}

/**
 * État de la session de la requête, demandé à Spring (`GET /api/auth/me`).
 *
 * Un seul appel à Spring par page rendue, et seulement si le navigateur a un cookie de session :
 * sans `JSESSIONID`, Spring répondrait 401 à coup sûr, inutile de le déranger.
 */
export async function lireSession(event: H3Event): Promise<EtatSession> {
  // Prérendu au build : aucune vraie requête d'utilisateur, donc aucun compte à chercher.
  if (getRequestHeader(event, 'x-nitro-prerender')) return { statut: 'inconnu' };
  if (!parseCookies(event)['JSESSIONID']) return { statut: 'anonyme' };

  let res: Response;
  try {
    res = await fetch(springUrl('/api/auth/me'), {
      headers: { cookie: getRequestHeader(event, 'cookie') ?? '', accept: 'application/json' },
      signal: AbortSignal.timeout(DELAI_SPRING_MS),
    });
  } catch {
    journaliser('injoignable');
    return { statut: 'inconnu' };
  }

  // Les Set-Cookie de Spring ne sont jamais recopiés : cette lecture ne doit rien changer à la
  // session du navigateur, seuls le login et le logout (relais /api) le font.
  if (res.status === 401 || res.status === 403) {
    void res.body?.cancel().catch(() => undefined);
    return { statut: 'anonyme' };
  }
  if (res.status !== 200) {
    void res.body?.cancel().catch(() => undefined);
    journaliser(res.status);
    return { statut: 'inconnu' };
  }
  try {
    return { statut: 'connecte', utilisateur: utilisateurDe(await res.json()) };
  } catch {
    journaliser('réponse illisible');
    return { statut: 'inconnu' };
  }
}

/**
 * Ne garde que les champs connus : l'état finit dans le HTML (TransferState), un champ ajouté un
 * jour par Spring ne doit pas s'y retrouver sans qu'on l'ait décidé.
 */
function utilisateurDe(json: unknown): Utilisateur {
  const u = json as Record<string, unknown>;
  if (typeof u?.['id'] !== 'number') throw new Error('réponse inattendue');
  const texte = (v: unknown) => (typeof v === 'string' ? v : null);
  return {
    id: u['id'],
    email: texte(u['email']),
    createdAt: texte(u['createdAt']) ?? '',
    discordUsername: texte(u['discordUsername']),
    discordAvatarUrl: texte(u['discordAvatarUrl']),
  };
}

/**
 * Lit la session, la met à disposition du rendu, et protège les pages connectées.
 *
 * Renvoie une valeur (fin de la requête) pour le 302 et le 503, `undefined` sinon.
 */
export async function gererSession(event: H3Event): Promise<unknown> {
  if (!doitVerifierSession(event)) return undefined;

  const etat = await lireSession(event);
  // Sur la requête Node, parce qu'Angular ne reçoit que `req` (jeton REQUEST d'Analog), et qu'en
  // dev chaque middleware reçoit un événement h3 recréé (détail dans session-contrat.ts).
  (event.node.req as unknown as Record<symbol, EtatSession>)[CLE_SESSION] = etat;
  event.context.session = etat;

  if (etat.statut === 'connecte') {
    // Toute page rendue pour un joueur connecté porte son compte (navigation, TransferState),
    // pas seulement les pages connectées : ni un cache partagé ni le navigateur ne la gardent.
    setResponseHeader(event, 'cache-control', 'private, no-store');
    setResponseHeader(event, 'vary', 'Cookie');
  }

  const adresse = cheminDemande(event);
  if (!estPageConnectee(adresse)) return undefined;

  // Après une réponse envoyée ici, on renvoie `true` et non le résultat de sendRedirect / send
  // (`undefined`) : en dev, Analog passe au middleware suivant, puis au rendu, si le middleware
  // ne renvoie rien. En production, h3 voit que la réponse est partie et s'arrête.
  switch (etat.statut) {
    case 'anonyme':
      // Redirection avant tout HTML : pas de page connectée affichée puis retirée.
      // Le chemin complet (avec sa query) pour revenir exactement où le joueur allait.
      await sendRedirect(event, adresseDeConnexion(adresse), 302);
      return true;
    case 'inconnu':
      // Ni connecté ni anonyme : renvoyer vers le login serait faux (le joueur l'est peut-être).
      setResponseStatus(event, 503, 'Service Unavailable');
      setResponseHeader(event, 'cache-control', 'no-store');
      await send(event, 'Service momentanément indisponible. Réessaie dans un moment.', 'text/plain; charset=utf-8');
      return true;
    case 'connecte':
      return undefined;
  }
}

/** Statut seulement : jamais de cookie, d'en-tête ni de query. */
function journaliser(statut: number | 'injoignable' | 'réponse illisible'): void {
  console.error(`[session] Spring ${statut}`);
}
