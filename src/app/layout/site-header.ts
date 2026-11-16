import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';

import { estPageConnexion } from '../auth/retour';

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
}
