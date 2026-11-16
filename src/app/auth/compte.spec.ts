import { HttpErrorResponse, provideHttpClient, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Compte } from './compte';
import { CLE_ETAT_SESSION, Session } from './session';
import type { Utilisateur } from './session-contrat';

const JOUEUR: Utilisateur = {
  id: 7,
  email: 'madeline@exemple.fr',
  createdAt: '2026-10-01T10:00:00Z',
  discordUsername: null,
  discordAvatarUrl: null,
};

/** Laisse les promesses en attente s'exécuter (jeton CSRF, puis requête suivante). */
const attendre = () => new Promise((r) => setTimeout(r));

const preparer = () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withXsrfConfiguration({})),
      provideHttpClientTesting(),
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });
  // État connu dès le départ : sinon la Session interrogerait /api/auth/me d'elle-même.
  TestBed.inject(TransferState).set(CLE_ETAT_SESSION, { statut: 'anonyme' });
  return {
    compte: TestBed.inject(Compte),
    session: TestBed.inject(Session),
    http: TestBed.inject(HttpTestingController),
  };
};

describe('Compte', () => {
  beforeEach(() => {
    // Jeton déjà posé : Compte n'a pas à le redemander à Spring avant d'écrire.
    document.cookie = 'XSRF-TOKEN=jeton-test; path=/';
  });

  it('connecter remplit la session et renvoie l’utilisateur', async () => {
    const { compte, session, http } = preparer();
    session.definir(null);

    const resultat = compte.connecter({ email: JOUEUR.email!, password: 'secret' });
    await attendre();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(JOUEUR);

    expect(await resultat).toEqual(JOUEUR);
    expect(session.etat()).toEqual({ statut: 'connecte', utilisateur: JOUEUR });
    http.verify();
  });

  it('deconnecter envoie POST /api/auth/logout avec le jeton CSRF et vide la session', async () => {
    const { compte, session, http } = preparer();
    session.definir(JOUEUR);

    const resultat = compte.deconnecter();
    await attendre();
    const req = http.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('jeton-test');
    req.flush(null, { status: 204, statusText: 'No Content' });

    await resultat;
    expect(session.etat()).toEqual({ statut: 'anonyme' });
    http.verify();
  });

  it('deconnecter accepte un 401 : la session était déjà finie', async () => {
    const { compte, session, http } = preparer();
    session.definir(JOUEUR);

    const resultat = compte.deconnecter();
    await attendre();
    http.expectOne('/api/auth/logout').flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(resultat).resolves.toBeUndefined();
    expect(session.etat()).toEqual({ statut: 'anonyme' });
    http.verify();
  });

  it('deconnecter fait remonter une erreur 500 et laisse la session connectée', async () => {
    const { compte, session, http } = preparer();
    session.definir(JOUEUR);

    const resultat = compte.deconnecter();
    await attendre();
    http.expectOne('/api/auth/logout').flush(null, { status: 500, statusText: 'Server Error' });

    await expect(resultat).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(session.etat()).toEqual({ statut: 'connecte', utilisateur: JOUEUR });
    http.verify();
  });
});
