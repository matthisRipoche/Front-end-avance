import { createError, defineEventHandler, parseCookies, setResponseHeader } from 'h3';

import { chargerDetailFace, lireFace } from '../../utils/detail-face';
import { repondreErreur } from '../../utils/spring';
import { FUSEAU_PAR_DEFAUT, fuseauValide } from '../../utils/tableau-de-bord';

/**
 * Détail d'une face (page /maps/face?sid=…&side=…, #27), pour le joueur connecté.
 *
 * Pourquoi une route dédiée plutôt que le relais /api/faces/detail : Nitro valide `sid` et `side`
 * avant tout appel, traduit le 404 de Spring en message précis et renvoie la forme `DetailFace`
 * (src/app/modeles/detail-face.ts), en liste blanche, avec les noms en français, le nom de repli,
 * le mod et les compteurs calculés. La logique est dans utils/detail-face.ts.
 *
 * Ordre des contrôles : paramètres (400), session (401), puis seulement Spring. Une requête
 * invalide ou un visiteur sans session ne coûtent aucun appel à Spring.
 *
 * Le fuseau vient du cookie `tz` seulement : pas de `?tz=`, pour que la page appelle toujours la
 * même URL (même clé de TransferState côté serveur et côté navigateur).
 *
 * La réponse porte le compte du joueur : `private, no-store` et `Vary: Cookie`, jamais en cache.
 * Les erreurs ont le corps `{ message }` du relais.
 */
export default defineEventHandler(async (event) => {
  try {
    const { sid, side } = lireFace(event);
    const cookies = parseCookies(event);
    if (!cookies['JSESSIONID']) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Connexion requise' });
    }
    const fuseau = fuseauValide(cookies['tz']) ?? FUSEAU_PAR_DEFAUT;

    const detail = await chargerDetailFace(event, sid, side, fuseau);
    setResponseHeader(event, 'cache-control', 'private, no-store');
    setResponseHeader(event, 'vary', 'Cookie');
    return detail;
  } catch (e) {
    return repondreErreur(event, e);
  }
});
