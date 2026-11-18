import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { throwError } from 'rxjs';

import { DELAI_FOURNISSEURS_MS, type Fournisseurs, chargerFournisseurs } from './login.donnees';

const resoudre = (http?: object) => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      ...(http ? [{ provide: HttpClient, useValue: http }] : []),
    ],
  });
  return TestBed.runInInjectionContext(() =>
    chargerFournisseurs({} as ActivatedRouteSnapshot, { url: '/login' } as RouterStateSnapshot),
  ) as Promise<Fournisseurs>;
};

const requete = () => TestBed.inject(HttpTestingController).expectOne('/api/auth/providers');

describe('Résolveur chargerFournisseurs', () => {
  it('propose Discord quand Spring l’a configuré', async () => {
    const resultat = resoudre();
    const r = requete();
    expect(r.request.method).toBe('GET');
    r.flush({ discord: true });
    expect(await resultat).toEqual({ discord: true });
  });

  it('ne propose pas Discord quand Spring dit non', async () => {
    const resultat = resoudre();
    requete().flush({ discord: false });
    expect(await resultat).toEqual({ discord: false });
  });

  it('ne propose pas Discord sur une réponse sans le champ', async () => {
    const resultat = resoudre();
    requete().flush({});
    expect(await resultat).toEqual({ discord: false });
  });

  it('ne propose pas Discord, sans lever, quand l’API est indisponible (503)', async () => {
    const resultat = resoudre();
    requete().flush({ message: 'API indisponible' }, { status: 503, statusText: 'Service Unavailable' });
    expect(await resultat).toEqual({ discord: false });
  });

  it('ne propose pas Discord, sans lever, sur une erreur réseau', async () => {
    const http = { get: () => throwError(() => new TypeError('fetch failed')) };
    expect(await resoudre(http)).toEqual({ discord: false });
  });

  it('ne propose pas Discord sur une erreur de $fetch pendant le SSR', async () => {
    const http = { get: () => throwError(() => ({ name: 'FetchError', status: 502, statusCode: 502 })) };
    expect(await resoudre(http)).toEqual({ discord: false });
  });

  describe('quand Spring ne répond pas', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('ne propose pas Discord une fois le délai dépassé, sans attendre davantage', async () => {
      const resultat = resoudre();
      const r = requete(); // jamais servie
      await vi.advanceTimersByTimeAsync(DELAI_FOURNISSEURS_MS);
      expect(await resultat).toEqual({ discord: false });
      expect(r.cancelled).toBe(true);
    });

    it('attend encore juste avant le délai', async () => {
      const resultat = resoudre();
      const r = requete();
      await vi.advanceTimersByTimeAsync(DELAI_FOURNISSEURS_MS - 1);
      r.flush({ discord: true });
      expect(await resultat).toEqual({ discord: true });
    });
  });
});
