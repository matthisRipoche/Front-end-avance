import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type Cell = 'done' | 'fall' | 'todo' | 'deathless';

// Trajectoire d'une tentative : une case par room de la face.
// `fallAt` = index de la room où la tentative s'est arrêtée ; absent = deathless.
@Component({
  selector: 'cdt-reach-track',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    '[class]': '"cdt-reach" + (deathless() ? " cdt-reach--deathless" : "")',
    '[style.--rooms]': 'rooms()',
    '[attr.aria-label]': 'label()',
  },
  template: `
    @for (cell of cells(); track $index) {
      <span class="cdt-reach__cell" [class.cdt-reach__cell--done]="cell === 'done'" [class.cdt-reach__cell--fall]="cell === 'fall'"></span>
    }
  `,
})
export class ReachTrack {
  readonly rooms = input.required<number>();
  readonly fallAt = input<number | null>(null);
  readonly fallRoom = input('');

  protected readonly deathless = computed(() => this.fallAt() === null);

  protected readonly cells = computed<Cell[]>(() => {
    const fallAt = this.fallAt();
    return Array.from({ length: this.rooms() }, (_, i) =>
      fallAt === null ? 'deathless' : i < fallAt ? 'done' : i === fallAt ? 'fall' : 'todo',
    );
  });

  protected readonly label = computed(() => {
    const fallAt = this.fallAt();
    return fallAt === null
      ? `Tentative deathless, ${this.rooms()} rooms sur ${this.rooms()}`
      : `Tentative arrêtée en ${this.fallRoom() || `room ${fallAt + 1}`}, room ${fallAt + 1} sur ${this.rooms()}`;
  });
}
