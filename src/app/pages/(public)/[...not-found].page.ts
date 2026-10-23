import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RouteMeta } from '@analogjs/router';
import { injectResponse } from '@analogjs/router/tokens';

export const routeMeta = {
  title: 'Page introuvable · Celeste Death Tracker',
  meta: [{ name: 'robots', content: 'noindex' }],
} satisfies RouteMeta;

// Attrape-tout : toute adresse qu'aucune autre page ne prend arrive ici.
// Pendant le rendu serveur, injectResponse() donne la réponse HTTP de Node : on y pose
// le statut 404, sinon le navigateur et les moteurs de recherche recevraient un 200.
// Dans le navigateur, il n'y a pas de réponse HTTP à modifier : injectResponse() renvoie null.
@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './[...not-found].page.html',
  styleUrl: './[...not-found].page.css',
})
export default class NotFound {
  constructor() {
    const response = injectResponse();
    if (response) {
      response.statusCode = 404;
    }
  }
}
