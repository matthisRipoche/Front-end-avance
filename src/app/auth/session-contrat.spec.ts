import { estPageConnectee } from './session-contrat';

describe('estPageConnectee', () => {
  it.each([
    '/tableau-de-bord',
    '/tableau-de-bord/',
    '/tableau-de-bord?x=1',
    '/tableau-de-bord#a',
    '/%74ableau-de-bord',
    '/tableau-de-bord;a=b',
    '//tableau-de-bord',
    '/tableau-de-bord/sous-page',
    '/maps',
    '/maps/',
    '/maps?tri=alpha',
  ])('reconnaît une page connectée, même écrite autrement : %j', (chemin) => {
    expect(estPageConnectee(chemin)).toBe(true);
  });

  it('traite un encodage invalide comme une page connectée, par prudence', () => {
    expect(estPageConnectee('/%zz')).toBe(true);
  });

  it.each(['/', '/faq', '/tableau-de-bord-x', '/mapsx', '/login'])(
    'laisse passer une page publique : %j',
    (chemin) => {
      expect(estPageConnectee(chemin)).toBe(false);
    },
  );
});
