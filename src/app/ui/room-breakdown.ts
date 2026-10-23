import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface RoomStops {
  id: string;
  stops: number;
}

// Répartition des arrêts par room : la pire room est la seule en danger.
@Component({
  selector: 'cdt-room-breakdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'cdt-rooms' },
  template: `
    @for (room of rooms(); track room.id) {
      <div class="cdt-rooms__row" [class.cdt-rooms__row--worst]="room.stops === max()">
        <span class="cdt-rooms__id">{{ room.id }}</span>
        <span class="cdt-rooms__track"><span class="cdt-rooms__bar" [style.width.%]="(room.stops / max()) * 100"></span></span>
        <span class="cdt-rooms__count">{{ room.stops }}</span>
      </div>
    }
  `,
})
export class RoomBreakdown {
  readonly rooms = input.required<RoomStops[]>();

  protected readonly max = computed(() => Math.max(1, ...this.rooms().map((room) => room.stops)));
}
