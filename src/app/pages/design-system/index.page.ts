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
  template: `
    <div class="page">
      <header class="top">
        <nav class="cdt-nav" aria-label="Navigation principale">
          <a class="cdt-nav__brand" href="/">Celeste Death Tracker</a>
          <div class="cdt-tabs" role="group" aria-label="Thème">
            @for (option of themes; track option.id) {
              <button
                class="cdt-tabs__tab"
                type="button"
                [attr.aria-pressed]="theme() === option.id"
                (click)="setTheme(option.id)"
              >
                {{ option.label }}
              </button>
            }
          </div>
        </nav>
      </header>

      <main class="content">
        <section class="intro">
          <h1 class="t-display-xl intro__title">Design system</h1>
          <p class="t-body intro__lead">
            Les jetons et les composants du site. Précis pour lire un chiffre d'un coup d'œil, énergique pour
            donner envie de relancer une tentative, arrondi et doux. Sombre d'abord : le site est surtout
            regardé à côté du jeu, le soir.
          </p>
        </section>

        <section class="block" aria-labelledby="couleurs">
          <h2 class="t-display block__title" id="couleurs">Couleurs</h2>
          <p class="t-body block__lead">
            Une couleur de résultat est toujours doublée d'une forme et d'un mot. Les valeurs affichées sont
            celles du thème actif.
          </p>
          @for (group of colorGroups; track group.title) {
            <h3 class="t-heading">{{ group.title }}</h3>
            <div class="swatches">
              @for (token of group.tokens; track token.name) {
                <div class="swatch">
                  <span class="swatch__chip" [style.background]="'var(--' + token.name + ')'"></span>
                  <span class="t-data">{{ token.name }}</span>
                  <span class="t-data swatch__value">{{ values()[token.name] ?? '' }}</span>
                  <span class="t-body-sm swatch__usage">{{ token.usage }}</span>
                </div>
              }
            </div>
          }
        </section>

        <section class="block" aria-labelledby="typographie">
          <h2 class="t-display block__title" id="typographie">Typographie</h2>
          <p class="t-body block__lead">
            Unbounded pour les titres et les chiffres clés, Geist pour le texte, Geist Mono pour les données.
            Polices hébergées par le site.
          </p>
          <div class="type-list">
            @for (style of typeStyles; track style.name) {
              <div class="type-row">
                <div class="type-row__meta">
                  <span class="t-data">{{ style.name }}</span>
                  <span class="t-body-sm swatch__usage">{{ style.usage }}</span>
                </div>
                <p [class]="'t-' + style.name" class="type-row__sample">{{ style.sample }}</p>
              </div>
            }
          </div>
        </section>

        <section class="block" aria-labelledby="mesures">
          <h2 class="t-display block__title" id="mesures">Espacement et formes</h2>
          <div class="measures">
            <div class="cdt-panel">
              <h3 class="cdt-panel__title">Espacement, base 4 px</h3>
              @for (space of spacing; track space) {
                <div class="space-row">
                  <span class="t-data">{{ space }}</span>
                  <span class="space-row__bar" [style.width]="'var(--' + space + ')'"></span>
                  <span class="t-data swatch__value">{{ values()[space] ?? '' }}</span>
                </div>
              }
            </div>
            <div class="cdt-panel">
              <h3 class="cdt-panel__title">Arrondis</h3>
              <div class="radii">
                @for (radius of radii; track radius.name) {
                  <div class="radius">
                    <span class="radius__shape" [style.border-radius]="'var(--' + radius.name + ')'"></span>
                    <span class="t-data">{{ radius.name }}</span>
                    <span class="t-body-sm swatch__usage">{{ radius.usage }}</span>
                  </div>
                }
              </div>
              <p class="t-body-sm swatch__usage">
                Une seule élévation, <code class="t-data">shadow-float</code>, pour ce qui flotte. Les panneaux
                n'ont pas d'ombre.
              </p>
            </div>
          </div>
        </section>

        <section class="block" aria-labelledby="composants">
          <h2 class="t-display block__title" id="composants">Composants</h2>
          <p class="t-body block__lead">Données d'exemple, fictives.</p>

          <div class="components">
            <div class="cdt-panel">
              <h3 class="cdt-panel__title">Boutons</h3>
              <div class="cdt-row">
                <button class="cdt-btn cdt-btn--primary" type="button">Installer le mod</button>
                <button class="cdt-btn cdt-btn--secondary" type="button">Créer un compte</button>
                <button class="cdt-btn cdt-btn--ghost" type="button">Voir toutes les rooms</button>
              </div>
              <div class="cdt-row">
                <button class="cdt-btn cdt-btn--danger cdt-btn--sm" type="button">Supprimer l'appareil</button>
                <button class="cdt-btn cdt-btn--primary cdt-btn--sm" type="button" aria-busy="true">
                  <span class="cdt-spinner" aria-hidden="true"></span>Connexion…
                </button>
              </div>
            </div>

            <div class="cdt-panel">
              <h3 class="cdt-panel__title">Champs</h3>
              <div class="cdt-field">
                <label class="cdt-field__label" for="ds-email">Adresse e-mail</label>
                <input class="cdt-field__input" id="ds-email" type="email" placeholder="toi@exemple.fr" aria-describedby="ds-email-help" />
                <span class="cdt-field__help" id="ds-email-help">Celle de ton compte.</span>
              </div>
              <div class="cdt-field cdt-field--error">
                <label class="cdt-field__label" for="ds-pwd">Mot de passe</label>
                <input class="cdt-field__input" id="ds-pwd" type="password" value="abcdef" aria-invalid="true" aria-describedby="ds-pwd-help" />
                <span class="cdt-field__help" id="ds-pwd-help">Ce mot de passe fait 6 caractères, il en faut au moins 8.</span>
              </div>
            </div>

            <div class="cdt-panel">
              <h3 class="cdt-panel__title">Résultats et faces</h3>
              <div class="cdt-row">
                <span class="cdt-result cdt-result--success">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>
                  Passée
                </span>
                <span class="cdt-result cdt-result--fall">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>
                  Chute en b-05
                </span>
                <span class="cdt-result cdt-result--deathless">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 15c-3-1.4-5.5-4.3-5.5-7.3C2.5 5.6 4 4.5 5.6 4.5c.9 0 1.7.3 2.4.9.7-.6 1.5-.9 2.4-.9 1.6 0 3.1 1.1 3.1 3.2 0 3-2.5 5.9-5.5 7.3z" /><path fill="currentColor" d="M5.2 3.2L8 4.4l2.8-1.2L8 1.2z" /></svg>
                  Deathless
                </span>
              </div>
              <div class="cdt-row">
                <span class="cdt-side" aria-label="Face A">A</span>
                <span class="cdt-side" aria-label="Face B">B</span>
                <span class="cdt-side" aria-label="Face C">C</span>
                <span class="cdt-side cdt-side--lg" aria-label="Face B">B</span>
              </div>
              <a class="cdt-face" href="/design-system#composants">
                <span class="cdt-side" aria-label="Face A">A</span>
                <span class="cdt-face__main">
                  <span class="cdt-face__name">Golden Ridge</span>
                  <span class="cdt-face__meta">48 tentatives · il y a 3 jours</span>
                </span>
                <span class="cdt-face__aside"><span class="t-data">jusqu'à 2-08</span></span>
              </a>
            </div>

            <div class="cdt-panel">
              <h3 class="cdt-panel__title">Chiffres clés</h3>
              <div class="stats">
                <div class="cdt-stat"><span class="cdt-stat__label">Tentatives</span><span class="cdt-stat__value">120</span></div>
                <div class="cdt-stat"><span class="cdt-stat__label">Plus loin</span><span class="cdt-stat__value">b-11</span></div>
                <div class="cdt-stat">
                  <span class="cdt-stat__label">Chute moyenne</span>
                  <span class="cdt-stat__value">b-05</span>
                  <span class="cdt-stat__note cdt-stat__note--up">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
                    +2 rooms
                  </span>
                </div>
              </div>
              <div class="cdt-tabs" role="tablist" aria-label="Période">
                <button class="cdt-tabs__tab" role="tab" type="button" aria-selected="true">7 jours</button>
                <button class="cdt-tabs__tab" role="tab" type="button" aria-selected="false">30 jours</button>
                <button class="cdt-tabs__tab" role="tab" type="button" aria-selected="false">Tout</button>
              </div>
            </div>

            <div class="cdt-panel">
              <h3 class="cdt-panel__title">Où tes tentatives s'arrêtent</h3>
              <div class="cdt-rooms">
                @for (room of rooms; track room.id) {
                  <div class="cdt-rooms__row" [class.cdt-rooms__row--worst]="room.stops === maxStops">
                    <span class="cdt-rooms__id">{{ room.id }}</span>
                    <span class="cdt-rooms__track"><span class="cdt-rooms__bar" [style.width.%]="(room.stops / maxStops) * 100"></span></span>
                    <span class="cdt-rooms__count">{{ room.stops }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="cdt-panel">
              <h3 class="cdt-panel__title">Trajectoire d'une tentative</h3>
              <div class="cdt-reach" style="--rooms: 12" role="img" aria-label="Tentative arrêtée en b-05, sixième room sur douze">
                @for (cell of reach; track $index) {
                  <span class="cdt-reach__cell" [class.cdt-reach__cell--done]="cell === 'done'" [class.cdt-reach__cell--fall]="cell === 'fall'"></span>
                }
              </div>
              <div class="cdt-reach cdt-reach--deathless" style="--rooms: 12" role="img" aria-label="Tentative deathless, douze rooms sur douze">
                @for (cell of reach; track $index) {
                  <span class="cdt-reach__cell"></span>
                }
              </div>
              <div class="cdt-reach__legend"><span>b-00</span><span>b-11</span></div>
            </div>

            <div class="cdt-stack">
              <div class="cdt-alert" role="status">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="8" /><path d="M10 9v5M10 6.2v.1" /></svg>
                <div>
                  <p class="cdt-alert__title">Le mod n'est pas encore publié</p>
                  <p class="cdt-alert__text">Il s'installe à la main : la page du mod explique comment.</p>
                </div>
              </div>
              <div class="cdt-empty">
                <h3 class="cdt-empty__title">Pas encore de tentative</h3>
                <p class="cdt-empty__text">Associe ton jeu à ton compte, puis lance une map.</p>
                <a class="cdt-btn cdt-btn--primary" href="/design-system#composants">Associer mon jeu</a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: `
    .page { max-width: 1200px; margin: 0 auto; padding: var(--space-4) max(16px, 4vw) var(--space-16); }
    .content { display: flex; flex-direction: column; gap: var(--space-16); padding-top: var(--space-12); }
    .intro { display: flex; flex-direction: column; gap: var(--space-4); }
    .intro__title { margin: 0; font-size: clamp(40px, 6vw, 64px); line-height: 1; }
    .intro__lead, .block__lead { margin: 0; max-width: 40em; color: var(--ink-muted); }
    .block { display: flex; flex-direction: column; gap: var(--space-6); }
    .block__title { margin: 0; font-size: clamp(28px, 3.4vw, 40px); }
    h3.t-heading { margin: 0; }
    .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-4); }
    .swatch { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
    .swatch__chip { height: 72px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: var(--space-2); }
    .swatch__value, .swatch__usage { color: var(--ink-muted); }
    .type-list { display: flex; flex-direction: column; }
    .type-row { display: grid; grid-template-columns: minmax(0, 240px) minmax(0, 1fr); gap: var(--space-6); align-items: baseline; padding: var(--space-4) 0; border-top: 1px solid var(--border); }
    .type-row__meta { display: flex; flex-direction: column; gap: var(--space-1); }
    .type-row__sample { margin: 0; overflow-wrap: anywhere; }
    .measures, .components { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: var(--space-4); align-items: start; }
    .space-row { display: grid; grid-template-columns: 80px minmax(0, 1fr) 48px; gap: var(--space-3); align-items: center; }
    .space-row__bar { display: block; height: 12px; border-radius: 4px; background: var(--accent); }
    .radii { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
    .radius { display: flex; flex-direction: column; gap: var(--space-1); }
    .radius__shape { height: 64px; background: var(--surface-raised); border: 1.5px solid var(--border-strong); margin-bottom: var(--space-2); }
    .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4); }
    .cdt-result svg { width: 14px; height: 14px; }
    @media (max-width: 560px) {
      .type-row { grid-template-columns: minmax(0, 1fr); gap: var(--space-2); }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .cdt-nav { flex-wrap: wrap; padding-block: var(--space-3); }
    }
  `,
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
