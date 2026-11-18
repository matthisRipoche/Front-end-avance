import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

/** Moyens de connexion proposés en plus de l'email (contrat de Spring : `GET /api/auth/providers`). */
export type Fournisseurs = { discord: boolean };

/** Ce qu'on affiche quand Spring ne dit rien : le formulaire email seul, qui marche toujours. */
const AUCUN: Fournisseurs = { discord: false };

/**
 * Délai au-delà duquel on renonce à demander : la page de connexion ne doit pas pendre derrière un
 * Spring lent. Plus court que celui de `callSpring` (5 s) et de la lecture de session (3 s), car
 * la réponse n'est qu'accessoire : sans elle, le formulaire email reste utilisable.
 */
export const DELAI_FOURNISSEURS_MS = 2000;

/**
 * Résolveur de `/login` : demande à Spring si la connexion avec Discord est configurée.
 *
 * Un résolveur plutôt qu'un appel dans le composant : la réponse est connue avant le rendu, le
 * HTML du serveur contient déjà le bouton (ou pas), et le navigateur retrouve la même réponse dans
 * le TransferState à l'hydratation, sans bouton qui apparaît après coup.
 *
 * Il ne lève jamais : une erreur ferait échouer toute la navigation vers la page de connexion. Si
 * Spring ne répond pas, ou pas à temps, on cache le bouton Discord, puisqu'il mènerait de toute façon à une erreur.
 */
export const chargerFournisseurs: ResolveFn<Fournisseurs> = async () => {
  // Injecté avant le premier `await`, qui fait sortir du contexte d'injection.
  const http = inject(HttpClient);
  try {
    const reponse = await firstValueFrom(
      http.get<Partial<Fournisseurs> | null>('/api/auth/providers').pipe(timeout(DELAI_FOURNISSEURS_MS)),
    );
    // Liste blanche : seul un `true` explicite affiche le bouton.
    return { discord: reponse?.discord === true };
  } catch {
    return AUCUN;
  }
};
