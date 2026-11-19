import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import PublicLayout from './(public).page';

@Component({ template: '<h1>Page enfant</h1>' })
class Enfant {}

describe('Coque des pages publiques', () => {
  const origine = Element.prototype.scrollIntoView;
  beforeEach(() => {
    // jsdom n'implémente pas scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    Element.prototype.scrollIntoView = origine;
  });

  const render = async (url: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: PublicLayout,
            children: [
              { path: '', component: Enfant },
              { path: 'faq', component: Enfant },
            ],
          },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create(url);
    // routerLinkActive se met à jour après la navigation : un second rendu l'affiche.
    await harness.fixture.whenStable();
    harness.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  };
  let page: HTMLElement;
  const main = () => page.querySelector('main') as HTMLElement;

  it('affiche la page enfant entre la navigation et le pied de page', async () => {
    const page = await render('/');
    expect(page.querySelector('header nav')).not.toBeNull();
    expect(page.querySelector('main h1')?.textContent).toBe('Page enfant');
    expect(page.querySelector('footer')).not.toBeNull();
  });

  it('propose un lien d’évitement vers le contenu', async () => {
    const page = await render('/');
    const lien = page.querySelector<HTMLAnchorElement>('.skip-link');
    expect(lien?.getAttribute('href')).toBe('#contenu');
    expect(page.querySelector('main')?.id).toBe('contenu');
  });

  it('marque la page courante dans la navigation', async () => {
    const page = await render('/faq');
    const courant = page.querySelectorAll('[aria-current="page"]');
    expect(courant.length).toBe(1);
    expect(courant[0].textContent?.trim()).toBe('FAQ');
  });

  describe('focus', () => {
    // Le focus ne vaut que pour un élément rattaché au document.
    const rendreDansLeDocument = async (url: string) => {
      page = await render(url);
      if (!page.isConnected) document.body.append(page);
      return page;
    };

    it('ne déplace pas le focus à la première navigation, même vers une autre adresse', async () => {
      // Chargement direct de /faq : la coque est construite alors que router.url vaut « / », puis la
      // navigation initiale arrive sur /faq. L'adresse change, seule la garde « première navigation »
      // empêche de voler le focus.
      TestBed.configureTestingModule({
        providers: [provideRouter([{ path: '', component: Enfant }, { path: 'faq', component: Enfant }])],
      });
      const fixture = TestBed.createComponent(PublicLayout);
      document.body.append(fixture.nativeElement);
      fixture.detectChanges();
      page = fixture.nativeElement as HTMLElement;
      await TestBed.inject(Router).navigateByUrl('/faq');
      expect(document.activeElement).not.toBe(main());
    });

    it('le lien d’évitement donne le focus au contenu sans changer l’adresse', async () => {
      await rendreDansLeDocument('/');
      const router = TestBed.inject(Router);
      const lien = page.querySelector<HTMLAnchorElement>('.skip-link')!;
      const clic = new MouseEvent('click', { bubbles: true, cancelable: true });
      lien.dispatchEvent(clic);
      expect(clic.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(main());
      expect(router.url).toBe('/');
    });

    it('donne le focus au contenu après un changement de page', async () => {
      await rendreDansLeDocument('/');
      await TestBed.inject(Router).navigateByUrl('/faq');
      expect(document.activeElement).toBe(main());
    });

    it('ne déplace pas le focus quand seul le fragment change', async () => {
      await rendreDansLeDocument('/faq');
      await TestBed.inject(Router).navigateByUrl('/faq#question');
      expect(document.activeElement).not.toBe(main());
    });
  });
});
