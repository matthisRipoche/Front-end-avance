import { createError, defineEventHandler, proxyRequest, setResponseStatus, type H3Event } from 'h3';

import { cibleSpring } from '../../utils/relais';

/**
 * Relais générique : toute requête /api/… (toutes méthodes) part telle quelle vers l'API Spring.
 *
 * Pourquoi : le navigateur ne voit qu'une origine, celle du front. Le cookie de session
 * (JSESSIONID) et le jeton CSRF (XSRF-TOKEN → en-tête X-XSRF-TOKEN) suivent donc sans CORS.
 * proxyRequest transmet cookies, en-têtes et corps, et recopie chaque Set-Cookie de Spring.
 *
 * Les routes dédiées plus précises (src/server/routes/api/<nom>.<méthode>.ts) passent avant
 * celle-ci : ce relais ne sert que les appels qui n'ont rien à transformer.
 *
 * Certaines adresses sont refusées (404, sans appeler Spring) : /api/_analog, /api/ingest,
 * et tout ce qui sortirait de /api une fois `..` résolu. Voir cibleSpring (utils/relais.ts).
 *
 * Erreurs : les 4xx de Spring passent tels quels (la page sait quoi faire d'un 401) ;
 * un 5xx devient 502 et un Spring injoignable 503, sans détail interne ni adresse de Spring.
 */

export default defineEventHandler(async (event) => {
  // La cible est calculée une seule fois : ce qui est vérifié est exactement ce qui part.
  const cible = cibleSpring(event.path);
  if (!cible) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  try {
    return await proxyRequest(event, cible.href, {
      onResponse: (ev, response) => {
        if (response.status >= 500) repondreErreurApi(ev, response);
      },
    });
  } catch {
    // Spring a coupé pendant la copie du corps : statut et en-têtes sont déjà partis, la réponse
    // ne peut plus devenir un 503. On coupe aussi la connexion du navigateur : sinon il attend
    // sans fin, et un end() lui ferait prendre un corps tronqué pour une réponse complète.
    if (event.handled) {
      journaliser(event, 'réponse interrompue');
      event.node.res.destroy();
      return;
    }
    // sendProxy transforme un fetch rejeté en erreur 502 générique : c'est Spring injoignable.
    // On répond nous-mêmes pour garder le même corps { message } que le 502.
    journaliser(event, 'injoignable');
    setResponseStatus(event, 503, 'Service Unavailable');
    return { message: 'API indisponible' };
  }
});

/**
 * Réécrit une réponse ≥ 500 de Spring en 502. Appelé par proxyRequest après la copie des
 * en-têtes et avant celle du corps : on retire ce qui vient de Spring (Set-Cookie compris),
 * on répond nous-mêmes et on termine, ce qui fait arrêter sendProxy (event.handled).
 */
function repondreErreurApi(event: H3Event, response: Response): void {
  journaliser(event, response.status);
  const res = event.node.res;
  for (const nom of response.headers.keys()) res.removeHeader(nom);
  void response.body?.cancel().catch(() => undefined);
  res.statusCode = 502;
  res.statusMessage = 'Bad Gateway';
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ message: "Erreur de l'API" }));
}

/**
 * Méthode, chemin et statut seulement : jamais de cookie, d'en-tête ni de query (un retour
 * OAuth y porte un code à usage unique).
 */
function journaliser(event: H3Event, statut: number | 'injoignable' | 'réponse interrompue'): void {
  const chemin = event.path.split('?')[0];
  console.error(`[api] ${event.method} ${chemin} → Spring ${statut}`);
}
