import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

// Barre de navigation des pages publiques.
@Component({
  selector: 'app-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="header">
      <nav class="cdt-nav" aria-label="Navigation principale">
        <a class="cdt-nav__brand" routerLink="/">Celeste Death Tracker</a>
        <div class="cdt-row header__actions">
          <div class="cdt-nav__links">
            <a class="cdt-nav__link" routerLink="/mod" routerLinkActive #mod="routerLinkActive" [attr.aria-current]="mod.isActive ? 'page' : null">Le mod</a>
            <a class="cdt-nav__link" routerLink="/faq" routerLinkActive #faq="routerLinkActive" [attr.aria-current]="faq.isActive ? 'page' : null">FAQ</a>
          </div>
          <a class="cdt-btn cdt-btn--primary cdt-btn--sm" routerLink="/login">Se connecter</a>
        </div>
      </nav>
    </header>
  `,
  styles: `
    .header { max-width: 1200px; margin: 0 auto; padding: var(--space-4) max(16px, 4vw) 0; }
    .header__actions { gap: var(--space-2); }
    @media (max-width: 560px) {
      .cdt-nav { flex-wrap: wrap; padding-block: var(--space-3); }
    }
  `,
})
export class SiteHeader {}
