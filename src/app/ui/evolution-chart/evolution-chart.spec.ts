import { TestBed } from '@angular/core/testing';

import { EvolutionChart, PointGraphique } from './evolution-chart';

const MIN = 60_000;

describe('EvolutionChart', () => {
  const render = (points: PointGraphique[]) => {
    const fixture = TestBed.createComponent(EvolutionChart);
    fixture.componentRef.setInput('points', points);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const libelles = (host: HTMLElement) =>
    [...host.querySelectorAll('.cdt-chart__tick span')].map((s) => s.textContent);

  it('garde une échelle de 5 minutes avec un repère par minute', () => {
    const host = render([{ id: 1, dureeMs: 2 * MIN, issue: 'chute' }]);
    expect(libelles(host)).toEqual(['0:00', '1:00', '2:00', '3:00', '4:00', '5:00']);
    expect(host.querySelectorAll('.cdt-chart__grid').length).toBe(6);
    const bas = [...host.querySelectorAll<HTMLElement>('.cdt-chart__tick')].map((t) => t.style.bottom);
    expect(bas[0]).toBe('0%');
    expect(bas[5]).toBe('100%');
    expect(host.querySelector<HTMLElement>('.cdt-chart__bar')?.style.height).toBe('40%');
  });

  it('agrandit l’échelle à la minute supérieure d’une longue durée', () => {
    const host = render([{ id: 1, dureeMs: 5 * MIN + 1000, issue: 'abandon' }]);
    expect(libelles(host)).toEqual(['0:00', '1:00', '2:00', '3:00', '4:00', '5:00', '6:00']);
    expect(host.querySelector<HTMLElement>('.cdt-chart__bar')?.style.height).toContain('83.6');
  });

  it('se limite à 5 repères au-delà de 6 minutes', () => {
    const host = render([{ id: 1, dureeMs: 10 * MIN, issue: 'chute' }]);
    expect(libelles(host)).toEqual(['0:00', '3:00', '5:00', '8:00', '10:00']);
    expect(host.querySelector<HTMLElement>('.cdt-chart__bar')?.style.height).toBe('100%');
  });

  it('pose une classe par issue et un marqueur seulement sur le deathless', () => {
    const host = render([
      { id: 1, dureeMs: MIN, issue: 'chute' },
      { id: 2, dureeMs: MIN, issue: 'abandon' },
      { id: 3, dureeMs: 3 * MIN, issue: 'deathless' },
    ]);
    expect(host.querySelectorAll('.cdt-chart__col--chute').length).toBe(1);
    expect(host.querySelectorAll('.cdt-chart__col--abandon').length).toBe(1);
    expect(host.querySelectorAll('.cdt-chart__col--deathless').length).toBe(1);
    expect(host.querySelectorAll('.cdt-chart__marker').length).toBe(1);
    expect(host.querySelector('.cdt-chart__col--deathless .cdt-chart__marker')).not.toBeNull();
  });

  it('donne un titre à chaque colonne', () => {
    const host = render([{ id: 29, dureeMs: 2 * MIN + 48_000, issue: 'chute' }]);
    expect(host.querySelector('.cdt-chart__col')?.getAttribute('title')).toBe('Tentative n° 29 : chute, 2:48');
  });

  it('résume le graphique pour les lecteurs d’écran', () => {
    const host = render([
      { id: 1, dureeMs: MIN, issue: 'chute' },
      { id: 2, dureeMs: 4 * MIN + 10_000, issue: 'chute' },
      { id: 3, dureeMs: MIN, issue: 'abandon' },
    ]);
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('3 tentatives : 2 chutes, 1 abandon ; la plus longue a tenu 4:10.');
  });

  it('accorde au singulier et omet les issues absentes', () => {
    const host = render([{ id: 1, dureeMs: 3 * MIN, issue: 'deathless' }]);
    expect(host.getAttribute('aria-label')).toBe('1 tentative : 1 deathless ; la plus longue a tenu 3:00.');
  });

  it('annonce une liste vide, légende toujours affichée', () => {
    const host = render([]);
    expect(host.getAttribute('aria-label')).toBe('Aucune tentative à afficher.');
    expect(host.querySelectorAll('.cdt-chart__col').length).toBe(0);
    const legende = host.querySelector('.cdt-chart__legend')?.textContent ?? '';
    expect(legende).toContain('Chute');
    expect(legende).toContain('Abandon');
    expect(legende).toContain('Deathless');
    expect(host.querySelectorAll('.cdt-chart__swatch').length).toBe(3);
  });
});
