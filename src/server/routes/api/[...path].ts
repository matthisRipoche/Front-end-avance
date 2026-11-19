import { createError, defineEventHandler, proxyRequest, setResponseStatus, type H3Event } from 'h3';

import { cibleSpring, enTetesOrigine, locationRelative } from '../../utils/relais';
import { springUrl } from '../../utils/spring';

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
 *
 * Redirections : jamais suivies (redirect: 'manual'). La 302 de Spring vers discord.com doit
 * atteindre le navigateur avec son Set-Cookie : JSESSIONID y porte l'état OAuth2. Spring reçoit
 * l'adresse publique du front (X-Forwarded-*, voir enTetesOrigine) pour construire la redirect_uri,
 * et une Location absolue qui pointe sur Spring ou sur le front devient un chemin relatif.
 */

export default defineEventHandler(async (event) => {
  // La cible est calculée une seule fois : ce qui est vérifié est exactement ce qui part.
  const cible = cibleSpring(event.path);
  if (!cible) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  const origine = enTetesOrigine(event);
  const originesConnues = [
    springUrl('/'),
    `${origine['x-forwarded-proto']}://${origine['x-forwarded-host']}`,
  ];

  // proxyRequest ne regarde pas le navigateur : si l'onglet se ferme, le fetch vers Spring continue
  // et la copie du corps (res.write sur un socket détruit ne lève pas) aussi. Spring ne voit jamais
  // la coupure (flux SSE fantôme, compté dans la limite par compte). On l'annule donc nous-mêmes.
  const res = event.node.res;
  const abandon = new AbortController();
  let clientParti = false;
  // `writableEnded` ne convient pas : Node le met à vrai à la destruction du socket.
  let copieTerminee = false;
  res.on('close', () => {
    if (!copieTerminee) {
      clientParti = true;
      abandon.abort();
    }
  });

  try {
    return await proxyRequest(event, cible.href, {
      // Option `headers` : prioritaire sur les en-têtes du client, qui sont donc remplacés.
      headers: { ...origine },
      fetchOptions: { redirect: 'manual', signal: abandon.signal },
      onResponse: (ev, response) => {
        if (response.status >= 500) {
          repondreErreurApi(ev, response);
          return;
        }
        // Un flux SSE doit atteindre le navigateur dès son ouverture, pas avec le premier événement.
        // Différé : une réponse aux en-têtes déjà partis compte comme « traitée » (event.handled),
        // et sendProxy ne copierait plus le corps.
        if (response.headers.get('content-type')?.includes('text/event-stream')) {
          const res = ev.node.res;
          setImmediate(() => {
            if (!res.headersSent && !res.destroyed) res.flushHeaders();
          });
        }
        // sendProxy a déjà recopié les en-têtes de Spring sur la réponse, mais rien n'est encore
        // envoyé (le corps est copié après ce rappel) : setHeader remplace donc la Location.
        const location = response.headers.get('location');
        if (response.status >= 300 && response.status < 400 && location) {
          ev.node.res.setHeader('location', locationRelative(location, originesConnues));
        }
      },
    });
  } catch {
    // Le navigateur est parti (onglet fermé) : ce n'est ni une panne ni une coupure de Spring.
    if (clientParti) return;
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
  } finally {
    copieTerminee = true;
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
 * OAuth y porte un code à usage unique). Les 3xx ne passent pas ici : ce sont des réponses
 * normales (flux OAuth2), déjà notées par le journal des requêtes.
 */
function journaliser(event: H3Event, statut: number | 'injoignable' | 'réponse interrompue'): void {
  const chemin = event.path.split('?')[0];
  console.error(`[api] ${event.method} ${chemin} → Spring ${statut}`);
}
