import { createError, defineEventHandler, parseCookies, setResponseHeader } from 'h3';

import { repondreErreur } from '../../utils/spring';
import { chargerTableauDeBord, fuseauDe } from '../../utils/tableau-de-bord';

/**
 * Données du tableau de bord (page /tableau-de-bord, #25), pour le joueur connecté.
 *
 * Pourquoi une route dédiée plutôt que le relais /api : la page aurait sinon deux appels à faire
 * (/api/summary et /api/live) et des réponses de Spring à remettre en forme. Ici, Nitro valide le
 * fuseau, appelle les deux en parallèle avec le cookie de la requête, et renvoie exactement la
 * forme `TableauDeBord` (src/app/modeles/tableau-de-bord.ts), en liste blanche de champs.
 * La logique est dans utils/tableau-de-bord.ts, pour qu'un `load` de page puisse la réutiliser.
 *
 * La réponse porte le compte du joueur : `private, no-store` et `Vary: Cookie`, jamais en cache.
 * Les erreurs ont le corps `{ message }` du relais.
 */
export default defineEventHandler(async (event) => {
  try {
    // D'abord ce qui ne dépend pas de Spring : un paramètre faux ou un visiteur sans session ne
    // coûtent aucun appel.
    const fuseau = fuseauDe(event);
    if (!parseCookies(event)['JSESSIONID']) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Connexion requise' });
    }

    const tableau = await chargerTableauDeBord(event, fuseau);
    setResponseHeader(event, 'cache-control', 'private, no-store');
    setResponseHeader(event, 'vary', 'Cookie');
    return tableau;
  } catch (e) {
    return repondreErreur(event, e);
  }
});
