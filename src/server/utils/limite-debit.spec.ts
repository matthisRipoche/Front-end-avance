import { creerLimiteur } from './limite-debit';

describe('creerLimiteur', () => {
  let t = 0;
  const limiteur = () => creerLimiteur({ max: 3, fenetreMs: 60_000, maintenant: () => t });

  beforeEach(() => {
    t = 1_000_000;
  });

  it('accepte jusqu’à max essais, puis refuse avec le temps d’attente', () => {
    const l = limiteur();
    expect([1, 2, 3].map(() => l.essayer('ip').accepte)).toEqual([true, true, true]);
    t += 15_000;
    expect(l.essayer('ip')).toEqual({ accepte: false, attenteS: 45 });
  });

  it('compte chaque adresse séparément', () => {
    const l = limiteur();
    for (let i = 0; i < 3; i++) l.essayer('a');
    expect(l.essayer('a').accepte).toBe(false);
    expect(l.essayer('b').accepte).toBe(true);
  });

  it('accepte de nouveau une fois la fenêtre écoulée', () => {
    const l = limiteur();
    for (let i = 0; i < 4; i++) l.essayer('ip');
    t += 60_000;
    expect(l.essayer('ip').accepte).toBe(true);
  });

  it('ne garde pas en mémoire les fenêtres terminées', () => {
    const l = limiteur();
    l.essayer('ancienne');
    t += 30_000;
    l.essayer('recente');
    t += 30_000; // la fenêtre de « ancienne » est finie, pas celle de « recente »
    l.essayer('nouvelle');
    expect(l.taille).toBe(2);
    t += 30_000;
    l.essayer('ancienne'); // fenêtre rouverte : réinsérée en fin, la purge reste ordonnée
    expect(l.taille).toBe(2);
  });
});
