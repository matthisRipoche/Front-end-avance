// @vitest-environment node
import type { FaceSummary } from '../../app/modeles/face';
import { versMesMaps } from './mes-maps';

/** Une face de Spring, avec des valeurs par défaut. */
const face = (champs: Partial<FaceSummary> & Pick<FaceSummary, 'sid'>): FaceSummary => ({
  side: 'A',
  mapName: null,
  attempts: 1,
  clears: 0,
  lastPlayedAt: 1_700_000_000_000,
  ...champs,
});

describe('Mise en forme de « Mes maps »', () => {
  it('recopie les champs de la face sous les noms du contrat', () => {
    const maps = versMesMaps(
      [face({ sid: 'Celeste/1-ForsakenCity', side: 'B', mapName: 'Forsaken City', attempts: 12, clears: 3 })],
      'Europe/Paris',
    );

    expect(maps).toEqual({
      fuseau: 'Europe/Paris',
      faces: [
        {
          sid: 'Celeste/1-ForsakenCity',
          side: 'B',
          nom: 'Forsaken City',
          mod: 'Celeste',
          tentatives: 12,
          deathless: 3,
          dernierePartie: 1_700_000_000_000,
        },
      ],
      mods: [{ nom: 'Celeste', faces: 1 }],
    });
  });

  it('prend le dernier segment du SID quand Spring n’a pas de nom de map', () => {
    const [premiere] = versMesMaps([face({ sid: 'StrawberryJam2021/1-Beginner/maya', mapName: null })], 'UTC').faces;

    expect(premiere.nom).toBe('maya');
  });

  it('ignore un champ ajouté par Spring', () => {
    const avecChampEnTrop = { ...face({ sid: 'Celeste/2-OldSite' }), userId: 7, secret: 'x' } as FaceSummary;

    const [premiere] = versMesMaps([avecChampEnTrop], 'UTC').faces;

    expect(Object.keys(premiere).sort()).toEqual(
      ['deathless', 'dernierePartie', 'mod', 'nom', 'sid', 'side', 'tentatives'].sort(),
    );
  });

  it.each([
    ['Celeste/1-ForsakenCity', 'Celeste'],
    ['StrawberryJam2021/1-Beginner/maya', 'StrawberryJam2021'],
    ['MaMapSeule', 'MaMapSeule'],
  ])('range %s dans le mod %s', (sid, mod) => {
    expect(versMesMaps([face({ sid })], 'UTC').faces[0].mod).toBe(mod);
  });

  it('compte les faces par mod, du plus fourni au moins fourni puis par nom', () => {
    const maps = versMesMaps(
      [
        face({ sid: 'Zeta/a' }),
        face({ sid: 'Celeste/1-ForsakenCity', side: 'A' }),
        face({ sid: 'Celeste/1-ForsakenCity', side: 'B' }),
        face({ sid: 'Alpha/a' }),
        face({ sid: 'StrawberryJam2021/1-Beginner/maya' }),
        face({ sid: 'StrawberryJam2021/1-Beginner/lola' }),
        face({ sid: 'Celeste/2-OldSite' }),
      ],
      'UTC',
    );

    expect(maps.mods).toEqual([
      { nom: 'Celeste', faces: 3 },
      { nom: 'StrawberryJam2021', faces: 2 },
      { nom: 'Alpha', faces: 1 },
      { nom: 'Zeta', faces: 1 },
    ]);
  });

  it('trie par dernière partie décroissante, ex aequo par SID puis par côté', () => {
    const maps = versMesMaps(
      [
        face({ sid: 'Celeste/1-ForsakenCity', side: 'A', lastPlayedAt: 100 }),
        face({ sid: 'Celeste/3-CelestialResort', side: 'B', lastPlayedAt: 300 }),
        face({ sid: 'Celeste/3-CelestialResort', side: 'A', lastPlayedAt: 300 }),
        face({ sid: 'Celeste/2-OldSite', side: 'C', lastPlayedAt: 300 }),
        face({ sid: 'Celeste/4-GoldenRidge', side: 'A', lastPlayedAt: 200 }),
      ],
      'UTC',
    );

    expect(maps.faces.map((f) => `${f.sid} ${f.side}`)).toEqual([
      'Celeste/2-OldSite C',
      'Celeste/3-CelestialResort A',
      'Celeste/3-CelestialResort B',
      'Celeste/4-GoldenRidge A',
      'Celeste/1-ForsakenCity A',
    ]);
  });

  it('renvoie des listes vides pour un joueur qui n’a jamais joué', () => {
    expect(versMesMaps([], 'America/New_York')).toEqual({ fuseau: 'America/New_York', faces: [], mods: [] });
  });
});
