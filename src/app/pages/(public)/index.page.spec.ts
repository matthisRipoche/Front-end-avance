import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import Home from './index.page';

describe('Page d’accueil', () => {
  const render = () => {
    TestBed.configureTestingModule({ imports: [Home], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('annonce la promesse du site', () => {
    expect(render().querySelector('h1')?.textContent).toContain('Ton deathless, tentative par tentative.');
  });

  it('signale que les données d’exemple sont fictives', () => {
    expect(render().textContent).toContain('exemple, données fictives');
  });

  it('ne montre qu’un seul élément doré : le deathless', () => {
    const page = render();
    expect(page.querySelectorAll('.cdt-result--deathless').length).toBe(1);
    expect(page.querySelectorAll('.cdt-reach--deathless').length).toBe(1);
  });

  it('dit que le mod n’est pas encore publié', () => {
    expect(render().querySelector('[role="status"]')?.textContent).toContain('pas encore publié');
  });
});
