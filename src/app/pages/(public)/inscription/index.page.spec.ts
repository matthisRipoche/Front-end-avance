import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { CLE_ETAT_SESSION } from '../../../auth/session';
import InscriptionPage from './index.page';

async function monter(query = '') {
  TestBed.configureTestingModule({
    imports: [InscriptionPage],
    providers: [
      provideRouter([{ path: 'inscription', component: InscriptionPage }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  // Visiteur anonyme, comme l'aurait dit le serveur : la session n'appelle pas /api/auth/me.
  TestBed.inject(TransferState).set(CLE_ETAT_SESSION, { statut: 'anonyme' });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(`/inscription${query}`);
  const fixture = TestBed.createComponent(InscriptionPage);
  fixture.detectChanges();
  const page = fixture.nativeElement as HTMLElement;
  const http = TestBed.inject(HttpTestingController);
  const navigation = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

  const saisir = (id: string, valeur: string) => {
    const champ = page.querySelector<HTMLInputElement>(`#${id}`)!;
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
  };
  const envoyer = () => {
    page.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const avancer = async () => {
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
  };
  const remplir = () => {
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'motdepasse');
  };
  return { page, http, navigation, saisir, envoyer, avancer, remplir };
}

beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=jeton-test; path=/';
});
afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

describe('Page d’inscription', () => {
  it('affiche le titre, les champs et la règle du mot de passe', async () => {
    const { page } = await monter();
    expect(page.querySelector('h1')?.textContent).toContain('Créer un compte');
    expect(page.querySelector('#password-aide')?.textContent).toContain('8 caractères au moins');
    expect(page.querySelector('#password')?.getAttribute('autocomplete')).toBe('new-password');
  });

  it('dit combien de caractères manquent, sans rien envoyer', async () => {
    const { page, http, saisir, envoyer, avancer } = await monter();
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'court');
    envoyer();
    await avancer();
    expect(page.querySelector('#password-aide')?.textContent).toContain('Encore 3 caractères');
    expect(document.activeElement?.id).toBe('password');
    http.expectNone('/api/auth/register');
  });

  it('crée le compte, se connecte, puis va à la page demandée', async () => {
    const { http, navigation, remplir, envoyer, avancer } = await monter('?redirect=/mes-maps');
    remplir();
    envoyer();
    await avancer();

    const creation = http.expectOne('/api/auth/register');
    expect(creation.request.body).toEqual({ email: 'lucie@exemple.fr', password: 'motdepasse' });
    expect(creation.request.headers.get('X-XSRF-TOKEN')).toBe('jeton-test');
    creation.flush({ id: 1, email: 'lucie@exemple.fr' }, { status: 201, statusText: 'Created' });
    await avancer();

    const connexion = http.expectOne('/api/auth/login');
    expect(connexion.request.body).toEqual({ email: 'lucie@exemple.fr', password: 'motdepasse' });
    connexion.flush(null);
    await avancer();
    expect(navigation).toHaveBeenCalledWith('/mes-maps');
  });

  it('email déjà utilisé (409) : propose de se connecter', async () => {
    const { page, http, remplir, envoyer, avancer } = await monter();
    remplir();
    envoyer();
    await avancer();
    http.expectOne('/api/auth/register').flush({ message: 'Cet email est déjà utilisé' }, { status: 409, statusText: 'Conflict' });
    await avancer();

    const alerte = page.querySelector('[role="alert"]');
    expect(alerte?.textContent).toContain('Un compte existe déjà avec cet email');
    expect(alerte?.textContent?.replace(/\s+/g, ' ')).toContain('Utilise une autre adresse, ou connecte-toi.');
    expect(alerte?.querySelector('a')?.getAttribute('href')).toBe('/login');
    expect(document.activeElement).toBe(alerte);
    http.expectNone('/api/auth/login');
  });

  it('compte créé mais connexion ratée : ne propose pas de le recréer', async () => {
    const { page, http, navigation, remplir, envoyer, avancer } = await monter();
    remplir();
    envoyer();
    await avancer();
    http.expectOne('/api/auth/register').flush({}, { status: 201, statusText: 'Created' });
    await avancer();
    http.expectOne('/api/auth/login').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await avancer();

    const statut = page.querySelector('[role="status"]');
    expect(statut?.textContent?.replace(/\s+/g, ' ')).toContain('La connexion automatique a échoué : connecte-toi.');
    expect(statut?.classList).not.toContain('cdt-alert--error');
    expect(statut?.querySelector('a')?.getAttribute('href')).toBe('/login');
    expect(navigation).not.toHaveBeenCalled();
  });

  it('compte la limite de BCrypt en octets : les accents comptent double', async () => {
    const { page, http, saisir, envoyer, avancer } = await monter();
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'é'.repeat(37)); // 37 caractères, 74 octets
    envoyer();
    await avancer();
    expect(page.querySelector('#password-aide')?.textContent).toContain('72 octets au plus');
    http.expectNone('/api/auth/register');
  });

  it('accepte 72 octets tout juste', async () => {
    const { http, saisir, envoyer, avancer } = await monter();
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'é'.repeat(36));
    envoyer();
    await avancer();
    http.expectOne('/api/auth/register').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await avancer();
  });

  it('garde la page demandée dans le lien vers la connexion', async () => {
    const { page } = await monter('?redirect=/mes-maps');
    expect(page.querySelector('.inscription__alt a')?.getAttribute('href')).toBe('/login?redirect=%2Fmes-maps');
  });

  it.each([
    [400, 'Ces informations sont refusées'],
    [403, 'Création refusée par sécurité'],
  ])('refus %i de Spring : %s', async (code, titre) => {
    const { page, http, remplir, envoyer, avancer } = await monter();
    remplir();
    envoyer();
    await avancer();
    http.expectOne('/api/auth/register').flush(null, { status: code, statusText: 'Refus' });
    await avancer();
    if (code === 403) {
      // Le service redemande un jeton et réessaie une fois.
      http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
      await avancer();
      http.expectOne('/api/auth/register').flush(null, { status: 403, statusText: 'Forbidden' });
      await avancer();
    }
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(titre);
  });

  it('Spring injoignable : dit de réessayer plus tard', async () => {
    const { page, http, remplir, envoyer, avancer } = await monter();
    remplir();
    envoyer();
    await avancer();
    http.expectOne('/api/auth/register').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await avancer();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Le service ne répond pas');
  });
});
