import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RESPONSE, ServerResponse } from '@analogjs/router/tokens';

import NotFound from './[...not-found].page';

describe('Page introuvable', () => {
  const render = (response?: Partial<ServerResponse>) => {
    TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([]), ...(response ? [{ provide: RESPONSE, useValue: response }] : [])],
    });
    const fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('pose le statut 404 pendant le rendu serveur', () => {
    const response = { statusCode: 200 };
    render(response);
    expect(response.statusCode).toBe(404);
  });

  it('s’affiche aussi dans le navigateur, où il n’y a pas de réponse HTTP', () => {
    expect(render().querySelector('h1')?.textContent).toContain('Cette page n');
  });

  it('propose un retour à l’accueil', () => {
    expect(render().querySelector('a[href="/"]')).not.toBeNull();
  });
});
