import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { type CanActivateFn, Router } from '@angular/router';
import { injectResponse } from '@analogjs/router/tokens';

import { adresseDeConnexion } from './retour';
import { Session } from './session';

/**
 * Garde des pages réservées aux joueurs connectés (liste `PAGES_CONNECTEES` de
 * `session-contrat.ts`, à tenir à jour avec elle).
 *
 * Dans le navigateur, elle protège les navigations faites sans repasser par le serveur. Côté
 * serveur, c'est un filet : le middleware Nitro a déjà répondu 302 pour une page connectée sans
 * session. Elle pose elle-même le statut, car Angular ne transforme pas une redirection de garde
 * (`UrlTree`) en 302 pendant le SSR : il rendrait la page de connexion sous l'adresse demandée,
 * avec un 200.
 */
export const connexionRequise: CanActivateFn = async (_route, state) => {
  // Tout ce qui s'injecte est lu avant le premier `await`, qui fait sortir du contexte d'injection.
  const session = inject(Session);
  const router = inject(Router);
  const serveur = isPlatformServer(inject(PLATFORM_ID));
  const reponse = injectResponse();
  const connexion = adresseDeConnexion(state.url);

  let statut = session.etat().statut;
  if (statut === 'inconnu' && !serveur) {
    // Page prérendue ou Spring indisponible au rendu : on redemande une fois.
    await session.actualiser();
    statut = session.etat().statut;
  }

  if (statut === 'connecte') return true;

  if (serveur) {
    if (reponse) {
      if (statut === 'anonyme') {
        reponse.statusCode = 302;
        reponse.setHeader('location', connexion);
      } else {
        // On ne sait pas si le joueur est connecté : envoyer la page ou le login serait faux.
        reponse.statusCode = 503;
      }
    }
    return false;
  }

  // Navigateur, Spring toujours injoignable : on reste sur la page actuelle plutôt que d'envoyer
  // vers le login un joueur peut-être connecté.
  if (statut === 'inconnu') return false;
  return router.parseUrl(connexion);
};
