import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { injectContent, MarkdownComponent } from '@analogjs/content';
import { RouteMeta } from '@analogjs/router';


// FAQ : le texte vit dans src/content/faq.md ; la page le charge et l'affiche.
// Générée au build (prérendu, voir vite.config.ts).
const DESCRIPTION =
  'Ce que fait Celeste Death Tracker, ce que le mod enregistre, et comment commencer.';

export const routeMeta = {
  title: 'Questions fréquentes',
  meta: [
    { name: 'description', content: DESCRIPTION },
    { property: 'og:title', content: 'FAQ' },
    { property: 'og:description', content: DESCRIPTION },
    { property: 'og:type', content: 'website' },
  ],
} satisfies RouteMeta;

@Component({
  selector: 'app-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, MarkdownComponent],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class Faq {
  // customFilename : l'adresse /faq est fixe, on désigne directement src/content/faq.md
  readonly faq$ = injectContent<{ title: string; description: string }>({ customFilename: 'faq' });
}
