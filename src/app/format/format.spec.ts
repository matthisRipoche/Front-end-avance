import { anneeDe, formaterChrono, formaterDate, formaterPourcentage, villeDuFuseau } from './format';

// 17 novembre 2026, 20:04:00 UTC : 21:04 à Paris (UTC+1), 15:04 à New York (UTC-5).
const INSTANT = Date.UTC(2026, 10, 17, 20, 4);

describe('formaterChrono', () => {
  it('écrit 00:00 pour une durée nulle', () => {
    expect(formaterChrono(0)).toBe('00:00');
  });

  it('écrit minutes et secondes sur deux chiffres', () => {
    expect(formaterChrono(42_000)).toBe('00:42');
    expect(formaterChrono(197_400)).toBe('03:17');
  });

  it('ajoute les heures au-delà d’une heure', () => {
    expect(formaterChrono((3600 + 5 * 60 + 3) * 1000)).toBe('1:05:03');
  });

  it('écrit un tiret sans durée, et 00:00 pour une durée négative', () => {
    expect(formaterChrono(null)).toBe('—');
    expect(formaterChrono(-5)).toBe('00:00');
  });
});

describe('formaterDate', () => {
  it('écrit la date dans le fuseau de Paris', () => {
    expect(formaterDate(INSTANT, 'Europe/Paris')).toBe('17 novembre à 21:04');
  });

  it('écrit la date dans le fuseau de New York', () => {
    expect(formaterDate(INSTANT, 'America/New_York')).toBe('17 novembre à 15:04');
  });

  it('change de jour selon le fuseau', () => {
    const minuitParis = Date.UTC(2026, 10, 17, 23, 30);
    expect(formaterDate(minuitParis, 'Europe/Paris')).toBe('18 novembre à 00:30');
    expect(formaterDate(minuitParis, 'America/New_York')).toBe('17 novembre à 18:30');
  });

  it('retombe sur Paris pour un fuseau inconnu, sans lever', () => {
    expect(formaterDate(INSTANT, 'Pas/Un_Fuseau')).toBe('17 novembre à 21:04');
  });

  it('n’écrit pas l’année quand elle est celle de la référence', () => {
    expect(formaterDate(INSTANT, 'Europe/Paris', 2026)).toBe('17 novembre à 21:04');
  });

  it('écrit l’année quand elle diffère de la référence', () => {
    const anPasse = Date.UTC(2025, 10, 17, 20, 4);
    expect(formaterDate(anPasse, 'Europe/Paris', 2026)).toBe('17 novembre 2025 à 21:04');
  });

  it('compare l’année dans le fuseau du joueur, pas en UTC', () => {
    // 1er janvier 2027, 02:00 UTC : encore le 31 décembre 2026 au soir à New York.
    const nouvelAnUtc = Date.UTC(2027, 0, 1, 2, 0);
    expect(formaterDate(nouvelAnUtc, 'America/New_York', 2026)).toBe('31 décembre à 21:00');
    expect(formaterDate(nouvelAnUtc, 'Europe/Paris', 2026)).toBe('1 janvier 2027 à 03:00');
  });
});

describe('anneeDe', () => {
  it('donne l’année dans le fuseau du joueur', () => {
    const nouvelAnUtc = Date.UTC(2027, 0, 1, 2, 0);
    expect(anneeDe(nouvelAnUtc, 'America/New_York')).toBe(2026);
    expect(anneeDe(nouvelAnUtc, 'Europe/Paris')).toBe(2027);
  });
});

describe('villeDuFuseau', () => {
  it('garde le dernier segment, espaces à la place des _', () => {
    expect(villeDuFuseau('Europe/Paris')).toBe('Paris');
    expect(villeDuFuseau('America/New_York')).toBe('New York');
    expect(villeDuFuseau('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
  });
});

describe('formaterPourcentage', () => {
  it('arrondit et borne la progression', () => {
    expect(formaterPourcentage(0.75)).toBe('75 %');
    expect(formaterPourcentage(0.666)).toBe('67 %');
    expect(formaterPourcentage(1.2)).toBe('100 %');
  });
});
