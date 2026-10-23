import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Pied de page des pages publiques.
@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="footer__inner">
        <p class="t-body-sm footer__note">
          Projet de fan, non officiel. Celeste est une marque d'Extremely OK Games ; aucun élément du jeu n'est
          utilisé ici.
        </p>
        <nav class="footer__links t-body-sm" aria-label="Pied de page">
          <a routerLink="/faq">FAQ</a>
          <a routerLink="/confidentialite">Confidentialité</a>
          <a routerLink="/design-system">Design system</a>
        </nav>
      </div>
    </footer>
  `,
  styles: `
    .footer { border-top: 1px solid var(--border); }
    .footer__inner { max-width: 1200px; margin: 0 auto; padding: var(--space-6) max(16px, 4vw) var(--space-8); display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-4) var(--space-8); }
    .footer__note { margin: 0; max-width: 46em; color: var(--ink-muted); }
    .footer__links { display: flex; flex-wrap: wrap; gap: var(--space-6); }
  `,
})
export class SiteFooter {}
