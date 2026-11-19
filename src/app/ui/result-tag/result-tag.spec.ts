import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ResultKind, ResultTag } from './result-tag';

@Component({
  imports: [ResultTag],
  template: `<cdt-result-tag [kind]="kind">Mot projeté</cdt-result-tag>`,
})
class Hote {
  kind: ResultKind = 'success';
}

const GENRES: ResultKind[] = ['success', 'fall', 'deathless', 'abandon'];

describe('Étiquette de résultat', () => {
  const render = (kind: ResultKind) => {
    TestBed.configureTestingModule({ imports: [Hote] });
    const fixture = TestBed.createComponent(Hote);
    fixture.componentInstance.kind = kind;
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('cdt-result-tag') as HTMLElement;
  };

  for (const genre of GENRES) {
    describe(`genre ${genre}`, () => {
      it('pose la classe du genre sur l’hôte', () => {
        const el = render(genre);
        expect(el.classList.contains('cdt-result')).toBe(true);
        expect(el.classList.contains(`cdt-result--${genre}`)).toBe(true);
      });

      it('affiche une icône masquée aux lecteurs d’écran', () => {
        const svg = render(genre).querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg?.getAttribute('aria-hidden')).toBe('true');
      });

      it('rend le mot fourni par le parent', () => {
        expect(render(genre).textContent).toContain('Mot projeté');
      });
    });
  }
});
