/** Nom du cookie qui porte le fuseau du navigateur, lu par la couche serveur. */
export const COOKIE_FUSEAU = 'tz';

/** Un an : le fuseau change rarement, et chaque connexion le remet à jour. */
const DUREE_COOKIE_S = 31_536_000;

/**
 * Mémorise le fuseau horaire du navigateur dans le cookie `tz`.
 *
 * Pourquoi : la route `GET /api/tableau-de-bord` coupe les jours (« aujourd’hui », séries) dans
 * ce fuseau ; sans cookie, elle retient Europe/Paris (décision D3 de #25, D2 de #24). Le cookie
 * est posé par le navigateur pour être lu par le serveur : il n’est donc pas HttpOnly.
 *
 * Seuls les noms IANA (`Europe/Paris`) sont acceptés par la route : un décalage brut (`+02:00`)
 * ou une valeur vide ne sont pas écrits. Le cookie n’est réécrit que s’il change. Ne lève jamais :
 * un fuseau introuvable ne doit pas faire échouer la connexion.
 */
export function memoriserFuseau(document: Document): void {
  let fuseau: string | undefined;
  try {
    fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return;
  }
  if (!fuseau || fuseau.startsWith('+') || fuseau.startsWith('-')) return;

  try {
    if (lireCookie(document, COOKIE_FUSEAU) === fuseau) return;
    const secure = document.location?.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      `${COOKIE_FUSEAU}=${encodeURIComponent(fuseau)}; Path=/; Max-Age=${DUREE_COOKIE_S}; SameSite=Lax` +
      secure;
  } catch {
    // Cookies bloqués par le navigateur : la route retombera sur Europe/Paris.
  }
}

/** Valeur décodée d'un cookie lisible par la page, ou `undefined` s'il est absent. */
function lireCookie(document: Document, nom: string): string | undefined {
  const brut = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${nom}=`))
    ?.slice(nom.length + 1);
  if (brut === undefined) return undefined;
  try {
    return decodeURIComponent(brut);
  } catch {
    return brut;
  }
}
