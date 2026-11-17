import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, RedirectCommand, type RouterStateSnapshot, provideRouter } from '@angular/router';
import { RESPONSE } from '@analogjs/router/tokens';
import { throwError } from 'rxjs';

import type { TableauDeBord } from '../../../modeles/tableau-de-bord';
import { type ResultatTableau, chargerTableau } from './tableau-de-bord.donnees';

const TABLEAU: TableauDeBord = {
  fuseau: 'Europe/Paris',
  reprendre: null,
  aujourdhui: { tentatives: 0, deathless: 0, plusLongueMs: null, plusTravaillee: null },
  recentes: [],
  activite: { jours: [], max: 0 },
  enJeu: null,
  vide: true,
};

/** Fausse réponse Node : statut et en-têtes posés par le résolveur. */
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

type Options = { reponse?: object; http?: object };

const resoudre = (plateforme: 'server' | 'browser', { reponse, http }: Options = {}) => {
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
  const state = { url: '/tableau-de-bord' } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() =>
    chargerTableau({} as ActivatedRouteSnapshot, state),
  ) as Promise<ResultatTableau | RedirectCommand>;
};

const repondre = (statut: number, corps: TableauDeBord | null = null) =>
  TestBed.inject(HttpTestingController)
    .expectOne('/api/tableau-de-bord')
    .flush(corps, { status: statut, statusText: 'x' });

describe('Résolveur chargerTableau côté serveur', () => {
  it('renvoie les données sans toucher à la réponse', async () => {
    const reponse = fausseReponse();
    const resultat = resoudre('server', { reponse });
    repondre(200, TABLEAU);
    expect(await resultat).toEqual({ etat: 'ok', donnees: TABLEAU });
    expect(reponse.statusCode).toBe(200);
  });

  it('appelle /api/tableau-de-bord sans paramètre, pour garder la même clé de TransferState', async () => {
    const resultat = resoudre('server', { reponse: fausseReponse() });
    const requete = TestBed.inject(HttpTestingController).expectOne('/api/tableau-de-bord');
    expect(requete.request.urlWithParams).toBe('/api/tableau-de-bord');
    expect(requete.request.method).toBe('GET');
    requete.flush(TABLEAU);
    await resultat;
  });

  it('répond 302 vers la connexion quand la session a expiré', async () => {
    const reponse = fausseReponse();
    const resultat = resoudre('server', { reponse });
    repondre(401);
    expect(await resultat).toEqual({ etat: 'erreur', statut: 401 });
    expect(reponse.statusCode).toBe(302);
    expect(reponse.entetes['location']).toBe('/login?redirect=%2Ftableau-de-bord');
  });

  it('pose 503 quand l’API est indisponible', async () => {
    const reponse = fausseReponse();
    const resultat = resoudre('server', { reponse });
    repondre(503);
    expect(await resultat).toEqual({ etat: 'erreur', statut: 503 });
    expect(reponse.statusCode).toBe(503);
  });

  it('pose 502 pour toute autre erreur', async () => {
    const reponse = fausseReponse();
    const resultat = resoudre('server', { reponse });
    repondre(500);
    expect(await resultat).toEqual({ etat: 'erreur', statut: 500 });
    expect(reponse.statusCode).toBe(502);
  });

  it('lit le statut d’une erreur de $fetch (FetchError), forme rejetée pendant le SSR', async () => {
    const reponse = fausseReponse();
    const http = { get: () => throwError(() => ({ name: 'FetchError', status: 503, statusCode: 503 })) };
    expect(await resoudre('server', { reponse, http })).toEqual({ etat: 'erreur', statut: 503 });
    expect(reponse.statusCode).toBe(503);
  });

  it('traite une erreur sans statut (réseau) comme un 502, sans lever', async () => {
    const reponse = fausseReponse();
    const http = { get: () => throwError(() => new TypeError('fetch failed')) };
    expect(await resoudre('server', { reponse, http })).toEqual({ etat: 'erreur', statut: 0 });
    expect(reponse.statusCode).toBe(502);
  });

  it('ne lève pas sans réponse Node disponible', async () => {
    const resultat = resoudre('server');
    repondre(401);
    expect(await resultat).toEqual({ etat: 'erreur', statut: 401 });
  });
});

describe('Résolveur chargerTableau dans le navigateur', () => {
  it('renvoie les données', async () => {
    const resultat = resoudre('browser');
    repondre(200, TABLEAU);
    expect(await resultat).toEqual({ etat: 'ok', donnees: TABLEAU });
  });

  it('redirige vers la connexion quand la session a expiré, avec la page en retour', async () => {
    const resultat = resoudre('browser');
    repondre(401);
    const commande = await resultat;
    expect(commande).toBeInstanceOf(RedirectCommand);
    expect(String((commande as RedirectCommand).redirectTo)).toBe('/login?redirect=%2Ftableau-de-bord');
  });

  it('renvoie l’erreur à afficher quand l’API est en panne', async () => {
    const resultat = resoudre('browser');
    repondre(502);
    expect(await resultat).toEqual({ etat: 'erreur', statut: 502 });
  });
});
