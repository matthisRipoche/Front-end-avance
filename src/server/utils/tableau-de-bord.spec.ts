// @vitest-environment node
import { createApp, defineEventHandler, toWebHandler } from 'h3';

import type { LiveSnapshot } from '../../app/modeles/live';
import type { Summary } from '../../app/modeles/summary';
import { repondreErreur } from './spring';
import { fuseauDe, versTableauDeBord } from './tableau-de-bord';

/** Fuseau retenu pour une requête : `{ fuseau }`, ou le statut et le message de l'erreur. */
const fuseauPour = async (url: string, cookie?: string) => {
  const app = createApp().use(
    defineEventHandler((event) => {
      try {
        return { fuseau: fuseauDe(event) };
      } catch (e) {
        return repondreErreur(event, e);
      }
    }),
  );
  const res = await toWebHandler(app)(
    new Request(`http://localhost${url}`, { headers: cookie ? { cookie } : {} }),
  );
  return { status: res.status, corps: (await res.json()) as { fuseau?: string; message?: string } };
};

const MESSAGE_FUSEAU = 'Le fuseau horaire doit être un nom IANA, par exemple Europe/Paris.';

describe('Fuseau du tableau de bord', () => {
  it('prend Europe/Paris sans paramètre ni cookie', async () => {
    expect(await fuseauPour('/')).toEqual({ status: 200, corps: { fuseau: 'Europe/Paris' } });
  });

  it.each([
    ['America%2FNew_York', 'America/New_York'],
    ['UTC', 'UTC'],
    ['europe%2Fparis', 'Europe/Paris'],
  ])('accepte ?tz=%s sous sa forme canonique', async (tz, attendu) => {
    expect((await fuseauPour(`/?tz=${tz}`)).corps).toEqual({ fuseau: attendu });
  });

  it.each(['Pas%2FUn_Fuseau', '', 'x'.repeat(65), 'Europe%2FParis&tz=UTC', '%2B01:00', '%2B18:30', '-0500'])(
    'refuse ?tz=%s avec un 400 en français',
    async (tz) => {
      expect(await fuseauPour(`/?tz=${tz}`)).toEqual({ status: 400, corps: { message: MESSAGE_FUSEAU } });
    },
  );

  it('refuse un ?tz= vide même avec un cookie valide', async () => {
    expect((await fuseauPour('/?tz=', 'tz=Asia/Tokyo')).status).toBe(400);
  });

  it('préfère le paramètre au cookie', async () => {
    expect((await fuseauPour('/?tz=UTC', 'tz=Asia/Tokyo')).corps).toEqual({ fuseau: 'UTC' });
  });

  it('prend le cookie tz sans paramètre', async () => {
    expect((await fuseauPour('/', 'tz=Asia%2FTokyo')).corps).toEqual({ fuseau: 'Asia/Tokyo' });
  });

  it('ignore un cookie tz invalide', async () => {
    expect(await fuseauPour('/', 'tz=Nulle/Part')).toEqual({ status: 200, corps: { fuseau: 'Europe/Paris' } });
  });
});

const SUMMARY: Summary = {
  resume: {
    sid: 'Celeste/1-ForsakenCity',
    side: 'A',
    mapName: 'Forsaken City',
    lastPlayedAt: 1_700_000_000_000,
    attempts: 12,
    clears: 2,
    bestRooms: 9,
    knownRooms: 12,
  },
  today: {
    attempts: 5,
    clears: 1,
    bestAttemptMs: 83_000,
    mostPlayed: { sid: 'Celeste/1-ForsakenCity', side: 'A', mapName: 'Forsaken City', attempts: 4 },
  },
  recent: [
    {
      sid: 'MonMod/Chapitres/LaTour',
      side: 'B',
      mapName: null,
      lastPlayedAt: 1_699_000_000_000,
      attempts: 3,
      clears: 0,
      bestRooms: 0,
      knownRooms: 0,
    },
  ],
  activity: [
    { day: '2026-11-16', attempts: 7, clears: 0 },
    { day: '2026-11-17', attempts: 5, clears: 1 },
  ],
};

const LIVE: LiveSnapshot = {
  active: true,
  session: null,
  current: {
    id: 42,
    sid: 'Celeste/1-ForsakenCity',
    side: 'A',
    mapName: null,
    room: 'a-03',
    startedAt: 1_700_000_100_000,
    lastEventAt: 1_700_000_200_000,
    deaths: 3,
    roomsVisited: 4,
  },
  serverTime: 1_700_000_300_000,
};

describe('Mise en forme du tableau de bord', () => {
  it('renvoie exactement la forme attendue par la page', () => {
    expect(versTableauDeBord(SUMMARY, LIVE, 'Europe/Paris')).toEqual({
      fuseau: 'Europe/Paris',
      reprendre: {
        sid: 'Celeste/1-ForsakenCity',
        side: 'A',
        nom: 'Forsaken City',
        tentatives: 12,
        deathless: 2,
        dernierePartie: 1_700_000_000_000,
        roomsAtteintes: 9,
        roomsVues: 12,
        progression: 0.75,
      },
      aujourdhui: {
        tentatives: 5,
        deathless: 1,
        plusLongueMs: 83_000,
        plusTravaillee: { sid: 'Celeste/1-ForsakenCity', side: 'A', nom: 'Forsaken City', tentatives: 4 },
      },
      recentes: [
        {
          sid: 'MonMod/Chapitres/LaTour',
          side: 'B',
          nom: 'LaTour',
          tentatives: 3,
          deathless: 0,
          dernierePartie: 1_699_000_000_000,
          roomsAtteintes: 0,
          roomsVues: 0,
          progression: null,
        },
      ],
      activite: {
        jours: [
          { jour: '2026-11-16', tentatives: 7, deathless: 0 },
          { jour: '2026-11-17', tentatives: 5, deathless: 1 },
        ],
        max: 7,
      },
      enJeu: { sid: 'Celeste/1-ForsakenCity', side: 'A', nom: '1-ForsakenCity', room: 'a-03', debut: 1_700_000_100_000 },
      vide: false,
    });
  });

  it('ne recopie pas un champ que Spring ajouterait', () => {
    const avecIntrus = {
      ...SUMMARY,
      secret: 'interne',
      resume: { ...SUMMARY.resume!, userId: 7 },
      today: { ...SUMMARY.today, token: 'x' },
    } as Summary;
    const live = { ...LIVE, current: { ...LIVE.current!, ip: '1.2.3.4' } } as LiveSnapshot;

    const texte = JSON.stringify(versTableauDeBord(avecIntrus, live, 'UTC'));

    for (const intrus of ['secret', 'interne', 'userId', 'token', 'ip', '1.2.3.4', 'lastEventAt', 'serverTime']) {
      expect(texte).not.toContain(intrus);
    }
  });

  it('donne enJeu null sans direct ou hors partie', () => {
    expect(versTableauDeBord(SUMMARY, null, 'UTC').enJeu).toBeNull();
    expect(versTableauDeBord(SUMMARY, { ...LIVE, current: null }, 'UTC').enJeu).toBeNull();
  });

  it('garde une room inconnue à null', () => {
    const live = { ...LIVE, current: { ...LIVE.current!, room: null } };
    expect(versTableauDeBord(SUMMARY, live, 'UTC').enJeu?.room).toBeNull();
  });

  it('marque vide un joueur qui n’a jamais joué, avec une échelle à 0', () => {
    const nouveau: Summary = {
      resume: null,
      today: { attempts: 0, clears: 0, bestAttemptMs: null, mostPlayed: null },
      recent: [],
      activity: [
        { day: '2026-11-16', attempts: 0, clears: 0 },
        { day: '2026-11-17', attempts: 0, clears: 0 },
      ],
    };

    const tableau = versTableauDeBord(nouveau, null, 'UTC');

    expect(tableau.vide).toBe(true);
    expect(tableau.activite.max).toBe(0);
    expect(tableau.aujourdhui.plusTravaillee).toBeNull();
  });

  it('n’est pas vide s’il reste une face à reprendre, même sans tentative récente', () => {
    const ancien = { ...SUMMARY, activity: [{ day: '2026-11-17', attempts: 0, clears: 0 }] };
    expect(versTableauDeBord(ancien, null, 'UTC').vide).toBe(false);
  });

  it('n’est pas vide s’il y a des tentatives sur la période', () => {
    expect(versTableauDeBord({ ...SUMMARY, resume: null }, null, 'UTC').vide).toBe(false);
  });
});
