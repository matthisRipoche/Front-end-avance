import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { connexionRequise } from '../../../auth/connexion-requise';
import { Session } from '../../../auth/session';

export const routeMeta = {
  title: 'Tableau de bord · Celeste Death Tracker',
  meta: [{ name: 'robots', content: 'noindex' }],
  // Page connectée : aussi listée dans PAGES_CONNECTEES (session-contrat.ts), que le middleware
  // Nitro lit pour rediriger avant le rendu. Jamais prérendue.
  canActivate: [connexionRequise],
} satisfies RouteMeta;

/**
 * Tableau de bord provisoire : il sert à éprouver la vérification de session et la redirection
 * côté serveur, en attendant le vrai tableau de bord (issue #25).
 */
@Component({
  selector: 'app-tableau-de-bord',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class TableauDeBord {
  private readonly utilisateur = inject(Session).utilisateur;

  /** Un compte créé par Discord n'a pas d'email : on affiche alors son pseudo Discord. */
  protected readonly nom = computed(() => {
    const u = this.utilisateur();
    return u?.email ?? u?.discordUsername ?? 'ton compte';
  });
}
