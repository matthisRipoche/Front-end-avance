import { createError, defineEventHandler, parseCookies, setResponseHeader } from 'h3';

import { chargerMesMaps } from '../../utils/mes-maps';
import { repondreErreur } from '../../utils/spring';
import { FUSEAU_PAR_DEFAUT, fuseauValide } from '../../utils/tableau-de-bord';

/**
 * Faces jouées par le joueur connecté (page /maps, #26).
 *
 * Pourquoi une route dédiée plutôt que le relais /api/faces : Nitro renvoie la forme `MesMaps`
 * (src/app/modeles/mes-maps.ts) en liste blanche, avec le nom de repli, le mod déduit du SID, la
 * liste des mods et un ordre stable. La page n'a plus qu'à filtrer.
 * Aucun paramètre de tri ni de filtre : le résolveur appelle toujours la même URL, pour garder la
 * même clé de TransferState entre le serveur et le navigateur ; la page trie et filtre elle-même.
 *
 * Le fuseau vient du cookie `tz` seulement : pas de `?tz=`, pour la même raison. Il ne sert qu'à
 * l'affichage des dates, `/api/faces` n'en a pas besoin.
 *
 * La réponse porte le compte du joueur : `private, no-store` et `Vary: Cookie`, jamais en cache.
 * Les erreurs ont le corps `{ message }` du relais.
 */
export default defineEventHandler(async (event) => {
  try {
    const cookies = parseCookies(event);
    // Un visiteur sans session ne coûte aucun appel à Spring.
    if (!cookies['JSESSIONID']) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Connexion requise' });
    }
    const fuseau = fuseauValide(cookies['tz']) ?? FUSEAU_PAR_DEFAUT;

    const maps = await chargerMesMaps(event, fuseau);
    setResponseHeader(event, 'cache-control', 'private, no-store');
    setResponseHeader(event, 'vary', 'Cookie');
    return maps;
  } catch (e) {
    return repondreErreur(event, e);
  }
});
