import { defineEventHandler, setResponseHeader } from 'h3';

import { chargerFournisseurs } from '../../../utils/fournisseurs';
import { repondreErreur } from '../../../utils/spring';

/**
 * Fournisseurs de connexion proposés : `GET /api/connexion/fournisseurs` → `{ discord: boolean }`.
 *
 * Pourquoi une route du front : la page /login ne doit afficher le bouton Discord que si Spring
 * l'a activé, mais la réponse de Spring (`/api/auth/providers`) n'est pas filtrée et serait relayée
 * telle quelle. Cette route la réduit à une liste blanche et la garde 5 minutes en cache serveur
 * (utils/fournisseurs.ts), pour ne pas rappeler Spring à chaque affichage de /login.
 *
 * Pourquoi elle est publique : la valeur est la même pour tous les visiteurs, connectés ou non.
 * Elle ne lit donc aucun cookie, n'en pose aucun et n'a pas de `Vary` : une réponse qui
 * porterait un `Set-Cookie` ne doit jamais atteindre un cache partagé. Le navigateur et les
 * caches intermédiaires peuvent la garder 60 s ; `x-cache` dit d'où vient la valeur côté serveur.
 * Une erreur n'est jamais gardée (`no-store`).
 */
export default defineEventHandler(async (event) => {
  try {
    const { fournisseurs, etat } = await chargerFournisseurs(event);
    setResponseHeader(event, 'cache-control', 'public, max-age=60');
    setResponseHeader(event, 'x-cache', etat);
    return fournisseurs;
  } catch (e) {
    setResponseHeader(event, 'cache-control', 'no-store');
    return repondreErreur(event, e);
  }
});
