import { createError, getQuery, type H3Event } from 'h3';

import type { DetailFace, IssueTentative } from '../../app/modeles/detail-face';
import type { AttemptResult, FaceDetail, Side } from '../../app/modeles/face';
import { modDe } from './mes-maps';
import { callSpring } from './spring';
import { nomDeFace } from './tableau-de-bord';

const SIDES: readonly string[] = ['A', 'B', 'C'];
const LONGUEUR_MAX_SID = 255;
const SEMAINE_MS = 7 * 24 * 3600 * 1000;

const MESSAGE_SID_OBLIGATOIRE = 'Le paramètre sid est obligatoire.';
const MESSAGE_SID_INVALIDE = 'Le paramètre sid doit être un identifiant de map de 1 à 255 caractères.';
const MESSAGE_SIDE_INVALIDE = 'Le paramètre side doit valoir A, B ou C.';

function requeteInvalide(message: string) {
  // Le texte va dans `message` : h3 retire les accents de `statusMessage`.
  return createError({ statusCode: 400, statusMessage: 'Bad Request', message });
}

/**
 * Lit et valide `?sid=…&side=…` SANS appeler Spring : une requête fausse est refusée ici, en 400
 * lisible, et ne coûte aucun appel. Ordre : sid d'abord, puis side.
 *
 * Principe : on valide ce qui a un sens (présence, type, taille, caractères de contrôle) et on
 * n'invente pas de règle que Spring n'a pas. En particulier, pas de liste blanche de caractères
 * pour le SID : ceux d'Everest sont des chemins de fichiers de mods (espaces, accents,
 * apostrophes, `+`, `&`…), une liste blanche refuserait des maps réelles.
 * Cela ne pose aucun risque : le SID ne part chez Spring qu'en paramètre de requête encodé
 * (`URLSearchParams`), jamais collé dans un chemin ni dans une commande ; `/`, `&` ou `?` y
 * deviennent `%2F`, `%26`, `%3F` et ne peuvent rien injecter.
 * `side` est strict (majuscules), comme Spring.
 */
export function lireFace(event: H3Event): { sid: string; side: Side } {
  const query = getQuery(event);

  const sid = query['sid'];
  if (sid === undefined || sid === '') throw requeteInvalide(MESSAGE_SID_OBLIGATOIRE);
  if (
    // `?sid=a&sid=b` donne un tableau : un seul identifiant est attendu.
    typeof sid !== 'string' ||
    sid.length > LONGUEUR_MAX_SID ||
    // Caractères de contrôle (NUL, retour à la ligne, DEL…) : jamais dans un identifiant, et
    // dangereux dans les journaux et les en-têtes.
    /[\u0000-\u001f\u007f]/.test(sid) ||
    // Une espace en bord est presque sûrement une erreur de copier-coller.
    sid !== sid.trim()
  ) {
    throw requeteInvalide(MESSAGE_SID_INVALIDE);
  }

  const side = query['side'];
  if (typeof side !== 'string' || !SIDES.includes(side)) throw requeteInvalide(MESSAGE_SIDE_INVALIDE);

  return { sid, side: side as Side };
}

/**
 * Appelle `/api/faces/detail` au nom du joueur et renvoie la forme de la page. L'encodage du `/`
 * du SID en `%2F` est fait par `callSpring` (`URLSearchParams`).
 * Spring répond 404 pour une face sans tentative : on garde un 404 avec un message précis.
 */
export async function chargerDetailFace(
  event: H3Event,
  sid: string,
  side: Side,
  fuseau: string,
): Promise<DetailFace> {
  let detail: FaceDetail;
  try {
    detail = await callSpring<FaceDetail>(event, '/api/faces/detail', { query: { sid, side } });
  } catch (e) {
    if ((e as { statusCode?: number } | null)?.statusCode === 404) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Aucune tentative sur cette face' });
    }
    throw e;
  }
  return versDetailFace(detail, fuseau, Date.now());
}

const ISSUES: Record<AttemptResult, IssueTentative> = {
  success: 'deathless',
  death: 'chute',
  abandoned: 'abandon',
  ongoing: 'en-cours',
};

/**
 * Traduit le résultat d'une tentative. La réponse de Spring n'est pas validée à l'exécution : un
 * résultat inconnu (ajouté un jour côté Spring) deviendrait `undefined` et ferait planter la page.
 * Mieux vaut afficher une tentative neutre (`abandon` : ni deathless, ni chute) qu'une face entière
 * en erreur.
 */
function issueDe(result: AttemptResult): IssueTentative {
  return ISSUES[result] ?? 'abandon';
}

/**
 * Met en forme la réponse de Spring. Fonction pure, en liste blanche : chaque champ est recopié un
 * par un, un champ ajouté par Spring n'arrive pas au navigateur. `maintenant` est passé en
 * argument pour que le test fixe l'horloge.
 */
export function versDetailFace(detail: FaceDetail, fuseau: string, maintenant: number): DetailFace {
  const limiteSemaine = maintenant - SEMAINE_MS;
  return {
    fuseau,
    // `en-CA` écrit la date en AAAA-MM-JJ.
    aujourdhui: new Intl.DateTimeFormat('en-CA', {
      timeZone: fuseau,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(maintenant),
    sid: detail.sid,
    side: detail.side,
    nom: nomDeFace(detail.mapName, detail.sid),
    mod: modDe(detail.sid),
    dernierePartie: detail.recent[0]?.startedAt ?? null,
    tentatives: detail.attempts,
    tentativesSemaine: detail.evolution.filter((p) => p.startedAt >= limiteSemaine).length,
    deathless: detail.clears,
    tauxDeathless: detail.clearRate,
    meilleurDeathlessMs: detail.bestClearMs,
    tenueMaxMs: detail.longestMs,
    tenueMaxRoom: detail.longestEndRoom,
    rooms: detail.rooms.map((r) => ({ room: r.room, arrets: r.endings, morts: r.deaths })),
    evolution: detail.evolution.map((p) => ({
      id: p.attemptId,
      debut: p.startedAt,
      dureeMs: p.durationMs,
      issue: issueDe(p.result),
    })),
    recentes: detail.recent.map((t) => ({
      id: t.id,
      debut: t.startedAt,
      issue: issueDe(t.result),
      dureeMs: t.durationMs,
      roomFin: t.endRoom,
      roomsFranchies: t.roomsCleared,
      morts: t.deaths,
    })),
  };
}
