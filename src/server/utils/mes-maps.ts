import type { H3Event } from 'h3';

import type { FaceSummary } from '../../app/modeles/face';
import type { FaceJouee, MesMaps, ModJoue } from '../../app/modeles/mes-maps';
import { callSpring } from './spring';
import { nomDeFace } from './tableau-de-bord';

/**
 * Appelle `/api/faces` au nom du joueur de la requête et renvoie la forme de la page « Mes maps ».
 * L'erreur de Spring, déjà traduite par callSpring, remonte telle quelle.
 */
export async function chargerMesMaps(event: H3Event, fuseau: string): Promise<MesMaps> {
  const faces = await callSpring<FaceSummary[]>(event, '/api/faces');
  return versMesMaps(faces, fuseau);
}

/**
 * Met en forme la réponse de Spring pour la page. Fonction pure, en liste blanche : chaque champ
 * est recopié un par un, un champ ajouté un jour par Spring n'arrive pas au navigateur.
 *
 * L'ordre est fixé ici, et pas laissé à Spring : le rendu serveur et le navigateur partent de la
 * même liste, et deux faces jouées à la même milliseconde gardent toujours le même ordre.
 */
export function versMesMaps(faces: FaceSummary[], fuseau: string): MesMaps {
  const jouees: FaceJouee[] = faces
    .map((face) => ({
      sid: face.sid,
      side: face.side,
      nom: nomDeFace(face.mapName, face.sid),
      mod: modDe(face.sid),
      tentatives: face.attempts,
      deathless: face.clears,
      dernierePartie: face.lastPlayedAt,
    }))
    .sort(
      (a, b) =>
        b.dernierePartie - a.dernierePartie || comparer(a.sid, b.sid) || comparer(a.side, b.side),
    );

  const parMod = new Map<string, number>();
  for (const face of jouees) parMod.set(face.mod, (parMod.get(face.mod) ?? 0) + 1);
  const mods: ModJoue[] = [...parMod]
    .map(([nom, nombre]) => ({ nom, faces: nombre }))
    .sort((a, b) => b.faces - a.faces || comparer(a.nom, b.nom));

  return { fuseau, faces: jouees, mods };
}

/**
 * Mod d'une map : le premier segment de son SID (`Celeste/1-ForsakenCity` → `Celeste`). Un SID
 * sans `/` est rangé sous son propre nom plutôt que dans un mod inventé.
 */
function modDe(sid: string): string {
  return sid.split('/').find(Boolean) ?? sid;
}

/**
 * Comparaison par points de code, indépendante de la langue de la machine : `localeCompare`
 * pourrait ranger autrement sur le serveur et dans le navigateur.
 */
function comparer(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
