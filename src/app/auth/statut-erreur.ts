import { HttpErrorResponse } from '@angular/common/http';

/**
 * Statut HTTP d'une erreur d'appel `HttpClient`, ou 0 s'il est inconnu (réseau coupé, bug).
 *
 * Deux formes coexistent : dans le navigateur, `HttpClient` rejette une `HttpErrorResponse` ;
 * pendant le SSR, `requestContextInterceptor` d'Analog passe par `$fetch` (ofetch), qui rejette
 * une `FetchError` portant `status` et `statusCode`, sans passer par `HttpErrorResponse`.
 */
export function statutErreur(e: unknown): number {
  if (e instanceof HttpErrorResponse) return e.status;
  if (typeof e === 'object' && e !== null) {
    const { status, statusCode } = e as { status?: unknown; statusCode?: unknown };
    if (typeof status === 'number') return status;
    if (typeof statusCode === 'number') return statusCode;
  }
  return 0;
}
