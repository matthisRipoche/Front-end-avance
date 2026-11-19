import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { connexionRequise } from '../../../auth/connexion-requise';
import type { FaceJouee, MesMaps } from '../../../modeles/mes-maps';
import MesMapsPage, { routeMeta } from './index.page';
import { type ResultatMesMaps, chargerMesMaps } from './maps.donnees';

// Données fictives, en ms Unix fixes : 17 novembre 2026, 20:04 UTC = 21:04 à Paris.
const INSTANT = Date.UTC(2026, 10, 17, 20, 4);

const face = (f: Partial<FaceJouee> & Pick<FaceJouee, 'sid' | 'side' | 'nom'>): FaceJouee => ({
  mod: 'Celeste',
  tentatives: 10,
  deathless: 0,
  dernierePartie: INSTANT,
  ...f,
});

// Dans l'ordre du serveur : dernière partie décroissante.
const MES_MAPS: MesMaps = {
  fuseau: 'Europe/Paris',
  faces: [
    face({ sid: 'Celeste/1-ForsakenCity', side: 'B', nom: 'Forsaken City', tentatives: 412 }),
    face({
      sid: 'StrawberryJam2021/1-Beginner/eclat',
      side: 'A',
      nom: 'Éclat',
      mod: 'StrawberryJam2021',
      tentatives: 30,
      deathless: 2,
      dernierePartie: INSTANT - 3_600_000,
    }),
    face({ sid: 'Celeste/2-OldSite', side: 'A', nom: 'Old Site', tentatives: 96, deathless: 1 }),
  ],
  mods: [
    { nom: 'Celeste', faces: 2 },
    { nom: 'StrawberryJam2021', faces: 1 },
  ],
};

const ok = (donnees: MesMaps): ResultatMesMaps => ({ etat: 'ok', donnees });

describe('Mes maps', () => {
  const render = (maps: ResultatMesMaps, query: Record<string, string> = {}) => {
    const params = new BehaviorSubject(convertToParamMap(query));
    TestBed.configureTestingModule({
      imports: [MesMapsPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { data: of({ maps }), queryParamMap: params } },
      ],
    });
    // La navigation est simulée : on vérifie ce que la page demande, et on rejoue l'URL obtenue.
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(MesMapsPage);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const allerA = (q: Record<string, string>) => {
      params.next(convertToParamMap(q));
      fixture.detectChanges();
    };
    return { page, navigate, allerA };
  };

  const texte = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const noms = (page: HTMLElement) => Array.from(page.querySelectorAll('li .cdt-face__name'), (el) => texte(el));
  const bouton = (page: HTMLElement, libelle: string) =>
    Array.from(page.querySelectorAll('button')).find((b) => texte(b) === libelle);

  describe('avec des faces', () => {
    it('affiche le titre et une ligne par face, dans l’ordre du serveur', () => {
      const { page } = render(ok(MES_MAPS));
      expect(texte(page.querySelector('h1'))).toBe('Mes maps');
      expect(noms(page)).toEqual(['Forsaken City', 'Éclat', 'Old Site']);
      expect(texte(page.querySelector('[aria-live="polite"]'))).toBe('3 faces');
    });

    it('écrit la face en toutes lettres, les tentatives et la date dans le fuseau', () => {
      const ligne = render(ok(MES_MAPS)).page.querySelector('li');
      expect(texte(ligne)).toBe('B Forsaken City Face B · Celeste 412 tentatives aucun deathless 17 novembre à 21:04');
      // La pastille ne fait que doubler le mot « Face B » : elle n'est pas lue.
      expect(ligne?.querySelector('.cdt-side')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('écrit le deathless en texte, sans pastille dorée', () => {
      const { page } = render(ok(MES_MAPS));
      const lignes = page.querySelectorAll('li');
      expect(texte(lignes[1])).toContain('2 deathless');
      expect(texte(lignes[2])).toContain('1 deathless');
      expect(page.querySelector('.cdt-result--deathless')).toBeNull();
    });

    it('écrit l’année des dates qui ne sont pas de l’année de la partie la plus récente', () => {
      const ancienne = Date.UTC(2025, 10, 17, 20, 4);
      const { page } = render(
        ok({ ...MES_MAPS, faces: [MES_MAPS.faces[0], { ...MES_MAPS.faces[2], dernierePartie: ancienne }] }),
      );
      const lignes = page.querySelectorAll('li');
      expect(texte(lignes[0])).toContain('17 novembre à 21:04');
      expect(texte(lignes[1])).toContain('17 novembre 2025 à 21:04');
    });

    it('mène chaque face à son détail, par des paramètres dans l’ordre sid puis side', () => {
      const liens = Array.from(render(ok(MES_MAPS)).page.querySelectorAll('li a.cdt-face'));
      expect(liens.map((a) => a.getAttribute('href'))).toEqual([
        '/maps/face?sid=Celeste%2F1-ForsakenCity&side=B',
        '/maps/face?sid=StrawberryJam2021%2F1-Beginner%2Feclat&side=A',
        '/maps/face?sid=Celeste%2F2-OldSite&side=A',
      ]);
    });

    it('garde un href correct pour un SID avec espace, plus, esperluette et accent', () => {
      const sid = 'Mod/a b+c&d/é';
      const { page } = render(ok({ ...MES_MAPS, faces: [face({ sid, side: 'C', nom: 'Bizarre' })] }));
      const href = page.querySelector('li a')?.getAttribute('href') ?? '';
      expect(href).toBe('/maps/face?sid=Mod%2Fa%20b%2Bc%26d%2F%C3%A9&side=C');
      const params = new URL(href, 'http://x').searchParams;
      expect(params.get('sid')).toBe(sid);
      expect(params.get('side')).toBe('C');
    });

    it('donne au lien un nom accessible qui dit la face', () => {
      const lien = render(ok(MES_MAPS)).page.querySelector('li a');
      expect(texte(lien)).toContain('Forsaken City Face B');
      expect(lien?.hasAttribute('aria-label')).toBe(false);
    });

    it('propose les mods joués, avec leur nombre de faces', () => {
      const select = render(ok(MES_MAPS)).page.querySelector<HTMLSelectElement>('select#maps-mod');
      expect(Array.from(select?.options ?? [], (o) => texte(o))).toEqual([
        'Tous les mods',
        'Celeste (2)',
        'StrawberryJam2021 (1)',
      ]);
      expect(select?.value).toBe('');
      expect(texte(document.querySelector('label[for="maps-mod"]'))).toBe('Mod');
    });
  });

  describe('filtres lus dans l’URL', () => {
    it('trie et filtre selon l’adresse demandée', () => {
      const { page } = render(ok(MES_MAPS), { tri: 'travaillees', mod: 'Celeste' });
      expect(noms(page)).toEqual(['Forsaken City', 'Old Site']);
      expect(texte(page.querySelector('[aria-live="polite"]'))).toBe('2 faces sur 3');
      expect(bouton(page, 'Plus travaillées')?.getAttribute('aria-pressed')).toBe('true');
      expect(bouton(page, 'Récentes')?.getAttribute('aria-pressed')).toBe('false');
      const select = page.querySelector<HTMLSelectElement>('select#maps-mod');
      expect(select?.value).toBe('Celeste');
      // Écrit dans le HTML, pour que le rendu serveur montre déjà le bon choix.
      expect(select?.querySelector('option[selected]')?.textContent).toContain('Celeste (2)');
    });

    it('cherche sans tenir compte des accents et garde le texte dans le champ', () => {
      const { page } = render(ok(MES_MAPS), { q: 'eclat', tri: 'alpha' });
      expect(noms(page)).toEqual(['Éclat']);
      expect(page.querySelector<HTMLInputElement>('input#maps-q')?.value).toBe('eclat');
    });

    it('suit les changements d’URL sans recharger les données', () => {
      const { page, allerA } = render(ok(MES_MAPS));
      allerA({ tri: 'alpha' });
      expect(noms(page)).toEqual(['Éclat', 'Forsaken City', 'Old Site']);
    });

    it('revient au tri par défaut pour un tri inconnu', () => {
      const { page } = render(ok(MES_MAPS), { tri: 'hasard' });
      expect(noms(page)).toEqual(['Forsaken City', 'Éclat', 'Old Site']);
      expect(bouton(page, 'Récentes')?.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('interactions', () => {
    const options = { queryParamsHandling: 'merge', replaceUrl: true };

    it('écrit le tri dans l’URL, et le retire pour le tri par défaut', () => {
      const { page, navigate } = render(ok(MES_MAPS), { tri: 'alpha' });
      bouton(page, 'Plus travaillées')?.click();
      expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { tri: 'travaillees' }, ...options });
      bouton(page, 'Récentes')?.click();
      expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { tri: null }, ...options });
    });

    it('écrit la recherche dans l’URL, et la retire quand le champ est vidé', () => {
      const { page, navigate } = render(ok(MES_MAPS));
      const champ = page.querySelector<HTMLInputElement>('input#maps-q')!;
      champ.value = 'old';
      champ.dispatchEvent(new Event('input'));
      expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { q: 'old' }, ...options });
      champ.value = '';
      champ.dispatchEvent(new Event('input'));
      expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { q: null }, ...options });
    });

    it('écrit le mod dans l’URL, et le retire pour « Tous les mods »', () => {
      const { page, navigate } = render(ok(MES_MAPS));
      const select = page.querySelector<HTMLSelectElement>('select#maps-mod')!;
      select.value = 'StrawberryJam2021';
      select.dispatchEvent(new Event('change'));
      expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { mod: 'StrawberryJam2021' }, ...options });
      select.value = '';
      select.dispatchEvent(new Event('change'));
      expect(navigate).toHaveBeenLastCalledWith([], { queryParams: { mod: null }, ...options });
    });
  });

  describe('aucun résultat', () => {
    it('propose d’effacer les filtres, qui garde le tri', () => {
      const { page, navigate } = render(ok(MES_MAPS), { q: 'summit', tri: 'alpha' });
      expect(page.querySelector('li')).toBeNull();
      expect(texte(page)).toContain('Aucune face ne correspond');
      expect(texte(page.querySelector('[aria-live="polite"]'))).toBe('0 face sur 3');
      bouton(page, 'Effacer les filtres')?.click();
      expect(navigate).toHaveBeenLastCalledWith([], {
        queryParams: { mod: null, q: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    it('traite un mod inconnu comme « Tous les mods »', () => {
      const { page } = render(ok(MES_MAPS), { mod: 'Inconnu' });
      expect(noms(page)).toEqual(['Forsaken City', 'Éclat', 'Old Site']);
      expect(texte(page.querySelector('[aria-live="polite"]'))).toBe('3 faces');
      const select = page.querySelector<HTMLSelectElement>('select#maps-mod');
      expect(select?.value).toBe('');
      expect(texte(select?.querySelector('option[selected]'))).toBe('Tous les mods');
      expect(Array.from(select?.options ?? [], (o) => texte(o))).not.toContain('Inconnu (aucune face)');
    });
  });

  describe('aucune face jouée', () => {
    it('renvoie vers la page du mod, sans recherche ni filtre', () => {
      const { page } = render(ok({ ...MES_MAPS, faces: [], mods: [] }));
      expect(texte(page)).toContain('Aucune face jouée pour l’instant');
      expect(page.querySelector('a[href="/mod"]')?.textContent).toContain('Voir comment installer le mod');
      expect(page.querySelector('input, select')).toBeNull();
      expect(bouton(page, 'Effacer les filtres')).toBeUndefined();
    });
  });

  describe('API en panne', () => {
    it('affiche l’alerte et un lien pour réessayer', () => {
      const { page } = render({ etat: 'erreur', statut: 503 });
      const alerte = page.querySelector('[role="alert"]');
      expect(texte(alerte)).toContain('Les données ne répondent pas pour l’instant.');
      expect(alerte?.querySelector('a[href="/maps"]')?.textContent).toContain('Réessayer');
      expect(page.querySelector('ul, input')).toBeNull();
    });

    it('n’affiche pas l’alerte pour une session expirée, déjà redirigée', () => {
      const { page } = render({ etat: 'erreur', statut: 401 });
      expect(page.querySelector('[role="alert"]')).toBeNull();
      expect(texte(page.querySelector('h1'))).toBe('Mes maps');
    });
  });

  it('est réservée aux joueurs connectés, non indexée, et chargée par le résolveur', () => {
    expect(routeMeta.title).toBe('Mes maps · Celeste Death Tracker');
    expect(routeMeta.canActivate).toContain(connexionRequise);
    expect(routeMeta.meta).toContainEqual({ name: 'robots', content: 'noindex' });
    expect(routeMeta.resolve.maps).toBe(chargerMesMaps);
  });
});
