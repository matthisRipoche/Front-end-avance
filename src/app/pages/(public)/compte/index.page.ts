import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { Compte } from '../../../auth/compte';
import { connexionRequise } from '../../../auth/connexion-requise';
import { Session } from '../../../auth/session';

export const routeMeta = {
  title: 'Compte · Celeste Death Tracker',
  meta: [{ name: 'robots', content: 'noindex' }],
  // Page connectée : aussi listée dans PAGES_CONNECTEES (session-contrat.ts). Jamais prérendue.
  // Aucun résolveur : tout vient du service Session, déjà rempli par le serveur.
  canActivate: [connexionRequise],
} satisfies RouteMeta;

/** Compte du joueur connecté : qui il est, et la déconnexion (la barre mobile n’a pas de menu compte). */
@Component({
  selector: 'app-compte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class ComptePage {
  private readonly router = inject(Router);
  private readonly compte = inject(Compte);

  protected readonly utilisateur = inject(Session).utilisateur;

  /** Nom affiché : l’email, ou le pseudo Discord pour un compte créé par Discord. */
  protected readonly nom = computed(() => {
    const u = this.utilisateur();
    return u ? (u.email ?? u.discordUsername ?? '') : '';
  });

  protected readonly deconnexionEnCours = signal(false);
  protected readonly erreurDeconnexion = signal(false);

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
    await this.router.navigateByUrl('/');
  }
}
