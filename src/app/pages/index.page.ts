import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { SiteFooter } from '../layout/site-footer';
import { SiteHeader } from '../layout/site-header';
import { ReachTrack } from '../ui/reach-track';
import { ResultTag } from '../ui/result-tag';
import { RoomBreakdown, RoomStops } from '../ui/room-breakdown';

const DESCRIPTION =
  'Un mod Everest enregistre chaque tentative de deathless sur Celeste. Le site te montre, face par face, jusqu’où tu vas, où tu tombes, et si tu progresses.';

export const routeMeta = {
  title: 'Celeste Death Tracker · ton deathless, tentative par tentative',
  meta: [
    { name: 'description', content: DESCRIPTION },
    { property: 'og:title', content: 'Celeste Death Tracker' },
    { property: 'og:description', content: DESCRIPTION },
    { property: 'og:type', content: 'website' },
  ],
} satisfies RouteMeta;

// Données d'exemple, fictives : la page le dit en toutes lettres.
const ROOMS = ['b-00', 'b-01', 'b-02', 'b-03', 'b-04', 'b-05', 'b-06', 'b-07', 'b-08', 'b-09', 'b-10', 'b-11'];

interface SampleAttempt {
  fallAt: number | null;
  time: string;
}

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SiteHeader, SiteFooter, ReachTrack, ResultTag, RoomBreakdown],
  template: `
    <app-site-header />

    <main>
      <section class="wrap hero">
        <div class="hero__text">
          <h1 class="t-display-xl hero__title">Ton deathless, tentative par tentative.</h1>
          <p class="hero__lead">
            Un mod Everest enregistre chaque tentative pendant que tu joues. Le site te montre, face par face,
            jusqu'où tu vas, où tu tombes, et si tu progresses.
          </p>
          <div class="cdt-row">
            <a class="cdt-btn cdt-btn--primary" routerLink="/mod">Installer le mod</a>
            <a class="cdt-btn cdt-btn--secondary" routerLink="/register">Créer un compte</a>
          </div>
        </div>

        <section class="cdt-panel sample" aria-labelledby="exemple-titre">
          <div class="sample__head">
            <div class="cdt-row">
              <span class="cdt-side cdt-side--lg" aria-label="Face B">B</span>
              <div class="sample__name">
                <h2 class="t-heading" id="exemple-titre">Forsaken City</h2>
                <span class="t-body-sm muted">exemple, données fictives</span>
              </div>
            </div>
          </div>

          <dl class="stats">
            <div class="cdt-stat"><dt class="cdt-stat__label">Tentatives</dt><dd class="cdt-stat__value">120</dd></div>
            <div class="cdt-stat"><dt class="cdt-stat__label">Plus loin</dt><dd class="cdt-stat__value">b-11</dd></div>
            <div class="cdt-stat">
              <dt class="cdt-stat__label">Chute moyenne</dt>
              <dd class="cdt-stat__value">b-05</dd>
              <dd class="cdt-stat__note cdt-stat__note--up">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
                +2 rooms
              </dd>
            </div>
          </dl>

          <div class="attempts">
            <h3 class="t-label muted">Dernières tentatives</h3>
            @for (attempt of attempts; track $index) {
              <div class="attempt">
                @if (attempt.fallAt === null) {
                  <cdt-result-tag kind="deathless">Deathless</cdt-result-tag>
                } @else {
                  <cdt-result-tag kind="fall">Chute en {{ rooms[attempt.fallAt] }}</cdt-result-tag>
                }
                <cdt-reach-track [rooms]="rooms.length" [fallAt]="attempt.fallAt" [fallRoom]="attempt.fallAt === null ? '' : rooms[attempt.fallAt]" />
                <span class="t-data muted attempt__time">{{ attempt.time }}</span>
              </div>
            }
          </div>
        </section>
      </section>

      <div class="wrap">
        <div class="cdt-alert notice" role="status">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="8" /><path d="M10 9v5M10 6.2v.1" /></svg>
          <div>
            <p class="cdt-alert__title">Le mod n'est pas encore publié</p>
            <p class="cdt-alert__text">Il s'installe à la main dans Everest : <a routerLink="/mod">la page du mod</a> explique comment.</p>
          </div>
        </div>
      </div>

      <section class="wrap questions" aria-labelledby="questions-titre">
        <h2 class="t-display section-title" id="questions-titre">Trois questions après chaque session</h2>
        <div class="questions__grid">
          <section class="cdt-panel">
            <h3 class="t-title">Jusqu'où j'arrive ?</h3>
            <p class="muted">Ta meilleure tentative sur la face, room par room.</p>
            <div class="question__demo">
              <cdt-reach-track [rooms]="rooms.length" [fallAt]="10" [fallRoom]="rooms[10]" />
              <div class="cdt-reach__legend"><span>b-00</span><span>chute en b-10</span></div>
            </div>
          </section>

          <section class="cdt-panel">
            <h3 class="t-title">Où ça casse ?</h3>
            <p class="muted">Les rooms qui arrêtent le plus tes tentatives.</p>
            <cdt-room-breakdown class="question__demo" [rooms]="worstRooms" />
          </section>

          <section class="cdt-panel">
            <h3 class="t-title">Est-ce que je progresse ?</h3>
            <p class="muted">Tes dernières tentatives comparées aux premières.</p>
            <div class="cdt-stat question__demo">
              <span class="cdt-stat__label">Chute moyenne, 7 derniers jours</span>
              <span class="cdt-stat__value">b-03 → b-05</span>
              <span class="cdt-stat__note cdt-stat__note--up">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
                +2 rooms en moyenne
              </span>
            </div>
          </section>
        </div>
      </section>

      <section class="wrap steps" aria-labelledby="etapes-titre">
        <h2 class="t-display section-title steps__title" id="etapes-titre">Mise en route</h2>
        <ol class="steps__list">
          <li class="step"><span class="cdt-side step__num" aria-hidden="true">1</span><span><strong>Installe le mod</strong> dans Everest, à la main pour l'instant.</span></li>
          <li class="step"><span class="cdt-side step__num" aria-hidden="true">2</span><span><strong>Associe ton jeu</strong> à ton compte, une seule fois.</span></li>
          <li class="step"><span class="cdt-side step__num" aria-hidden="true">3</span><span><strong>Joue.</strong> Chaque tentative arrive sur le site, rangée par face.</span></li>
        </ol>
      </section>
    </main>

    <app-site-footer />
  `,
  styles: `
    :host { display: block; }
    .wrap { max-width: 1200px; margin: 0 auto; padding-inline: max(16px, 4vw); }
    .muted { color: var(--ink-muted); }
    h2, h3, p, dl, dd { margin: 0; }

    .hero { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-12); padding-block: var(--space-16); }
    .hero__text { flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: var(--space-6); }
    .hero__title { margin: 0; font-size: clamp(40px, 5.6vw, 64px); line-height: 1.02; text-wrap: balance; }
    .hero__lead { max-width: 32em; font-size: 19px; line-height: 28px; color: var(--ink-muted); }

    .sample { flex: 1 1 500px; gap: var(--space-6); }
    .sample__name { display: flex; flex-direction: column; }
    .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4); }
    .attempts { display: flex; flex-direction: column; gap: 14px; }
    .attempt { display: grid; grid-template-columns: 150px minmax(0, 1fr) 52px; gap: 14px; align-items: center; }
    .attempt__time { text-align: right; }

    .notice { max-width: none; }

    .questions { display: flex; flex-direction: column; gap: var(--space-8); padding-block: var(--space-16); }
    .section-title { font-size: clamp(28px, 3.4vw, 40px); line-height: 1.1; text-wrap: balance; }
    .questions__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: var(--space-4); }
    .question__demo { margin-top: auto; }

    .steps { display: flex; flex-wrap: wrap; gap: var(--space-8) var(--space-12); padding-bottom: var(--space-16); }
    .steps__title { flex: 1 1 260px; }
    .steps__list { flex: 2 1 520px; min-width: 0; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--space-2); }
    .step { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); border-radius: var(--radius-md); background: var(--surface); }
    .step__num { background: var(--accent-soft); color: var(--accent); flex: none; }

    @media (max-width: 560px) {
      .hero { padding-block: var(--space-8); }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .attempt { grid-template-columns: minmax(0, 1fr) 52px; }
      .attempt cdt-reach-track { grid-column: 1 / -1; grid-row: 2; }
    }
  `,
})
export default class Home {
  protected readonly rooms = ROOMS;

  protected readonly attempts: SampleAttempt[] = [
    { fallAt: 5, time: '01:12' },
    { fallAt: 8, time: '02:05' },
    { fallAt: null, time: '03:48' },
  ];

  protected readonly worstRooms: RoomStops[] = [
    { id: 'b-05', stops: 31 },
    { id: 'b-03', stops: 21 },
    { id: 'b-06', stops: 12 },
    { id: 'b-08', stops: 10 },
  ];
}
