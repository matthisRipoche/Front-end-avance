import { afterNextRender, Component, DOCUMENT, inject, signal } from '@angular/core';
import { RouteMeta } from '@analogjs/router';

import {
  COLOR_GROUPS,
  RADII,
  SAMPLE_ROOMS,
  SPACING,
  TYPE_STYLES,
} from './design-system.data';

export const routeMeta: RouteMeta = {
  title: 'Design system · Celeste Death Tracker',
  meta: [
    {
      name: 'description',
      content: 'Couleurs, typographie, espacements et composants du site Celeste Death Tracker.',
    },
  ],
};

type Theme = 'system' | 'dark' | 'light';

@Component({
  selector: 'app-design-system',
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class DesignSystemPage {
  private readonly document = inject(DOCUMENT);

  protected readonly colorGroups = COLOR_GROUPS;
  protected readonly typeStyles = TYPE_STYLES;
  protected readonly spacing = SPACING;
  protected readonly radii = RADII;
  protected readonly rooms = SAMPLE_ROOMS;
  protected readonly maxStops = Math.max(...SAMPLE_ROOMS.map((room) => room.stops));
  protected readonly reach = Array.from({ length: 12 }, (_, i) => (i < 5 ? 'done' : i === 5 ? 'fall' : 'todo'));
  protected readonly themes: { id: Theme; label: string }[] = [
    { id: 'system', label: 'Système' },
    { id: 'dark', label: 'Sombre' },
    { id: 'light', label: 'Clair' },
  ];

  protected readonly theme = signal<Theme>('system');
  // Valeurs des variables CSS dans le thème actif, lues dans le navigateur après le rendu.
  protected readonly values = signal<Record<string, string>>({});

  constructor() {
    afterNextRender(() => this.readValues());
  }

  protected setTheme(theme: Theme): void {
    const root = this.document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    this.theme.set(theme);
    this.readValues();
  }

  private readValues(): void {
    const styles = getComputedStyle(this.document.documentElement);
    const names = [...this.colorGroups.flatMap((group) => group.tokens.map((token) => token.name)), ...this.spacing];
    this.values.set(Object.fromEntries(names.map((name) => [name, styles.getPropertyValue(`--${name}`).trim()])));
  }
}
