import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

const DESCRIPTION =
  "Ce que le mod Everest de Celeste Death Tracker enregistre, et comment l'installer à la main en attendant sa publication.";

export const routeMeta = {
  title: 'Le mod · Celeste Death Tracker',
  meta: [
    { name: 'description', content: DESCRIPTION },
    { property: 'og:title', content: 'Le mod Celeste Death Tracker' },
    { property: 'og:description', content: DESCRIPTION },
    { property: 'og:type', content: 'website' },
  ],
} satisfies RouteMeta;

// Page du mod : un composant plutôt qu'un .md, parce que la mise en page (colonnes, cartes
// d'étapes, emplacements d'image) ne s'écrit pas en Markdown. Elle reste prérendue (vite.config.ts).
@Component({
  selector: 'app-mod',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class Mod {}
