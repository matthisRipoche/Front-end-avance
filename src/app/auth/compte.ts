import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type Identifiants = { email: string; password: string };

/**
 * Écritures du compte vers Spring, par le relais /api (navigateur seulement).
 *
 * CSRF : Spring exige l'en-tête X-XSRF-TOKEN, copie du cookie XSRF-TOKEN. L'intercepteur XSRF
 * d'HttpClient l'ajoute tout seul aux écritures vers la même origine que la page (l'intercepteur
 * d'Analog rend l'adresse absolue, mais l'origine reste celle du site). Le cookie n'est posé
 * qu'après un premier GET vers l'API, même quand Spring répond 401 : s'il manque (première
 * visite, pages servies par Node), on le demande avant. Un 403 veut dire que le jeton n'est plus
 * le bon : on en redemande un et on réessaie une fois.
 *
 * Les erreurs HTTP remontent telles quelles (HttpErrorResponse) : chaque page choisit ses messages.
 */
@Injectable({ providedIn: 'root' })
export class Compte {
  private readonly http = inject(HttpClient);

  /** Ouvre la session : Spring pose le cookie JSESSIONID sur l'origine du front. */
  connecter(identifiants: Identifiants): Promise<unknown> {
    return this.ecrire('/api/auth/login', identifiants);
  }

  /** Crée le compte (201). Spring n'ouvre pas de session : il faut se connecter ensuite. */
  creer(identifiants: Identifiants): Promise<unknown> {
    return this.ecrire('/api/auth/register', identifiants);
  }

  private async ecrire(url: string, corps: unknown): Promise<unknown> {
    const envoyer = () => firstValueFrom(this.http.post(url, corps));
    await this.assurerJetonCsrf();
    try {
      return await envoyer();
    } catch (e) {
      if (!(e instanceof HttpErrorResponse) || e.status !== 403) throw e;
      await this.assurerJetonCsrf(true);
      return envoyer();
    }
  }

  /** Fait poser le cookie XSRF-TOKEN par Spring s'il manque (ou toujours, avec `renouveler`). */
  private async assurerJetonCsrf(renouveler = false): Promise<void> {
    if (!renouveler && document.cookie.split('; ').some((c) => c.startsWith('XSRF-TOKEN='))) return;
    // Sans session, Spring répond 401, mais pose le cookie : la réponse elle-même n'importe pas.
    await firstValueFrom(this.http.get('/api/auth/me')).catch(() => undefined);
  }
}
