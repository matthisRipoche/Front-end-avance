import { convertToParamMap } from '@angular/router';

import type { FaceJouee } from '../../../modeles/mes-maps';
import { FILTRES_PAR_DEFAUT, type Filtres, appliquer, filtreActif, lireFiltres } from './filtres';

// Données fictives, dans l'ordre où le serveur les envoie (dernière partie décroissante).
const face = (sid: string, side: FaceJouee['side'], nom: string, tentatives: number, mod = 'Celeste'): FaceJouee => ({
  sid,
  side,
  nom,
  mod,
  tentatives,
  deathless: 0,
  dernierePartie: 0,
});

const FACES: FaceJouee[] = [
  face('Celeste/1-ForsakenCity', 'B', 'Forsaken City', 412),
  face('StrawberryJam2021/1-Beginner/eclat', 'A', 'Éclat', 30, 'StrawberryJam2021'),
  face('Celeste/2-OldSite', 'A', 'Old Site', 96),
  face('Celeste/1-ForsakenCity', 'A', 'Forsaken City', 96),
  face('Celeste/0-Prologue', 'A', 'prologue', 5),
];

const filtres = (f: Partial<Filtres>): Filtres => ({ ...FILTRES_PAR_DEFAUT, ...f });
const cles = (faces: FaceJouee[]) => faces.map((f) => `${f.nom} ${f.side}`);

describe('lireFiltres', () => {
  it('donne les valeurs par défaut sans paramètre', () => {
    expect(lireFiltres(convertToParamMap({}))).toEqual({ tri: 'recentes', mod: null, q: '' });
  });

  it('lit le tri, le mod et la recherche', () => {
    expect(lireFiltres(convertToParamMap({ tri: 'alpha', mod: 'Celeste', q: 'old' }))).toEqual({
      tri: 'alpha',
      mod: 'Celeste',
      q: 'old',
    });
  });

  it('revient au tri par défaut pour un tri inconnu', () => {
    expect(lireFiltres(convertToParamMap({ tri: 'hasard' })).tri).toBe('recentes');
  });

  it('ignore un mod vide', () => {
    expect(lireFiltres(convertToParamMap({ mod: '' })).mod).toBeNull();
  });
});

describe('filtreActif', () => {
  it('ne compte ni le tri ni une recherche faite d’espaces', () => {
    expect(filtreActif(filtres({ tri: 'alpha', q: '   ' }))).toBe(false);
  });

  it('compte la recherche et le mod', () => {
    expect(filtreActif(filtres({ q: 'old' }))).toBe(true);
    expect(filtreActif(filtres({ mod: 'Celeste' }))).toBe(true);
  });
});

describe('appliquer', () => {
  it('garde l’ordre du serveur pour les plus récentes', () => {
    expect(cles(appliquer(FACES, filtres({})))).toEqual([
      'Forsaken City B',
      'Éclat A',
      'Old Site A',
      'Forsaken City A',
      'prologue A',
    ]);
  });

  it('trie par tentatives décroissantes, ex aequo par SID puis par face', () => {
    expect(cles(appliquer(FACES, filtres({ tri: 'travaillees' })))).toEqual([
      'Forsaken City B',
      // 96 tentatives chacune : « Celeste/1-… » passe avant « Celeste/2-… ».
      'Forsaken City A',
      'Old Site A',
      'Éclat A',
      'prologue A',
    ]);
  });

  it('trie par nom sans tenir compte de la casse ni des accents, ex aequo par face', () => {
    expect(cles(appliquer(FACES, filtres({ tri: 'alpha' })))).toEqual([
      'Éclat A',
      'Forsaken City A',
      'Forsaken City B',
      'Old Site A',
      'prologue A',
    ]);
  });

  it('cherche dans le nom sans tenir compte de la casse ni des accents', () => {
    expect(cles(appliquer(FACES, filtres({ q: 'ECLAT' })))).toEqual(['Éclat A']);
    expect(cles(appliquer(FACES, filtres({ q: ' forsaken ' })))).toEqual(['Forsaken City B', 'Forsaken City A']);
  });

  it('filtre par mod', () => {
    expect(cles(appliquer(FACES, filtres({ mod: 'StrawberryJam2021' })))).toEqual(['Éclat A']);
  });

  // La page ne transmet jamais un mod absent des données (il vaut « Tous les mods ») ; `appliquer`
  // reste strict si on le lui passe quand même.
  it('ne garde rien pour un mod absent de la liste', () => {
    expect(appliquer(FACES, filtres({ mod: 'Inconnu' }))).toEqual([]);
  });

  it('ne modifie pas la liste reçue', () => {
    const copie = [...FACES];
    appliquer(FACES, filtres({ tri: 'alpha' }));
    expect(FACES).toEqual(copie);
  });
});
