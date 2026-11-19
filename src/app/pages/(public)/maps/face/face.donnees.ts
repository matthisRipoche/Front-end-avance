import { HttpClient, HttpParams } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { RedirectCommand, type ResolveFn, Router } from '@angular/router';
import { injectResponse } from '@analogjs/router/tokens';
import { firstValueFrom } from 'rxjs';

import { adresseDeConnexion } from '../../../../auth/retour';
import { statutErreur } from '../../../../auth/statut-erreur';
import type { DetailFace } from '../../../../modeles/detail-face';

/** Ce que reçoit la page : les données, ou la raison pour laquelle il n'y en a pas. */
export type ResultatFace =
  | { etat: 'ok'; donnees: DetailFace }
  | { etat: 'vide' }
  | { etat: 'invalide' }
  | { etat: 'erreur'; statut: number };

/**
 * Résolveur de « Détail d'une face » : charge `GET /api/face?sid=&side=` avant d'afficher la page.
 *
 * Même principe que `chargerMesMaps` (`../maps.donnees.ts`). Les paramètres sont construits dans
 * un ordre fixe (`sid`, puis `side`) pour que l'URL soit identique côté serveur et côté navigateur :
 * le TransferState, indexé par l'URL, évite alors de rappeler l'API à l'hydratation. Jamais de
 * fuseau en paramètre : il voyage dans le cookie `tz`.
 *
 * Ne lève jamais :
 * - **401** : 302 vers la connexion (serveur) ou `RedirectCommand` (navigateur) ;
 * - **404** : face jamais jouée → `vide`, statut 404 côté serveur ;
 * - **400** : adresse sans face valide → `invalide`, statut 400 côté serveur ;
 * - **autre** : `erreur`, avec 503 si l'API est indisponible, 502 sinon.
 */
export const chargerDetailFace: ResolveFn<ResultatFace | RedirectCommand> = async (route, state) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const serveur = isPlatformServer(inject(PLATFORM_ID));
  const reponse = injectResponse();

  let params = new HttpParams();
  const sid = route.queryParamMap.get('sid');
  const side = route.queryParamMap.get('side');
  if (sid !== null) params = params.set('sid', sid);
  if (side !== null) params = params.set('side', side);

  const poser = (statut: number) => {
    if (serveur && reponse) reponse.statusCode = statut;
  };

  try {
    const donnees = await firstValueFrom(http.get<DetailFace>('/api/face', { params }));
    return { etat: 'ok', donnees };
  } catch (e) {
    const statut = statutErreur(e);

    if (statut === 401) {
      const connexion = adresseDeConnexion(state.url);
      if (!serveur) return new RedirectCommand(router.parseUrl(connexion));
      if (reponse) {
        reponse.statusCode = 302;
        reponse.setHeader('location', connexion);
      }
      return { etat: 'erreur', statut: 401 };
    }
    if (statut === 404) {
      poser(404);
      return { etat: 'vide' };
    }
    if (statut === 400) {
      poser(400);
      return { etat: 'invalide' };
    }
    poser(statut === 503 ? 503 : 502);
    return { etat: 'erreur', statut };
  }
};
