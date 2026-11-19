import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Session } from '../../auth/session';

// Barre de navigation du compte, en bas de l'écran sur mobile. Le seuil d'affichage est en CSS
// seulement : le serveur ne connaît pas la largeur de l'écran, le HTML rendu est le même partout.
@Component({
  selector: 'app-barre-mobile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './barre-mobile.html',
  styleUrl: './barre-mobile.css',
})
export class BarreMobile {
  /** Le joueur connecté, ou `null` (anonyme ou état inconnu) : alors, aucune barre. */
  protected readonly utilisateur = inject(Session).utilisateur;
}
