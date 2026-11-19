import type { PointEvolution } from '../../../../modeles/detail-face';
import { dateTentative, ecartEnMots, fenetre, jourDe, onglets, pireRooms, separateurListe, tendance, veille } from './evolution';

const point = (id: number, dureeMs: number | null, issue: PointEvolution['issue'] = 'chute'): PointEvolution => ({
  id,
  debut: id,
  dureeMs,
  issue,
});

/** Des chutes de durées données (en secondes), de la plus ancienne à la plus récente. */
const chutes = (...secondes: number[]) => secondes.map((s, i) => point(i + 1, s * 1000));

describe('fenetre', () => {
  const points = chutes(1, 2, 3, 4, 5);
  it('garde les plus récentes', () => {
    expect(fenetre(points, 2).map((p) => p.id)).toEqual([4, 5]);
  });
  it('renvoie tout pour null ou une taille plus grande', () => {
    expect(fenetre(points, null)).toHaveLength(5);
    expect(fenetre(points, 20)).toHaveLength(5);
  });
});

describe('onglets', () => {
  const ids = (total: number) => onglets(total).map((o) => o.id);
  it('n’affiche aucun groupe jusqu’à 20 tentatives', () => {
    expect(ids(0)).toEqual([]);
    expect(ids(5)).toEqual([]);
    expect(ids(20)).toEqual([]);
  });
  it('affiche 20 et Toutes de 21 à 50', () => {
    expect(ids(21)).toEqual(['20', 'toutes']);
    expect(ids(50)).toEqual(['20', 'toutes']);
  });
  it('affiche les trois au-delà de 50', () => {
    expect(ids(51)).toEqual(['20', '50', 'toutes']);
    expect(ids(200)).toEqual(['20', '50', 'toutes']);
  });
});

describe('ecartEnMots', () => {
  it('dit les secondes, les minutes et les deux', () => {
    expect(ecartEnMots(45)).toBe('45 s');
    expect(ecartEnMots(120)).toBe('2 min');
    expect(ecartEnMots(75)).toBe('1 min 15');
    expect(ecartEnMots(61)).toBe('1 min 1');
  });
});

describe('tendance', () => {
  it('manque de chutes de 0 à 3', () => {
    for (const n of [0, 1, 2, 3]) {
      const t = tendance(chutes(...Array(n).fill(60)));
      expect(t.sens).toBe('insuffisant');
      expect(t.phrase).toBe('Pas encore assez de chutes pour dégager une tendance.');
    }
  });

  it('ignore les durées nulles et les autres issues', () => {
    const points = [...chutes(10, 10, 10), point(9, null), point(10, 600_000, 'deathless'), point(11, 5000, 'abandon')];
    expect(tendance(points).sens).toBe('insuffisant');
  });

  it('est stable quand l’écart est nul', () => {
    const t = tendance(chutes(60, 60, 60, 60));
    expect(t).toEqual({ sens: 'stable', phrase: 'Tenue moyenne stable sur tes dernières chutes.' });
  });

  it('monte, en mots, avec k pair (2 contre 2)', () => {
    const t = tendance(chutes(60, 60, 135, 135));
    expect(t.sens).toBe('hausse');
    expect(t.phrase).toBe('+1 min 15 de tenue moyenne sur tes 2 dernières chutes, contre les 2 d’avant');
  });

  it('compare 10 chutes récentes à 9 d’avant avec k impair', () => {
    const t = tendance(chutes(...Array(9).fill(60), ...Array(10).fill(180)));
    expect(t.phrase).toBe('+2 min de tenue moyenne sur tes 10 dernières chutes, contre les 9 d’avant');
  });

  it('descend avec un écart négatif', () => {
    const t = tendance(chutes(105, 105, 60, 60));
    expect(t.sens).toBe('baisse');
    expect(t.phrase).toBe('−45 s de tenue moyenne sur tes 2 dernières chutes, contre les 2 d’avant');
  });
});

describe('dates relatives', () => {
  const maintenant = Date.UTC(2026, 10, 19, 20, 42); // 21:42 à Paris
  it('compare le jour dans le fuseau des données', () => {
    expect(jourDe(Date.UTC(2026, 10, 19, 23, 30), 'Europe/Paris')).toBe('2026-11-20');
    expect(veille('2026-03-01')).toBe('2026-02-28');
  });
  it('écrit Auj. et Hier, formes courte et longue', () => {
    expect(dateTentative(maintenant, 'Europe/Paris', '2026-11-19')).toEqual({ court: 'Auj. 21:42', long: 'Aujourd’hui, 21:42' });
    expect(dateTentative(maintenant - 86_400_000, 'Europe/Paris', '2026-11-19')).toEqual({
      court: 'Hier 21:42',
      long: 'Hier, 21:42',
    });
  });
  it('écrit date et heure courtes au-delà', () => {
    const d = dateTentative(maintenant - 5 * 86_400_000, 'Europe/Paris', '2026-11-19');
    expect(d.court).toBe(d.long);
    expect(d.long).toMatch(/^14 nov\.?,? 21:42$/);
  });
});

describe('pireRooms', () => {
  const rooms = (...arrets: number[]) => arrets.map((a, i) => ({ room: `b-0${i}`, arrets: a }));
  it('rend une seule room quand elle est seule au maximum', () => {
    expect(pireRooms(rooms(1, 3, 2))).toEqual({ rooms: ['b-01'], arrets: 3 });
  });
  it('rend deux rooms à égalité, dans l’ordre de la map', () => {
    expect(pireRooms(rooms(2, 1, 2))).toEqual({ rooms: ['b-00', 'b-02'], arrets: 2 });
  });
  it('rend quatre rooms à égalité', () => {
    expect(pireRooms(rooms(2, 2, 1, 2, 2))?.rooms).toEqual(['b-00', 'b-01', 'b-03', 'b-04']);
  });
  it('renvoie null sans room', () => {
    expect(pireRooms([])).toBeNull();
  });
  it('renvoie null quand toutes les rooms sont à zéro arrêt', () => {
    expect(pireRooms(rooms(0, 0, 0))).toBeNull();
  });
});

describe('separateurListe', () => {
  it('met des virgules puis « et » avant le dernier', () => {
    expect([0, 1, 2, 3].map((i) => separateurListe(i, 4))).toEqual(['', ', ', ', ', ' et ']);
    expect([0, 1].map((i) => separateurListe(i, 2))).toEqual(['', ' et ']);
  });
});
