import { Title } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { connexionRequise } from '../../../../auth/connexion-requise';
import type { DetailFace, PointEvolution } from '../../../../modeles/detail-face';
import DetailFacePage, { routeMeta } from './index.page';
import { type ResultatFace, chargerDetailFace } from './face.donnees';

// 19 novembre 2026, 20:42 UTC = 21:42 à Paris.
const MAINTENANT = Date.UTC(2026, 10, 19, 20, 42);

const evolution = (n: number): PointEvolution[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    debut: MAINTENANT - (n - 1 - i) * 3_600_000,
    dureeMs: 60_000 + i * 1000,
    issue: 'chute' as const,
  }));

const DETAIL = (n = 60, surcharge: Partial<DetailFace> = {}): DetailFace => ({
  fuseau: 'Europe/Paris',
  aujourdhui: '2026-11-19',
  sid: 'Celeste/1-ForsakenCity',
  side: 'B',
  nom: 'Forsaken City',
  mod: 'Celeste',
  dernierePartie: MAINTENANT,
  tentatives: n,
  tentativesSemaine: 12,
  deathless: 3,
  tauxDeathless: 0.05,
  meilleurDeathlessMs: 185_000,
  tenueMaxMs: 240_000,
  tenueMaxRoom: 'b-09',
  rooms: [
    { room: 'b-00', arrets: 1, morts: 2 },
    { room: 'b-01', arrets: 4, morts: 6 },
    { room: 'b-02', arrets: 4, morts: 5 },
  ],
  evolution: evolution(n),
  recentes: [
    { id: n, debut: MAINTENANT, issue: 'chute', dureeMs: 90_000, roomFin: 'b-01', roomsFranchies: 1, morts: 3 },
    { id: n - 1, debut: MAINTENANT - 86_400_000, issue: 'deathless', dureeMs: 185_000, roomFin: null, roomsFranchies: 3, morts: 0 },
  ],
  ...surcharge,
});

describe('Détail d’une face', () => {
  const render = (face: ResultatFace) => {
    TestBed.configureTestingModule({
      imports: [DetailFacePage],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { data: of({ face }) } }],
    });
    const fixture = TestBed.createComponent(DetailFacePage);
    fixture.detectChanges();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  };
  const ok = (n = 60, surcharge: Partial<DetailFace> = {}): ResultatFace => ({ etat: 'ok', donnees: DETAIL(n, surcharge) });
  const colonnes = (page: HTMLElement) => page.querySelectorAll('.cdt-chart__col').length;

  it('affiche l’en-tête, les chiffres clés et pose le titre', () => {
    const { page } = render(ok());
    expect(page.querySelector('h1')?.textContent).toBe('Forsaken City');
    expect(page.querySelector('.cdt-side')?.getAttribute('aria-label')).toBe('Face B');
    expect(page.textContent).toContain('Celeste · dernière partie 19 novembre à 21:42');
    expect(page.textContent).toContain('dont 12 ces 7 derniers jours');
    expect(page.textContent).toContain('5 % des tentatives');
    expect(page.textContent).toContain('03:05');
    expect(page.textContent).toContain('jusqu’à b-09');
    expect(TestBed.inject(Title).getTitle()).toBe('Forsaken City · Face B · Celeste Death Tracker');
  });

  it('met l’évolution avant la répartition par room et les dernières tentatives', () => {
    const titres = Array.from(render(ok()).page.querySelectorAll('h2')).map((h) => h.textContent);
    expect(titres).toEqual(['Ton évolution', 'Où tes tentatives s’arrêtent', 'Dernières tentatives']);
  });

  it('a un seul groupe d’onglets et change le nombre de colonnes au clic', () => {
    const { fixture, page } = render(ok(60));
    expect(page.querySelectorAll('.cdt-tabs')).toHaveLength(1);
    const boutons = Array.from(page.querySelectorAll<HTMLButtonElement>('.cdt-tabs__tab'));
    expect(boutons.map((b) => b.textContent?.trim())).toEqual(['20 dernières', '50 dernières', 'Toutes']);
    expect(boutons[0].getAttribute('aria-pressed')).toBe('true');
    expect(colonnes(page)).toBe(20);
    boutons[1].click();
    fixture.detectChanges();
    expect(colonnes(page)).toBe(50);
    boutons[2].click();
    fixture.detectChanges();
    expect(colonnes(page)).toBe(60);
    expect(boutons[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('masque les onglets sous 21 tentatives', () => {
    const { page } = render(ok(5));
    expect(page.querySelector('.cdt-tabs')).toBeNull();
    expect(colonnes(page)).toBe(5);
  });

  it('écrit les repères de rang, avec « aujourd’hui » si le dernier point est du jour', () => {
    const reperes = render(ok(60)).page.querySelector('.face__reperes')?.textContent ?? '';
    expect(reperes).toContain('n° 41');
    expect(reperes).toMatch(/n° 60\s*·\s*aujourd’hui/);
  });

  it('n’écrit pas « aujourd’hui » si le dernier point est plus ancien', () => {
    const reperes = render(ok(30, { aujourdhui: '2026-11-25' })).page.querySelector('.face__reperes')?.textContent ?? '';
    expect(reperes).toContain('n° 30');
    expect(reperes).not.toContain('aujourd’hui');
  });

  it('écrit la tendance avec une classe de couleur', () => {
    const { page } = render(ok(60));
    const phrase = page.querySelector('.cdt-stat__note--up');
    expect(phrase?.textContent).toContain('de tenue moyenne sur tes 10 dernières chutes, contre les 10 d’avant');
  });

  const phraseRooms = (page: HTMLElement) => page.querySelector('.face__colonnes .face__texte')?.textContent?.replace(/\s+/g, ' ');

  it('désigne la room qui casse le plus quand elle est seule', () => {
    const rooms = [{ room: 'b-00', arrets: 1, morts: 1 }, { room: 'b-01', arrets: 3, morts: 4 }];
    expect(phraseRooms(render(ok(30, { rooms })).page)).toBe('La room qui casse le plus : b-01, 3 arrêts.');
  });

  it('cite deux rooms à égalité avec « et »', () => {
    expect(phraseRooms(render(ok()).page)).toBe('Les rooms qui cassent le plus : b-01 et b-02, 4 arrêts chacune.');
  });

  it('cite trois rooms à égalité, dans l’ordre de la map', () => {
    const rooms = ['b-02', 'b-05', 'b-08'].map((room) => ({ room, arrets: 2, morts: 3 }));
    expect(phraseRooms(render(ok(30, { rooms })).page)).toBe('Les rooms qui cassent le plus : b-02, b-05 et b-08, 2 arrêts chacune.');
  });

  it('écrit l’année de la dernière partie quand elle diffère de celle d’aujourd’hui', () => {
    const en2025 = Date.UTC(2025, 2, 12, 20, 42);
    expect(render(ok(30, { dernierePartie: en2025 })).page.textContent).toContain('dernière partie 12 mars 2025 à 21:42');
  });

  it('n’écrit pas l’année de la dernière partie dans l’année d’aujourd’hui', () => {
    expect(render(ok(30)).page.textContent).not.toMatch(/dernière partie \d+ \S+ 2026/);
  });

  it('pose white-space: nowrap sur le lien de retour via la classe face__retour', () => {
    // jsdom ne mesure pas le rendu : on vérifie seulement la classe qui porte la règle du CSS.
    expect(render(ok()).page.querySelector('a[href="/maps"]')?.classList.contains('face__retour')).toBe(true);
  });

  it('remet l’onglet actif à « 20 » quand l’onglet choisi n’existe plus', () => {
    const data = new BehaviorSubject({ face: ok(100) });
    TestBed.configureTestingModule({
      imports: [DetailFacePage],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { data } }],
    });
    const fixture = TestBed.createComponent(DetailFacePage);
    const page = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    page.querySelectorAll<HTMLButtonElement>('.cdt-tabs__tab')[1].click();
    fixture.detectChanges();
    expect(colonnes(page)).toBe(50);

    data.next({ face: ok(30) });
    fixture.detectChanges();
    const boutons = Array.from(page.querySelectorAll<HTMLButtonElement>('.cdt-tabs__tab'));
    expect(boutons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect(colonnes(page)).toBe(20);

    data.next({ face: ok(10) });
    fixture.detectChanges();
    expect(page.querySelector('.cdt-tabs')).toBeNull();
    expect(colonnes(page)).toBe(10);
  });

  it('dit qu’il n’y a aucun arrêt', () => {
    const rooms = [{ room: 'b-00', arrets: 0, morts: 0 }];
    expect(render(ok(30, { rooms })).page.textContent).toContain('Aucun arrêt pour l’instant.');
  });

  it('liste les dernières tentatives avec date, étiquette et durée', () => {
    const items = render(ok()).page.querySelectorAll('.face__recentes li');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Aujourd’hui, 21:42');
    expect(items[0].textContent).toContain('chute en b-01');
    expect(items[0].textContent).toContain('01:30');
    expect(items[1].textContent).toContain('Hier, 21:42');
    expect(items[1].querySelector('.cdt-result--deathless')).not.toBeNull();
  });

  it('a un lien de retour vers /maps', () => {
    expect(render(ok()).page.querySelector('a[href="/maps"]')?.textContent).toContain('Mes maps');
  });

  it('affiche l’état vide avec un lien vers /mod', () => {
    const { page } = render({ etat: 'vide' });
    expect(page.querySelector('h1')?.textContent).toBe('Détail d’une face');
    expect(page.querySelector('.cdt-empty__title')?.textContent).toBe('Pas encore de tentative sur cette face');
    expect(page.querySelector('a[href="/mod"]')?.textContent).toContain('Voir comment installer le mod');
    expect(page.querySelector('.cdt-tabs')).toBeNull();
  });

  it('affiche l’alerte d’erreur avec « Réessayer »', () => {
    const { page } = render({ etat: 'erreur', statut: 503 });
    const alerte = page.querySelector('[role="alert"]');
    expect(alerte?.textContent).toContain('Impossible de charger cette face');
    expect(alerte?.textContent).toContain('Réessayer');
  });

  it('affiche le message d’adresse invalide avec un lien vers /maps', () => {
    const { page } = render({ etat: 'invalide' });
    expect(page.textContent).toContain('Cette adresse ne désigne aucune face.');
    expect(page.querySelectorAll('a[href="/maps"]').length).toBeGreaterThan(0);
  });

  it('ne lit jamais l’horloge pendant le rendu', () => {
    const maintenant = vi.spyOn(Date, 'now');
    render(ok());
    expect(maintenant).not.toHaveBeenCalled();
    maintenant.mockRestore();
  });

  it('configure la route : garde, résolveur, rechargement sur la query, noindex', () => {
    expect(routeMeta.canActivate).toEqual([connexionRequise]);
    expect(routeMeta.resolve.face).toBe(chargerDetailFace);
    expect(routeMeta.runGuardsAndResolvers).toBe('paramsOrQueryParamsChange');
    expect(routeMeta.meta).toContainEqual({ name: 'robots', content: 'noindex' });
  });
});
