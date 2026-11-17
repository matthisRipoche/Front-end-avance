import { TestBed } from '@angular/core/testing';

import type { Activite } from '../modeles/tableau-de-bord';
import { ActiviteJoursGraphique } from './activite-jours';

// 14 jours, du 2026-11-04 au 2026-11-17 ; tentatives fixées par jour, deathless optionnels.
const activite = (tentatives: number[], deathless: Record<number, number> = {}): Activite => ({
  jours: tentatives.map((t, i) => ({
    jour: `2026-11-${String(4 + i).padStart(2, '0')}`,
    tentatives: t,
    deathless: deathless[i] ?? 0,
  })),
  max: Math.max(0, ...tentatives),
});

describe('ActiviteJoursGraphique', () => {
  const render = (donnees: Activite) => {
    const fixture = TestBed.createComponent(ActiviteJoursGraphique);
    fixture.componentRef.setInput('activite', donnees);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const graphique = (host: HTMLElement) => host.querySelector('[role="img"]');
  const legende = (host: HTMLElement) => host.querySelector('.cdt-activite__legende');

  const hauteurs = (host: HTMLElement) =>
    [...host.querySelectorAll<HTMLElement>('.cdt-activite__barre')].map((b) => b.style.height);

  const quatorze = [0, 2, 4, 0, 8, 1, 0, 0, 3, 6, 0, 2, 5, 4];

  it('dessine une barre par jour', () => {
    expect(render(activite(quatorze)).querySelectorAll('.cdt-activite__barre').length).toBe(14);
  });

  it('donne à chaque barre une hauteur relative au meilleur jour', () => {
    const h = hauteurs(render(activite(quatorze)));
    expect(h[4]).toBe('100%');
    expect(h[2]).toBe('50%');
    expect(h[0]).toBe('0%');
  });

  it('garde toutes les barres à zéro sans aucune tentative', () => {
    const host = render(activite(Array(14).fill(0)));
    expect(hauteurs(host).every((h) => h === '0%')).toBe(true);
    expect(graphique(host)?.getAttribute('aria-label')).toBe('Aucune tentative sur les 14 derniers jours');
  });

  it('distingue le dernier jour, aujourd’hui', () => {
    const host = render(activite(quatorze));
    expect(host.querySelectorAll('.cdt-activite__jour')[13].classList).toContain('cdt-activite__jour--aujourdhui');
    expect(host.querySelectorAll('.cdt-activite__jour--aujourdhui').length).toBe(1);
  });

  it('affiche le numéro du jour tiré de la date', () => {
    const numeros = [...render(activite(quatorze)).querySelectorAll('.cdt-activite__numero')].map(
      (n) => n.textContent?.trim(),
    );
    expect(numeros[0]).toBe('04');
    expect(numeros[13]).toBe('17');
  });

  it('résume l’activité en mots, deathless compris', () => {
    const host = render(activite(quatorze, { 9: 1, 12: 1 }));
    expect(graphique(host)?.getAttribute('aria-label')).toBe(
      '35 tentatives sur les 14 derniers jours, meilleur jour le 8 novembre avec 8 tentatives, 2 deathless',
    );
  });

  it('marque d’un repère les jours avec deathless', () => {
    const reperes = graphique(render(activite(quatorze, { 9: 1 })))!.querySelectorAll('.cdt-activite__repere--deathless');
    expect(reperes.length).toBe(1);
  });

  it('ne parle pas de deathless quand il n’y en a pas', () => {
    expect(graphique(render(activite(quatorze)))?.getAttribute('aria-label')).not.toContain('deathless');
  });

  it('explique le repère par une légende visible quand un jour a des deathless', () => {
    const host = render(activite(quatorze, { 9: 1 }));
    const texte = legende(host)?.textContent?.replace(/\s+/g, ' ').trim();
    expect(texte).toBe('jour avec deathless');
    // Hors du role="img", sinon un lecteur d'écran ne la lirait pas.
    expect(graphique(host)?.contains(legende(host)!)).toBe(false);
    expect(legende(host)?.querySelector('.cdt-activite__repere')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('n’affiche pas de légende sans aucun deathless', () => {
    expect(legende(render(activite(quatorze)))).toBeNull();
  });
});
