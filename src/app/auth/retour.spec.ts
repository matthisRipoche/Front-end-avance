import { cheminDeRetour, estPageConnexion, RETOUR_PAR_DEFAUT } from './retour';

describe('cheminDeRetour', () => {
  it('garde un chemin interne, avec sa query', () => {
    expect(cheminDeRetour('/mes-maps')).toBe('/mes-maps');
    expect(cheminDeRetour('/face?sid=Celeste%2F1&side=B')).toBe('/face?sid=Celeste%2F1&side=B');
  });

  it('revient à la page par défaut sans paramètre', () => {
    expect(cheminDeRetour(null)).toBe(RETOUR_PAR_DEFAUT);
    expect(cheminDeRetour('')).toBe(RETOUR_PAR_DEFAUT);
  });

  it.each([
    'https://autre.fr',
    '//autre.fr',
    '/\\autre.fr',
    'javascript:alert(1)',
    'mes-maps',
    '/\t/autre.fr',
    '/\n/autre.fr',
  ])('refuse une adresse qui sortirait du site : %j', (adresse) => {
    expect(cheminDeRetour(adresse)).toBe(RETOUR_PAR_DEFAUT);
  });

  it('ne renvoie ni sur la connexion ni sur l’inscription', () => {
    expect(cheminDeRetour('/login')).toBe(RETOUR_PAR_DEFAUT);
    expect(cheminDeRetour('/login?redirect=/mes-maps')).toBe(RETOUR_PAR_DEFAUT);
    expect(cheminDeRetour('/login#haut')).toBe(RETOUR_PAR_DEFAUT);
    expect(cheminDeRetour('/inscription')).toBe(RETOUR_PAR_DEFAUT);
  });
});

describe('estPageConnexion', () => {
  it('reconnaît /login avec query, fragment ou slash final', () => {
    for (const url of ['/login', '/login?redirect=/x', '/login#haut', '/login/']) {
      expect(estPageConnexion(url)).toBe(true);
    }
  });

  it('ne confond pas une autre page qui commence pareil', () => {
    expect(estPageConnexion('/loginx')).toBe(false);
    expect(estPageConnexion('/faq')).toBe(false);
  });
});
