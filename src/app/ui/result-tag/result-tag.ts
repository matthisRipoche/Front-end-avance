import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ResultKind = 'success' | 'fall' | 'deathless';

// Étiquette de résultat : couleur, forme et mot, jamais la couleur seule.
// Le mot est fourni par le parent (contenu projeté).
@Component({
  selector: 'cdt-result-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"cdt-result cdt-result--" + kind()' },
  templateUrl: './result-tag.html',
  styleUrl: './result-tag.css',
})
export class ResultTag {
  readonly kind = input.required<ResultKind>();
}
