import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';

import { ReachTrack } from '../../ui/reach-track';
import { ResultTag } from '../../ui/result-tag';
import { RoomBreakdown, RoomStops } from '../../ui/room-breakdown';

const DESCRIPTION =
  'Un mod Everest enregistre chaque tentative de deathless sur Celeste. Le site te montre, face par face, jusqu’où tu vas, où tu tombes, et si tu progresses.';

export const routeMeta = {
  title: 'Celeste Death Tracker · ton deathless, tentative par tentative',
  meta: [
    { name: 'description', content: DESCRIPTION },
    { property: 'og:title', content: 'Celeste Death Tracker' },
    { property: 'og:description', content: DESCRIPTION },
    { property: 'og:type', content: 'website' },
  ],
} satisfies RouteMeta;

// Données d'exemple, fictives : la page le dit en toutes lettres.
const ROOMS = ['b-00', 'b-01', 'b-02', 'b-03', 'b-04', 'b-05', 'b-06', 'b-07', 'b-08', 'b-09', 'b-10', 'b-11'];

interface SampleAttempt {
  fallAt: number | null;
  time: string;
}

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReachTrack, ResultTag, RoomBreakdown],
  templateUrl: './index.page.html',
  styleUrl: './index.page.css',
})
export default class Home {
  protected readonly rooms = ROOMS;

  protected readonly attempts: SampleAttempt[] = [
    { fallAt: 5, time: '01:12' },
    { fallAt: 8, time: '02:05' },
    { fallAt: null, time: '03:48' },
  ];

  protected readonly worstRooms: RoomStops[] = [
    { id: 'b-05', stops: 31 },
    { id: 'b-03', stops: 21 },
    { id: 'b-06', stops: 12 },
    { id: 'b-08', stops: 10 },
  ];
}
