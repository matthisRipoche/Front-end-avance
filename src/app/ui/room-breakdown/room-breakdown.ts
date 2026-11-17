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
  templateUrl: './room-breakdown.html',
})
export class RoomBreakdown {
  readonly rooms = input.required<RoomStops[]>();

  protected readonly max = computed(() => Math.max(1, ...this.rooms().map((room) => room.stops)));
}
