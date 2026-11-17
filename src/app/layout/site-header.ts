import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';

import { Compte } from '../auth/compte';
import { estPageConnexion } from '../auth/retour';
import { Session } from '../auth/session';
import { estPageConnectee } from '../auth/session-contrat';

// Barre de navigation des pages publiques.
@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeader {
  private readonly router = inject(Router);
  private readonly compte = inject(Compte);

  /**
   * Le joueur connecté, ou `null` (anonyme ou état inconnu). L'état vient du serveur par
   * TransferState : le premier rendu du navigateur est celui du serveur.
   */
  protected readonly utilisateur = inject(Session).utilisateur;

  /** Nom affiché : l'email, ou le pseudo Discord pour un compte créé par Discord. */
  protected readonly nom = computed(() => {
    const u = this.utilisateur();
    return u ? (u.email ?? u.discordUsername ?? '') : '';
  });

  protected readonly deconnexionEnCours = signal(false);
  protected readonly erreurDeconnexion = signal(false);

  /**
   * Sur la page de connexion, le bouton « Se connecter » mènerait à la page où l'on est déjà :
   * il laisse la place à « Créer un compte ». Calculé depuis l'adresse, donc identique côté
   * serveur et navigateur (pas d'écart à l'hydratation).
   */
  protected readonly surConnexion = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => estPageConnexion(this.router.url)),
    ),
    { initialValue: estPageConnexion(this.router.url) },
  );

  protected async deconnecter(): Promise<void> {
    if (this.deconnexionEnCours()) return;
    this.deconnexionEnCours.set(true);
    this.erreurDeconnexion.set(false);
    try {
      await this.compte.deconnecter();
    } catch {
      this.erreurDeconnexion.set(true);
      return;
    } finally {
      this.deconnexionEnCours.set(false);
    }
    // Une page connectée affichée sans session n'a plus de sens : retour à l'accueil. Sur une
    // page publique, on reste où l'on est.
    if (estPageConnectee(this.router.url)) await this.router.navigateByUrl('/');
  }
}
