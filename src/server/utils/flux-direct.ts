import { createError, parseCookies, type H3Event } from 'h3';

import { EVENEMENT_EN_JEU } from '../../app/modeles/direct';
import type { CurrentAttempt } from '../../app/modeles/live';
import { repondreErreur, springError, springUrl } from './spring';
import { versEnJeu } from './tableau-de-bord';

/** Un événement SSE reçu de Spring : `event:` (« message » par défaut) et `data:` joints par `\n`. */
export interface EvenementSse {
  type: string;
  data: string;
}

export interface MorceauSse {
  evenements: EvenementSse[];
  /** Nombre de commentaires (`: ping`) rencontrés : ils prouvent que Spring est vivant. */
  commentaires: number;
  /** Fin du tampon, pas encore terminée par une ligne vide : à recoller au morceau suivant. */
  reste: string;
}

/**
 * Découpe le tampon d'un flux SSE en événements complets. Fonction pure : le morceau lu sur le
 * réseau peut s'arrêter n'importe où, ce qui n'est pas fini revient dans `reste`.
 *
 * Spring écrit `event:snapshot` sans espace après les deux-points, la norme l'autorise : les deux
 * formes sont acceptées.
 */
export function decouperSse(tampon: string): MorceauSse {
  // Un `\r` seul en fin de tampon reste tel quel : le `\n` qui le suit arrivera avec le morceau suivant.
  const texte = tampon.replace(/\r\n/g, '\n');
  const blocs = texte.split('\n\n');
  const reste = blocs.pop() ?? '';
  const evenements: EvenementSse[] = [];
  let commentaires = 0;

  for (const bloc of blocs) {
    let type: string | null = null;
    const donnees: string[] = [];
    for (const ligne of bloc.split('\n')) {
      if (ligne.startsWith(':')) {
        commentaires++;
        continue;
      }
      const deuxPoints = ligne.indexOf(':');
      const champ = deuxPoints === -1 ? ligne : ligne.slice(0, deuxPoints);
      let valeur = deuxPoints === -1 ? '' : ligne.slice(deuxPoints + 1);
      if (valeur.startsWith(' ')) valeur = valeur.slice(1);
      if (champ === 'event') type = valeur;
      else if (champ === 'data') donnees.push(valeur);
    }
    if (type !== null || donnees.length > 0) {
      evenements.push({ type: type ?? 'message', data: donnees.join('\n') });
    }
  }
  return { evenements, commentaires, reste };
}

export interface OptionsFluxDirect {
  /** Délai pour obtenir les en-têtes de Spring ; au-delà, 503. */
  delaiEnTetesMs?: number;
  /** Silence de Spring (ni événement ni `: ping`) au-delà duquel on coupe le navigateur. */
  silenceMaxMs?: number;
  /** Taille au-delà de laquelle un événement jamais terminé (sans ligne vide) fait couper le flux. */
  tamponMaxCaracteres?: number;
}

const RECONNEXION_MS = 5000;

/**
 * Relais du flux `/api/live/stream` de Spring vers le navigateur (#34).
 *
 * Nitro ne recopie pas le flux : il le lit, ne garde que la partie en cours (`EnJeu`, même forme que
 * le tableau de bord) et la renvoie quand elle change. Le navigateur ne voit donc ni les données de
 * session de Spring, ni ses en-têtes, ni un cookie.
 *
 * Avant l'envoi des en-têtes, une erreur a le corps `{ message }` des autres routes ; après, le seul
 * moyen de signaler une coupure est de détruire la connexion (le navigateur se reconnecte seul).
 */
export async function relayerFluxDirect(
  event: H3Event,
  { delaiEnTetesMs = 5000, silenceMaxMs = 45000, tamponMaxCaracteres = 1_000_000 }: OptionsFluxDirect = {},
): Promise<{ message: string } | undefined> {
  if (!parseCookies(event)['JSESSIONID']) {
    return repondreErreur(event, createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Connexion requise' }));
  }

  const res = event.node.res;
  const abandon = new AbortController();
  let clientParti = false;
  let delaiDepasse = false;

  res.on('close', () => {
    clientParti = true;
    abandon.abort();
  });
  const minuteurEnTetes = setTimeout(() => {
    delaiDepasse = true;
    abandon.abort();
  }, delaiEnTetesMs);

  let spring: Response;
  try {
    spring = await fetch(springUrl('/api/live/stream'), {
      headers: { cookie: String(event.node.req.headers.cookie), accept: 'text/event-stream' },
      signal: abandon.signal,
    });
  } catch {
    clearTimeout(minuteurEnTetes);
    if (clientParti) return undefined;
    journaliser(delaiDepasse ? 'en-têtes trop lents' : 'injoignable');
    return repondreErreur(event, createError({ statusCode: 503, statusMessage: 'Service Unavailable', message: 'API indisponible' }));
  }
  clearTimeout(minuteurEnTetes);

  const typeContenu = spring.headers.get('content-type') ?? '';
  if (spring.status !== 200 || !typeContenu.includes('text/event-stream') || !spring.body) {
    void spring.body?.cancel().catch(() => undefined);
    journaliser(spring.status);
    return repondreErreur(event, springError(spring.status === 200 ? 502 : spring.status));
  }

  // Rien de Spring n'est recopié : ni en-têtes, ni Set-Cookie.
  res.statusCode = 200;
  res.setHeader('content-type', 'text/event-stream');
  res.setHeader('cache-control', 'private, no-store, no-transform');
  res.setHeader('x-accel-buffering', 'no');
  res.setHeader('vary', 'Cookie');
  res.flushHeaders();
  res.write(`retry: ${RECONNEXION_MS}\n\n`);

  let minuteurSilence: NodeJS.Timeout | undefined;
  const armerSilence = () => {
    clearTimeout(minuteurSilence);
    minuteurSilence = setTimeout(() => {
      journaliser('silence prolongé');
      abandon.abort();
      res.destroy();
    }, silenceMaxMs);
  };
  armerSilence();

  const lecteur = spring.body.getReader();
  const decodeur = new TextDecoder();
  let tampon = '';
  let dernier: string | undefined;
  try {
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      armerSilence();
      const morceau = decouperSse(tampon + decodeur.decode(value, { stream: true }));
      tampon = morceau.reste;
      // Un Spring qui n'enverrait jamais de ligne vide ferait grossir le tampon sans fin.
      if (tampon.length > tamponMaxCaracteres) {
        journaliser('événement trop volumineux');
        abandon.abort();
        res.destroy();
        break;
      }
      for (const evenement of morceau.evenements) {
        if (evenement.type !== 'snapshot') continue;
        let json: string;
        try {
          const snapshot = JSON.parse(evenement.data) as { current?: CurrentAttempt | null };
          json = JSON.stringify(versEnJeu(snapshot.current ?? null));
        } catch {
          console.error('[direct] événement illisible ignoré');
          continue;
        }
        if (json === dernier) continue;
        dernier = json;
        res.write(`event: ${EVENEMENT_EN_JEU}\ndata: ${json}\n\n`);
      }
      for (let i = 0; i < morceau.commentaires; i++) res.write(': ping\n\n');
    }
    clearTimeout(minuteurSilence);
    res.end();
  } catch {
    clearTimeout(minuteurSilence);
    // Départ du navigateur ou silence prolongé (déjà journalisé) : rien à ajouter.
    if (!clientParti && !res.destroyed) {
      journaliser('réponse interrompue');
      res.destroy();
    }
  }
  return undefined;
}

/** Jamais de cookie ni d'en-tête dans le journal. */
function journaliser(cause: number | string): void {
  const texte = typeof cause === 'number' ? `Spring ${cause}` : cause;
  console.error(`[direct] GET /api/direct → ${texte}`);
}
