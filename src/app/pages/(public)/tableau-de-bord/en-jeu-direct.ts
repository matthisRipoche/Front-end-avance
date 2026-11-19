import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, InjectionToken, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';

import { ADRESSE_FLUX_DIRECT, EVENEMENT_EN_JEU } from '../../../modeles/direct';
import type { EnJeu } from '../../../modeles/tableau-de-bord';

/** Ouvre le flux : remplaçable dans les tests (EventSource n'existe pas côté serveur). */
export type FabriqueEventSource = (adresse: string) => EventSource;

export const FABRIQUE_EVENT_SOURCE = new InjectionToken<FabriqueEventSource>('FABRIQUE_EVENT_SOURCE', {
  providedIn: 'root',
  factory: () => (adresse) => new EventSource(adresse),
});

/** Valeur de `EventSource.CLOSED` : la constante n'existe pas côté serveur ni toujours en test. */
const FERME = 2;
/** Délai avant de rouvrir un flux fermé, et nombre maximal de réouvertures de suite. */
const DELAI_REOUVERTURE_MS = 5000;
const REOUVERTURES_MAX = 5;

/**
 * Suit en direct la tentative en cours du joueur (`GET /api/direct`, Server-Sent Events).
 *
 * À appeler dans un contexte d'injection (constructeur de la page). Le flux s'ouvre après le premier
 * rendu, dans le navigateur seulement : `afterNextRender` s'exécute aussi pendant le SSR dans ce build,
 * donc la garde `isPlatformBrowser` est nécessaire (`EventSource` n'existe pas dans Node). Il se ferme
 * à la destruction du composant.
 *
 * Le signal vaut `undefined` tant qu'aucun événement n'est arrivé (la page garde alors les données du
 * serveur), puis `EnJeu` ou `null` (plus en jeu). Un JSON illisible est ignoré.
 *
 * Reconnexion : EventSource ne réessaie seul que si une connexion établie tombe. Toute réponse non 200
 * à l'ouverture (401, 502/503 pendant un redéploiement de Spring, refus au 6e flux) le passe en CLOSED
 * pour toujours : on recrée alors la source après 5 s, au plus 5 fois de suite (le compteur repart à
 * zéro dès qu'une connexion s'ouvre). Au-delà, abandon silencieux : on garde la dernière valeur, sans
 * rediriger, et un 401 ne boucle donc pas.
 */
export function injecterEnJeuDirect() {
  const fabrique = inject(FABRIQUE_EVENT_SOURCE);
  const destroyRef = inject(DestroyRef);
  const enJeu = signal<EnJeu | null | undefined>(undefined);

  if (!isPlatformBrowser(inject(PLATFORM_ID))) return enJeu.asReadonly();

  afterNextRender(() => {
    let source: EventSource | undefined;
    let minuteur: ReturnType<typeof setTimeout> | undefined;
    let reouvertures = 0;
    let detruit = false;

    const ouvrir = () => {
      const courante = fabrique(ADRESSE_FLUX_DIRECT);
      source = courante;
      courante.addEventListener('open', () => (reouvertures = 0));
      courante.addEventListener(EVENEMENT_EN_JEU, (evenement) => {
        try {
          const valeur = JSON.parse((evenement as MessageEvent<string>).data) as EnJeu | null;
          // Le contrat ne promet que EnJeu ou null : tout le reste est ignoré.
          if (valeur === null || (typeof valeur === 'object' && !Array.isArray(valeur))) enJeu.set(valeur);
        } catch {
          // JSON invalide : on garde la valeur précédente.
        }
      });
      courante.addEventListener('error', () => {
        if (detruit || courante.readyState !== FERME || reouvertures >= REOUVERTURES_MAX) return;
        reouvertures++;
        courante.close();
        minuteur = setTimeout(ouvrir, DELAI_REOUVERTURE_MS);
      });
    };

    ouvrir();
    destroyRef.onDestroy(() => {
      detruit = true;
      clearTimeout(minuteur);
      source?.close();
    });
  });

  return enJeu.asReadonly();
}
