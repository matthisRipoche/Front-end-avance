import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { RedirectCommand, type ResolveFn, Router } from '@angular/router';
import { injectResponse } from '@analogjs/router/tokens';
import { firstValueFrom } from 'rxjs';

import { adresseDeConnexion } from '../../../auth/retour';
import { statutErreur } from '../../../auth/statut-erreur';
import type { MesMaps } from '../../../modeles/mes-maps';

/** Ce que reçoit la page : les données, ou le statut de l'échec pour afficher l'alerte. */
export type ResultatMesMaps = { etat: 'ok'; donnees: MesMaps } | { etat: 'erreur'; statut: number };

/**
 * Résolveur de « Mes maps » : charge `GET /api/maps` avant d'afficher la page.
 *
 * Même raisonnement que `chargerTableau` (`tableau-de-bord/tableau-de-bord.donnees.ts`) : les
 * données sont là avant le composant, le HTML rendu par le serveur est déjà rempli et le navigateur
 * produit le même à l'hydratation, sans état de chargement.
 *
 * L'appel se fait **sans paramètre** : le tri et le filtre se font dans la page, le fuseau voyage
 * dans le cookie `tz`. Serveur et navigateur demandent ainsi la même URL, et le TransferState
 * d'Analog, indexé par l'URL, rend au navigateur la réponse du SSR au lieu de rappeler l'API.
 *
 * Le résolveur ne lève jamais (une erreur ferait échouer toute la navigation) :
 * - **401** (session expirée) : côté serveur, 302 vers la connexion posé sur la réponse Node ;
 *   dans le navigateur, une `RedirectCommand` vers la connexion.
 * - **autre échec** : `{ etat: 'erreur', statut }`, que la page affiche avec « Réessayer » ; côté
 *   serveur, le vrai statut HTTP est posé (503 si l'API est indisponible, 502 sinon, réseau
 *   compris).
 */
export const chargerMesMaps: ResolveFn<ResultatMesMaps | RedirectCommand> = async (_route, state) => {
  // Tout ce qui s'injecte est lu avant le premier `await`, qui fait sortir du contexte d'injection.
  const http = inject(HttpClient);
  const router = inject(Router);
  const serveur = isPlatformServer(inject(PLATFORM_ID));
  const reponse = injectResponse();

  try {
    const donnees = await firstValueFrom(http.get<MesMaps>('/api/maps'));
    return { etat: 'ok', donnees };
  } catch (e) {
    const statut = statutErreur(e);
    const connexion = adresseDeConnexion(state.url);

    if (statut === 401) {
      if (!serveur) return new RedirectCommand(router.parseUrl(connexion));
      if (reponse) {
        reponse.statusCode = 302;
        reponse.setHeader('location', connexion);
      }
      return { etat: 'erreur', statut: 401 };
    }

    if (serveur && reponse) reponse.statusCode = statut === 503 ? 503 : 502;
    return { etat: 'erreur', statut };
  }
};
