import { defineEventHandler, getQuery, sendRedirect, setResponseHeader } from 'h3';

import { poserRetourConnexion } from '../../../utils/retour-connexion';

/**
 * Départ de la connexion par Discord : `GET /api/connexion/discord?redirect=<chemin>`.
 *
 * Pourquoi une route avant Spring : Spring renvoie toujours le joueur sur `/login?discord=ok`
 * après Discord, sans savoir quelle page il voulait. On retient cette page dans un cookie court
 * (`retour-connexion`, utils/retour-connexion.ts), que le middleware de session lit au retour
 * pour le renvoyer au bon endroit. Puis on passe la main au flux OAuth2 de Spring, par le relais.
 *
 * Route précise : elle passe avant le relais `api/[...path].ts`. Ni la limite de débit (POST du
 * login seulement) ni la vérification de session (pages hors /api seulement) ne la concernent.
 */
export default defineEventHandler((event) => {
  const { redirect } = getQuery(event);
  // `?redirect=a&redirect=b` donne un tableau : seul un texte unique est pris en compte.
  poserRetourConnexion(event, typeof redirect === 'string' ? redirect : null);
  // La réponse porte un cookie propre à ce navigateur : aucun cache ne doit la resservir.
  setResponseHeader(event, 'cache-control', 'no-store');
  return sendRedirect(event, '/api/auth/oauth2/discord', 302);
});
