import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import LoginPage from './index.page';

/** Monte la page avec une query (?redirect=…) ; les appels HTTP sont simulés. */
async function monter(query = '') {
  TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [provideRouter([{ path: 'login', component: LoginPage }]), provideHttpClient(), provideHttpClientTesting()],
  });
  const router = TestBed.inject(Router);
  await router.navigateByUrl(`/login${query}`);
  const fixture = TestBed.createComponent(LoginPage);
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
  /** Laisse les promesses de la page avancer, puis rafraîchit l'affichage. */
  const avancer = async () => {
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
  };
  return { page, http, navigation, saisir, envoyer, avancer, fixture };
}

beforeEach(() => {
  // Cookie CSRF déjà présent : la page n'a pas à le demander avant le POST.
  document.cookie = 'XSRF-TOKEN=jeton-test; path=/';
});
afterEach(() => {
  TestBed.inject(HttpTestingController).verify();
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  vi.useRealTimers();
});

describe('Page de connexion', () => {
  it('affiche le titre et le formulaire, sans bandeau en arrivée directe', async () => {
    const { page } = await monter();
    expect(page.querySelector('h1')?.textContent).toContain('Connexion');
    expect(page.querySelector('label[for="email"]')?.textContent).toContain('Email');
    expect(page.querySelector('[role="status"]')).toBeNull();
  });

  it('affiche le bandeau après une redirection depuis une page connectée', async () => {
    const { page } = await monter('?redirect=/mes-maps');
    expect(page.querySelector('[role="status"]')?.textContent).toContain('Connecte-toi pour continuer');
  });

  it('dit comment corriger un champ invalide, sans rien envoyer', async () => {
    const { page, http, saisir, envoyer, avancer } = await monter();
    saisir('email', 'lucie@');
    envoyer();
    await avancer();
    expect(document.activeElement?.id).toBe('email');
    expect(page.querySelector('#email-aide')?.textContent).toContain('nom@exemple.fr');
    expect(page.querySelector('#password-aide')?.textContent).toContain('Saisis ton mot de passe');
    expect(page.querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
    http.expectNone('/api/auth/login');
  });

  it('envoie email et mot de passe, puis revient à la page demandée', async () => {
    const { http, navigation, saisir, envoyer, avancer } = await monter('?redirect=/mes-maps');
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'motdepasse');
    envoyer();
    await avancer();

    const requete = http.expectOne('/api/auth/login');
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ email: 'lucie@exemple.fr', password: 'motdepasse' });
    // Sans cet en-tête, copie du cookie, Spring répond 403.
    expect(requete.request.headers.get('X-XSRF-TOKEN')).toBe('jeton-test');
    requete.flush(null);
    await avancer();
    expect(navigation).toHaveBeenCalledWith('/mes-maps');
  });

  it('ne suit pas une redirection vers un autre site', async () => {
    const { http, navigation, saisir, envoyer, avancer } = await monter('?redirect=//faux-site.fr');
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'motdepasse');
    envoyer();
    await avancer();
    http.expectOne('/api/auth/login').flush(null);
    await avancer();
    expect(navigation).toHaveBeenCalledWith('/');
  });

  it('demande le cookie CSRF à Spring avant le POST s’il manque', async () => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    const { http, saisir, envoyer, avancer } = await monter();
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'motdepasse');
    envoyer();
    await avancer();

    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await avancer();
    http.expectOne('/api/auth/login');
  });

  it('refus 401 : explique, garde l’email et vide le mot de passe', async () => {
    const { page, http, saisir, envoyer, avancer } = await monter();
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'mauvais');
    envoyer();
    await avancer();
    http.expectOne('/api/auth/login').flush({ message: 'non' }, { status: 401, statusText: 'Unauthorized' });
    await avancer();

    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Email ou mot de passe incorrect');
    expect(page.querySelector('[role="alert"] a')?.getAttribute('href')).toBe('/inscription');
    expect(page.querySelector<HTMLInputElement>('#email')!.value).toBe('lucie@exemple.fr');
    expect(page.querySelector<HTMLInputElement>('#password')!.value).toBe('');
  });

  it('trop d’essais (429) : bouton bloqué avec le décompte de Retry-After', async () => {
    const { page, http, saisir, envoyer, avancer, fixture } = await monter();
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'motdepasse');
    envoyer();
    await avancer();
    vi.useFakeTimers();
    http.expectOne('/api/auth/login').flush(
      { message: 'Trop de tentatives' },
      { status: 429, statusText: 'Too Many Requests', headers: { 'retry-after': '3' } },
    );
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    const bouton = page.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Trop de tentatives de connexion');
    expect(bouton.disabled).toBe(true);
    expect(bouton.textContent).toContain('Réessaie dans 3 s');

    await vi.advanceTimersByTimeAsync(3000);
    fixture.detectChanges();
    expect(bouton.disabled).toBe(false);
    expect(bouton.textContent).toContain('Se connecter');
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

  it('jeton CSRF périmé (403) : en redemande un et réessaie une fois', async () => {
    const { http, navigation, saisir, envoyer, avancer } = await monter();
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'motdepasse');
    envoyer();
    await avancer();
    http.expectOne('/api/auth/login').flush(null, { status: 403, statusText: 'Forbidden' });
    await avancer();
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await avancer();
    http.expectOne('/api/auth/login').flush(null);
    await avancer();
    expect(navigation).toHaveBeenCalledWith('/');
  });

  it('403 persistant : explique sans boucler, et place le focus sur l’alerte', async () => {
    const { page, http, saisir, envoyer, avancer } = await monter();
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'motdepasse');
    envoyer();
    await avancer();
    http.expectOne('/api/auth/login').flush(null, { status: 403, statusText: 'Forbidden' });
    await avancer();
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await avancer();
    http.expectOne('/api/auth/login').flush(null, { status: 403, statusText: 'Forbidden' });
    await avancer();
    await avancer();
    const alerte = page.querySelector('[role="alert"]');
    expect(alerte?.textContent).toContain('Connexion refusée par sécurité');
    expect(document.activeElement).toBe(alerte);
  });

  it('Spring injoignable : dit de réessayer plus tard', async () => {
    const { page, http, saisir, envoyer, avancer } = await monter();
    saisir('email', 'lucie@exemple.fr');
    saisir('password', 'motdepasse');
    envoyer();
    await avancer();
    http.expectOne('/api/auth/login').flush({ message: 'API indisponible' }, { status: 503, statusText: 'Service Unavailable' });
    await avancer();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Le service ne répond pas');
  });

  it('affiche ou masque le mot de passe', async () => {
    const { page, fixture } = await monter();
    const bouton = page.querySelector<HTMLButtonElement>('.login__toggle')!;
    expect(page.querySelector('#password')?.getAttribute('type')).toBe('password');
    bouton.click();
    fixture.detectChanges();
    expect(page.querySelector('#password')?.getAttribute('type')).toBe('text');
    expect(bouton.getAttribute('aria-label')).toBe('Masquer le mot de passe');
  });
});
