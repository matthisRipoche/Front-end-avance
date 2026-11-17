import { HttpErrorResponse } from '@angular/common/http';

import { statutErreur } from './statut-erreur';

describe('statutErreur', () => {
  it('lit le statut d’une erreur HttpClient (navigateur)', () => {
    expect(statutErreur(new HttpErrorResponse({ status: 401 }))).toBe(401);
  });

  it('lit le statut d’une erreur $fetch (rendu serveur)', () => {
    expect(statutErreur({ status: 503 })).toBe(503);
  });

  it('se rabat sur statusCode quand status manque', () => {
    expect(statutErreur({ statusCode: 502 })).toBe(502);
  });

  it('renvoie 0 pour une erreur sans statut', () => {
    expect(statutErreur(new Error('réseau coupé'))).toBe(0);
    expect(statutErreur(undefined)).toBe(0);
  });
});
