import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, RedirectCommand, type RouterStateSnapshot, convertToParamMap, provideRouter } from '@angular/router';
import { RESPONSE } from '@analogjs/router/tokens';
import { throwError } from 'rxjs';

import type { DetailFace } from '../../../../modeles/detail-face';
import { type ResultatFace, chargerDetailFace } from './face.donnees';

const DETAIL = { sid: 'Celeste/1-ForsakenCity', side: 'B', nom: 'Forsaken City' } as DetailFace;
const QUERY = { sid: 'Celeste/1-ForsakenCity', side: 'B' };

const fausseReponse = () => {
  const entetes: Record<string, string> = {};
  return {
    statusCode: 200,
    entetes,
    setHeader: (nom: string, valeur: string) => {
      entetes[nom.toLowerCase()] = valeur;
    },
  };
};

type Options = { reponse?: object; http?: object; query?: Record<string, string> };

const resoudre = (plateforme: 'server' | 'browser', { reponse, http, query = QUERY }: Options = {}) => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: plateforme },
      ...(reponse ? [{ provide: RESPONSE, useValue: reponse }] : []),
      ...(http ? [{ provide: HttpClient, useValue: http }] : []),
    ],
  });
  const route = { queryParamMap: convertToParamMap(query) } as ActivatedRouteSnapshot;
  const state = { url: '/maps/face?sid=Celeste%2F1-ForsakenCity&side=B' } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => chargerDetailFace(route, state)) as Promise<ResultatFace | RedirectCommand>;
};

/** URL demandée : telle quelle, c'est la clé du TransferState. */
const requete = () => TestBed.inject(HttpTestingController).expectOne((r) => r.url === '/api/face');
const repondre = (statut: number, corps: DetailFace | null = null) =>
  requete().flush(corps, { status: statut, statusText: 'x' });

describe.each(['server', 'browser'] as const)('Résolveur chargerDetailFace (%s)', (plateforme) => {
  const serveur = plateforme === 'server';
  const reponse = () => (serveur ? fausseReponse() : undefined);

  it('appelle /api/face avec sid puis side, sans fuseau', async () => {
    const r = resoudre(plateforme, { reponse: reponse() });
    const req = requete();
    expect(req.request.urlWithParams).toBe('/api/face?sid=Celeste/1-ForsakenCity&side=B');
    expect(req.request.params.keys()).toEqual(['sid', 'side']);
    req.flush(DETAIL);
    expect(await r).toEqual({ etat: 'ok', donnees: DETAIL });
  });

  it('ne passe que les paramètres présents', async () => {
    const r = resoudre(plateforme, { reponse: reponse(), query: { side: 'A' } });
    const req = requete();
    expect(req.request.urlWithParams).toBe('/api/face?side=A');
    req.flush(DETAIL);
    await r;
  });

  it('garde le statut 200 sur une réponse normale', async () => {
    const rep = reponse();
    const r = resoudre(plateforme, { reponse: rep });
    repondre(200, DETAIL);
    await r;
    if (rep) expect(rep.statusCode).toBe(200);
  });

  it('traite 404 comme une face vide', async () => {
    const rep = reponse();
    const r = resoudre(plateforme, { reponse: rep });
    repondre(404);
    expect(await r).toEqual({ etat: 'vide' });
    if (rep) expect(rep.statusCode).toBe(serveur ? 404 : 200);
  });

  it('traite 400 comme une adresse invalide', async () => {
    const rep = reponse();
    const r = resoudre(plateforme, { reponse: rep });
    repondre(400);
    expect(await r).toEqual({ etat: 'invalide' });
    if (rep) expect(rep.statusCode).toBe(400);
  });

  it('renvoie l’erreur et pose 503 si l’API est indisponible', async () => {
    const rep = reponse();
    const r = resoudre(plateforme, { reponse: rep });
    repondre(503);
    expect(await r).toEqual({ etat: 'erreur', statut: 503 });
    if (rep) expect(rep.statusCode).toBe(503);
  });

  it('pose 502 pour les autres erreurs', async () => {
    const rep = reponse();
    const r = resoudre(plateforme, { reponse: rep });
    repondre(502);
    expect(await r).toEqual({ etat: 'erreur', statut: 502 });
    if (rep) expect(rep.statusCode).toBe(502);
  });

  it('traite une panne réseau comme un 502, sans lever', async () => {
    const rep = reponse();
    const http = { get: () => throwError(() => new TypeError('fetch failed')) };
    expect(await resoudre(plateforme, { reponse: rep, http })).toEqual({ etat: 'erreur', statut: 0 });
    if (rep) expect(rep.statusCode).toBe(502);
  });
});

describe('Résolveur chargerDetailFace et session expirée', () => {
  it('répond 302 vers la connexion côté serveur', async () => {
    const rep = fausseReponse();
    const r = resoudre('server', { reponse: rep });
    repondre(401);
    expect(await r).toEqual({ etat: 'erreur', statut: 401 });
    expect(rep.statusCode).toBe(302);
    expect(rep.entetes['location']).toBe('/login?redirect=%2Fmaps%2Fface%3Fsid%3DCeleste%252F1-ForsakenCity%26side%3DB');
  });

  it('redirige vers la connexion dans le navigateur', async () => {
    const r = resoudre('browser');
    repondre(401);
    const commande = await r;
    expect(commande).toBeInstanceOf(RedirectCommand);
    expect(String((commande as RedirectCommand).redirectTo)).toContain('/login?redirect=');
  });
});
