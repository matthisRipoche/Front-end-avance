import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  ApplicationRef,
  Injectable,
  PLATFORM_ID,
  TransferState,
  computed,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { injectRequest } from '@analogjs/router/tokens';
import { firstValueFrom } from 'rxjs';

import { CLE_SESSION, type EtatSession, type Utilisateur } from './session-contrat';

/** Clé de l'état de session dans le `TransferState` (HTML du serveur → navigateur). */
export const CLE_ETAT_SESSION = makeStateKey<EtatSession>('cdt-session');

const INCONNU: EtatSession = { statut: 'inconnu' };

/**
 * Qui est connecté, pour les pages et les gardes.
 *
 * Côté serveur, l'état vient du middleware Nitro, qui a déjà interrogé Spring avec le cookie du
 * navigateur et l'a rangé sur la requête Node : Angular ne voit ni l'événement h3 ni les cookies,
 * il ne pourrait pas refaire l'appel lui-même. L'état est recopié dans le `TransferState` pour que
 * le navigateur le retrouve dans le HTML : l'hydratation n'a pas à rappeler Spring, et elle part
 * du même état que le rendu serveur (même HTML).
 */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly http = inject(HttpClient);
  private readonly serveur = isPlatformServer(inject(PLATFORM_ID));
  private readonly etatModifiable = signal<EtatSession>(INCONNU);
  /** Appel à `/api/auth/me` en cours, partagé pour ne pas interroger Spring deux fois. */
  private enCours: Promise<void> | null = null;

  readonly etat = this.etatModifiable.asReadonly();
  readonly utilisateur = computed(() => {
    const etat = this.etat();
    return etat.statut === 'connecte' ? etat.utilisateur : null;
  });

  constructor() {
    const transfert = inject(TransferState);
    if (this.serveur) {
      const requete = injectRequest() as unknown as Record<symbol, EtatSession | undefined> | null;
      const etat = requete?.[CLE_SESSION] ?? INCONNU;
      this.etatModifiable.set(etat);
      transfert.set(CLE_ETAT_SESSION, etat);
      return;
    }

    this.etatModifiable.set(transfert.get(CLE_ETAT_SESSION, INCONNU));
    if (this.etat().statut === 'inconnu') {
      // Page prérendue au build (aucun joueur derrière) ou Spring indisponible au rendu : on
      // demande au navigateur. Mais seulement une fois l'application stable, c'est-à-dire après
      // l'hydratation : si l'état changeait avant, le premier rendu ne serait plus celui du
      // serveur et Angular jetterait le HTML reçu.
      inject(ApplicationRef)
        .whenStable()
        .then(() => this.actualiser());
    }
  }

  /** Après une connexion (l'utilisateur) ou une déconnexion (`null`). */
  definir(utilisateur: Utilisateur | null): void {
    this.etatModifiable.set(utilisateur ? { statut: 'connecte', utilisateur } : { statut: 'anonyme' });
  }

  /**
   * Redemande à Spring qui est connecté (navigateur seulement : côté serveur, seul le middleware
   * porte le cookie du joueur). 401 veut dire « personne » ; toute autre erreur laisse l'état
   * inconnu, car on ne peut rien conclure d'une API en panne.
   */
  actualiser(): Promise<void> {
    if (this.serveur) return Promise.resolve();
    this.enCours ??= firstValueFrom(this.http.get<Utilisateur>('/api/auth/me'))
      .then(
        (utilisateur) => this.definir(utilisateur),
        (e: unknown) => {
          const anonyme = e instanceof HttpErrorResponse && e.status === 401;
          this.etatModifiable.set(anonyme ? { statut: 'anonyme' } : INCONNU);
        },
      )
      .finally(() => (this.enCours = null));
    return this.enCours;
  }
}
