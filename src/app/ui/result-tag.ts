import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ResultKind = 'success' | 'fall' | 'deathless';

// Étiquette de résultat : couleur, forme et mot, jamais la couleur seule.
// Le mot est fourni par le parent (contenu projeté).
@Component({
  selector: 'cdt-result-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"cdt-result cdt-result--" + kind()' },
  template: `
    @switch (kind()) {
      @case ('success') {
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" /></svg>
      }
      @case ('fall') {
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>
      }
      @case ('deathless') {
        <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 15c-3-1.4-5.5-4.3-5.5-7.3C2.5 5.6 4 4.5 5.6 4.5c.9 0 1.7.3 2.4.9.7-.6 1.5-.9 2.4-.9 1.6 0 3.1 1.1 3.1 3.2 0 3-2.5 5.9-5.5 7.3z" /><path fill="currentColor" d="M5.2 3.2L8 4.4l2.8-1.2L8 1.2z" /></svg>
      }
    }
    <ng-content />
  `,
  styles: `
    svg { width: 14px; height: 14px; flex: none; }
  `,
})
export class ResultTag {
  readonly kind = input.required<ResultKind>();
}
