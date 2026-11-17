import type { HttpInterceptorFn } from '@angular/common/http';
import { injectRequest } from '@analogjs/router/tokens';

/** Adresse relative vers la couche serveur du site : `/api/…`, sans hôte (`//…` est refusé). */
const versNotreApi = (url: string) => url.startsWith('/api/');

/**
 * Recopie le cookie du navigateur sur les appels `HttpClient` faits pendant le rendu serveur.
 *
 * Pendant le SSR, `requestContextInterceptor` d'Analog appelle Nitro avec les en-têtes de la
 * requête Angular, pas ceux de la requête du navigateur : sans cet intercepteur, une route qui
 * a besoin de la session (`/api/tableau-de-bord`) répond 401 alors que le joueur est connecté.
 * L'en-tête est recopié entier, car la route y lit `JSESSIONID`, `XSRF-TOKEN` et `tz`.
 *
 * Seules les adresses relatives en `/api/` le reçoivent : le cookie du joueur ne doit jamais
 * partir vers une autre origine. Dans le navigateur, `REQUEST` est absent et la requête passe
 * telle quelle (le navigateur joint lui-même le cookie). Il doit être placé **avant**
 * `requestContextInterceptor`, qui ne rend pas la main à la suite de la chaîne côté serveur.
 */
export const transmettreCookieSsr: HttpInterceptorFn = (req, next) => {
  const cookie = injectRequest()?.headers?.cookie;
  if (typeof cookie === 'string' && cookie && versNotreApi(req.url)) {
    return next(req.clone({ setHeaders: { cookie } }));
  }
  return next(req);
};
