import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { RedirectCommand, type ResolveFn, Router } from '@angular/router';
import { injectResponse } from '@analogjs/router/tokens';
import { firstValueFrom } from 'rxjs';

import { adresseDeConnexion } from '../../../auth/retour';
import { statutErreur } from '../../../auth/statut-erreur';
import type { TableauDeBord } from '../../../modeles/tableau-de-bord';

/** Ce que reçoit la page : les données, ou le statut de l'échec pour afficher l'alerte. */
export type ResultatTableau = { etat: 'ok'; donnees: TableauDeBord } | { etat: 'erreur'; statut: number };

/**
 * Résolveur du tableau de bord : charge `GET /api/tableau-de-bord` avant d'afficher la page.
 *
 * Un résolveur plutôt qu'un chargement dans le composant : les données sont là avant que le
 * composant existe, le HTML rendu par le serveur est déjà rempli, et le navigateur produit le même
 * au moment de l'hydratation, sans état de chargement visible.
 *
 * L'appel se fait **sans paramètre** (le fuseau voyage dans le cookie `tz`) : le serveur et le
 * navigateur demandent ainsi exactement la même URL, et le TransferState d'Analog, indexé par
 * l'URL, rend au navigateur la réponse obtenue pendant le SSR au lieu de rappeler l'API.
 *
 * Le résolveur ne lève jamais : une erreur ferait échouer toute la navigation. Deux formes de
 * réponse :
 * - **401** (session expirée) : côté serveur, 302 vers la connexion posé sur la réponse Node
 *   (Angular ne transforme pas une redirection en 302 pendant le SSR) ; dans le navigateur, une
 *   `RedirectCommand` vers la connexion.
 * - **autre échec** : `{ etat: 'erreur', statut }`, que la page affiche avec « Réessayer » ; côté
 *   serveur, le vrai statut HTTP est posé (503 si l'API est indisponible, 502 sinon, réseau
 *   compris).
 */
export const chargerTableau: ResolveFn<ResultatTableau | RedirectCommand> = async (_route, state) => {
  // Tout ce qui s'injecte est lu avant le premier `await`, qui fait sortir du contexte d'injection.
  const http = inject(HttpClient);
  const router = inject(Router);
  const serveur = isPlatformServer(inject(PLATFORM_ID));
  const reponse = injectResponse();

  try {
    const donnees = await firstValueFrom(http.get<TableauDeBord>('/api/tableau-de-bord'));
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
