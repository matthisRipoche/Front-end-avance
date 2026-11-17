import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { REQUEST } from '@analogjs/router/tokens';

import { transmettreCookieSsr } from './cookie-ssr';

const COOKIE = 'JSESSIONID=abc; XSRF-TOKEN=xyz; tz=Europe%2FParis';

/** Prépare HttpClient avec l'intercepteur ; `requete` absente = navigateur. */
const preparer = (requete?: object) => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([transmettreCookieSsr])),
      provideHttpClientTesting(),
      ...(requete ? [{ provide: REQUEST, useValue: requete }] : []),
    ],
  });
  return { http: TestBed.inject(HttpClient), controle: TestBed.inject(HttpTestingController) };
};

/** Envoie un GET et renvoie l'en-tête cookie que la requête porte en sortie. */
const cookieEnvoye = (url: string, requete?: object) => {
  const { http, controle } = preparer(requete);
  http.get(url).subscribe();
  const appel = controle.expectOne(url);
  appel.flush({});
  controle.verify();
  return appel.request.headers.get('cookie');
};

describe('Intercepteur transmettreCookieSsr', () => {
  it('recopie le cookie du navigateur sur /api/tableau-de-bord pendant le rendu serveur', () => {
    expect(cookieEnvoye('/api/tableau-de-bord', { headers: { cookie: COOKIE } })).toBe(COOKIE);
  });

  it('n’ajoute rien dans le navigateur (pas de requête Node)', () => {
    expect(cookieEnvoye('/api/tableau-de-bord')).toBeNull();
  });

  it.each(['https://autre.example/api/x', '//x/api/y', '/apix'])(
    'n’envoie jamais le cookie vers %s',
    (url) => {
      expect(cookieEnvoye(url, { headers: { cookie: COOKIE } })).toBeNull();
    },
  );

  it('laisse inchangée une requête serveur sans cookie', () => {
    expect(cookieEnvoye('/api/tableau-de-bord', { headers: {} })).toBeNull();
  });
});
