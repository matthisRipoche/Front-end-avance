import { Component } from '@angular/core';

// Page d'attente : la vraie page d'accueil arrive avec l'issue #8.
@Component({
  selector: 'app-home',
  template: `
    <main class="home">
      <h1 class="t-display">Celeste Death Tracker</h1>
      <p class="t-body">Le compagnon de deathless arrive bientôt.</p>
      <a href="/design-system">Voir le design system</a>
    </main>
  `,
  styles: `
    .home { max-width: 1200px; margin: 0 auto; padding: var(--space-16) max(16px, 4vw); display: flex; flex-direction: column; gap: var(--space-4); }
    h1, p { margin: 0; }
    p { color: var(--ink-muted); }
  `,
})
export default class Home {}
