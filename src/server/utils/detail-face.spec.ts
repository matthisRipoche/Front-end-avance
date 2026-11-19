// @vitest-environment node
import { createApp, createRouter, eventHandler, toWebHandler } from 'h3';

import type { FaceDetail } from '../../app/modeles/face';
import { lireFace, versDetailFace } from './detail-face';

/** Appelle `lireFace` dans une vraie requête h3 ; renvoie le statut, et le corps. */
async function lire(requete: string) {
  const app = createApp().use(
    createRouter().get(
      '/x',
      eventHandler((event) => {
        try {
          return lireFace(event);
        } catch (e) {
          const err = e as { statusCode: number; message: string };
          event.node.res.statusCode = err.statusCode;
          return { message: err.message };
        }
      }),
    ),
  );
  const res = await toWebHandler(app)(new Request(`http://localhost/x${requete}`));
  return { status: res.status, corps: (await res.json()) as Record<string, unknown> };
}

const OBLIGATOIRE = 'Le paramètre sid est obligatoire.';
const INVALIDE = 'Le paramètre sid doit être un identifiant de map de 1 à 255 caractères.';
const SIDE = 'Le paramètre side doit valoir A, B ou C.';

describe('lireFace', () => {
  it.each([
    ['sid absent', '?side=A', OBLIGATOIRE],
    ['sid vide', '?sid=&side=A', OBLIGATOIRE],
    ['sid répété', '?sid=a&sid=b&side=A', INVALIDE],
    ['sid de 256 caractères', `?sid=${'a'.repeat(256)}&side=A`, INVALIDE],
    ['sid avec un caractère de contrôle', '?sid=a%00b&side=A', INVALIDE],
    ['sid avec un retour à la ligne', '?sid=a%0Ab&side=A', INVALIDE],
    ['sid avec espace au début', '?sid=%20Celeste&side=A', INVALIDE],
    ['sid avec espace à la fin', '?sid=Celeste%20&side=A', INVALIDE],
    ['side absent', '?sid=Celeste', SIDE],
    ['side D', '?sid=Celeste&side=D', SIDE],
    ['side en minuscule', '?sid=Celeste&side=b', SIDE],
    ['side vide', '?sid=Celeste&side=', SIDE],
    ['side répété', '?sid=Celeste&side=A&side=B', SIDE],
  ])('refuse en 400 : %s', async (_nom, requete, message) => {
    expect(await lire(requete)).toEqual({ status: 400, corps: { message } });
  });

  it('contrôle le sid avant le side', async () => {
    expect((await lire('?side=D')).corps).toEqual({ message: OBLIGATOIRE });
  });

  it('accepte un sid de 255 caractères', async () => {
    const sid = 'a'.repeat(255);
    expect(await lire(`?sid=${sid}&side=C`)).toEqual({ status: 200, corps: { sid, side: 'C' } });
  });

  it.each([
    ['des /', 'Celeste/1-ForsakenCity', 'Celeste%2F1-ForsakenCity'],
    ['une espace au milieu', 'Mon Mod/Ma Map', 'Mon%20Mod%2FMa%20Map'],
    ['des accents', 'Été/Café', encodeURIComponent('Été/Café')],
    ['une apostrophe', "Maddy's/map", encodeURIComponent("Maddy's/map")],
    ['un +', 'a+b', 'a%2Bb'],
    ['un &', 'a&b', 'a%26b'],
  ])('accepte un sid avec %s', async (_nom, sid, encode) => {
    expect(await lire(`?sid=${encode}&side=A`)).toEqual({ status: 200, corps: { sid, side: 'A' } });
  });
});

const DETAIL: FaceDetail = {
  sid: 'Celeste/1-ForsakenCity',
  side: 'A',
  mapName: null,
  attempts: 10,
  clears: 2,
  clearRate: 0.2,
  bestClearMs: 90000,
  longestMs: 80000,
  longestEndRoom: 'b-05',
  rooms: [{ room: 'a-01', entries: 9, endings: 3, deaths: 5 }],
  evolution: [
    { attemptId: 1, startedAt: 1000, durationMs: 5000, result: 'death' },
    { attemptId: 2, startedAt: 2000, durationMs: null, result: 'success' },
  ],
  recent: [
    { id: 2, startedAt: 2000, result: 'success', durationMs: 90000, endRoom: null, roomsCleared: 8, deaths: 0 },
    { id: 1, startedAt: 1000, result: 'abandoned', durationMs: 5000, endRoom: 'a-01', roomsCleared: 1, deaths: 3 },
  ],
};

describe('versDetailFace', () => {
  const MAINTENANT = Date.UTC(2026, 10, 19, 12, 0, 0);

  it('recopie les champs en français', () => {
    expect(versDetailFace(DETAIL, 'Europe/Paris', MAINTENANT)).toEqual({
      fuseau: 'Europe/Paris',
      aujourdhui: '2026-11-19',
      sid: 'Celeste/1-ForsakenCity',
      side: 'A',
      nom: '1-ForsakenCity',
      mod: 'Celeste',
      dernierePartie: 2000,
      tentatives: 10,
      tentativesSemaine: 0,
      deathless: 2,
      tauxDeathless: 0.2,
      meilleurDeathlessMs: 90000,
      tenueMaxMs: 80000,
      tenueMaxRoom: 'b-05',
      rooms: [{ room: 'a-01', arrets: 3, morts: 5 }],
      evolution: [
        { id: 1, debut: 1000, dureeMs: 5000, issue: 'chute' },
        { id: 2, debut: 2000, dureeMs: null, issue: 'deathless' },
      ],
      recentes: [
        { id: 2, debut: 2000, issue: 'deathless', dureeMs: 90000, roomFin: null, roomsFranchies: 8, morts: 0 },
        { id: 1, debut: 1000, issue: 'abandon', dureeMs: 5000, roomFin: 'a-01', roomsFranchies: 1, morts: 3 },
      ],
    });
  });

  it('ne laisse passer aucun champ en trop (liste blanche)', () => {
    const detail = {
      ...DETAIL,
      secret: 'x',
      rooms: [{ ...DETAIL.rooms[0], entries: 9, interne: 1 }],
      evolution: [{ ...DETAIL.evolution[0], extra: 1 }],
      recent: [{ ...DETAIL.recent[0], extra: 1 }],
    } as unknown as FaceDetail;
    const texte = JSON.stringify(versDetailFace(detail, 'Europe/Paris', MAINTENANT));
    expect(texte).not.toContain('secret');
    expect(texte).not.toContain('interne');
    expect(texte).not.toContain('extra');
    expect(texte).not.toContain('entries');
  });

  it('compte les tentatives des 7 derniers jours, bord inclus', () => {
    const jour = 24 * 3600 * 1000;
    const point = (attemptId: number, startedAt: number) => ({
      attemptId,
      startedAt,
      durationMs: 1,
      result: 'death' as const,
    });
    const detail: FaceDetail = {
      ...DETAIL,
      evolution: [
        point(1, MAINTENANT - 7 * jour - 1),
        point(2, MAINTENANT - 7 * jour),
        point(3, MAINTENANT - jour),
        point(4, MAINTENANT),
      ],
    };
    expect(versDetailFace(detail, 'Europe/Paris', MAINTENANT).tentativesSemaine).toBe(3);
  });

  it('donne dernierePartie nulle sans tentative récente', () => {
    const r = versDetailFace({ ...DETAIL, recent: [] }, 'Europe/Paris', MAINTENANT);
    expect(r.dernierePartie).toBeNull();
    expect(r.recentes).toEqual([]);
  });

  it('écrit le jour dans le fuseau du joueur', () => {
    // 23 h 30 UTC le 19 : déjà le 20 à Tokyo, encore le 19 à Paris.
    const tard = Date.UTC(2026, 10, 19, 23, 30);
    expect(versDetailFace(DETAIL, 'Asia/Tokyo', tard).aujourdhui).toBe('2026-11-20');
    expect(versDetailFace(DETAIL, 'Europe/Paris', tard).aujourdhui).toBe('2026-11-20');
    expect(versDetailFace(DETAIL, 'America/New_York', tard).aujourdhui).toBe('2026-11-19');
    expect(versDetailFace(DETAIL, 'UTC', tard).aujourdhui).toBe('2026-11-19');
  });

  it('traduit les quatre issues', () => {
    const detail: FaceDetail = {
      ...DETAIL,
      recent: (['success', 'death', 'abandoned', 'ongoing'] as const).map((result, i) => ({
        id: i,
        startedAt: i,
        result,
        durationMs: null,
        endRoom: null,
        roomsCleared: 0,
        deaths: 0,
      })),
    };
    expect(versDetailFace(detail, 'UTC', MAINTENANT).recentes.map((t) => t.issue)).toEqual([
      'deathless',
      'chute',
      'abandon',
      'en-cours',
    ]);
  });

  it('traite un résultat inconnu comme un abandon, sans lever', () => {
    // Cast nécessaire : le type exclut 'timeout', mais Spring pourrait l'ajouter un jour.
    const inconnu = 'timeout' as unknown as 'death';
    const detail: FaceDetail = {
      ...DETAIL,
      evolution: [
        { attemptId: 1, startedAt: 1000, durationMs: 5000, result: inconnu },
        { attemptId: 2, startedAt: 2000, durationMs: null, result: 'success' },
      ],
      recent: [
        { id: 2, startedAt: 2000, result: inconnu, durationMs: 1, endRoom: null, roomsCleared: 0, deaths: 0 },
        { id: 1, startedAt: 1000, result: 'death', durationMs: 1, endRoom: null, roomsCleared: 0, deaths: 0 },
      ],
    };
    const r = versDetailFace(detail, 'UTC', MAINTENANT);
    expect(r.evolution.map((p) => p.issue)).toEqual(['abandon', 'deathless']);
    expect(r.recentes.map((t) => t.issue)).toEqual(['abandon', 'chute']);
  });
});
