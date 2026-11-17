---
name: review-analog
description: Méthode et grille de relecture du projet Celeste Tracker (Analog SSR/SSG, serveur Nitro, API Spring) - niveaux de gravité, scénario d'échec obligatoire, pièges SSR, hydratation, cookies et CSRF, cache, conventions, tests, et ce qu'il ne faut pas signaler. À charger pour relire un diff ou une PR de ce projet.
---

# Relire un changement dans ce projet

Les règles de code sont dans le skill `conventions-analog`, celles de la couche serveur dans `bff-spring`, celles des tests dans `tests-analog`. Ce skill dit **comment relire** et **où chercher**.

## Méthode

1. **Le contexte d'abord** : l'issue (`gh api repos/{owner}/{repo}/issues/<n> --jq '.title, .body'` : `gh issue view` échoue dans ce dépôt) et le plan validé. Tu relis un écart à une intention, pas seulement du code.
2. **Le diff entier** : `git diff main...HEAD --stat`, puis `git diff main...HEAD`, et `git diff` pour ce qui n'est pas commité. Lis les fichiers nouveaux en entier.
3. **Pour chaque fichier, demande-toi où il s'exécute** : au build (prérendu), sur le serveur Node (SSR, route Nitro), dans le navigateur, ou plusieurs. La plupart des bugs de ce projet viennent d'un code écrit pour un endroit et exécuté dans un autre.
4. **Suis les données** : de Spring à la route Nitro, à la page, au HTML envoyé. Que se passe-t-il si Spring répond 401, 404, 500, une liste vide, un champ `null` ?
5. **Vérifie avant d'affirmer** : ouvre le fichier appelé, la définition du type, la doc (`docs/api-spring.md`). Un point que tu n'as pas pu vérifier est marqué « à vérifier », pas présenté comme un bug.

## Grille, par priorité

### Sécurité et données privées
- Une page **prérendue** (liste `prerender.routes` de `vite.config.ts`) ou mise en cache ne contient **aucune donnée de compte** : elle serait servie à tout le monde.
- Les routes Nitro qui appellent Spring relaient le cookie de session **de la requête en cours**, jamais un cookie gardé dans une variable de module (partagée entre utilisateurs).
- Les écritures (POST, PUT, DELETE) portent `X-XSRF-TOKEN`.
- Paramètres de requête validés avant d'atteindre Spring (type, présence, valeurs permises comme `side` ∈ A, B, C).
- Aucun secret, mot de passe ou adresse de production en dur. L'adresse de Spring passe par `springUrl()`.
- Une erreur de Spring n'est pas renvoyée brute au navigateur (trace, message interne).

### Rendu serveur et hydratation
- `window`, `document`, `localStorage`, `navigator` utilisés au chargement d'un composant : plantage du SSR.
- Template initial qui diffère entre serveur et navigateur (date courante, `Math.random()`, état lu dans le navigateur) : écart d'hydratation, contenu qui clignote.
- Page connectée : la redirection vers le login se fait **côté serveur** (garde ou `load`), pas après affichage dans le navigateur.
- Statut HTTP correct pendant le SSR (404 avec `injectResponse()`, pas un 200 avec un texte « introuvable »).
- Abonnement, minuterie ou flux (SSE) ouvert pendant le SSR et jamais fermé : la réponse ne se termine pas.

### Logique et cas limites
- Cas vides : aucune face jouée, `resume: null`, liste vide, pagination en dernière page.
- SID avec des `/` : toujours en paramètre de requête, encodé, jamais dans le chemin.
- Fuseau horaire : les dates du tableau de bord dépendent de `tz`.
- Erreurs : chaque `await` vers Spring a un chemin d'échec traduit (voir `bff-spring`).

### Architecture
- Appel direct à Spring depuis le navigateur alors qu'une route Nitro existe ou devrait exister.
- Logique de serveur (appel HTTP, transformation de réponse) écrite dans un composant.
- Fichier `.spec.ts` dans `src/server/routes/` sans la règle `nitro.ignore` (il deviendrait une route).
- `.md` ajouté sous `src/app/pages/` ou `src/content/` sans être voulu comme page.

### Conventions (voir `conventions-analog`)
- `template:` ou `styles:` en ligne, couleur en dur, classe hors `.cdt-*` / `.t-*` qui existe déjà, deux éléments dorés, information portée par la couleur seule, asset de Celeste, texte non français.

### Tests (voir `tests-analog`)
- Comportement nouveau sans test ; test qui passerait même si le code était faux (assertion vide, `toBeTruthy` sur un objet toujours présent) ; route serveur sans test des cas d'erreur.

## Gravité

| Niveau | Sens | Exemples |
|---|---|---|
| **Bloquant** | Faille, perte de données, plantage, ou demande non remplie. On ne fusionne pas. | Donnée de compte dans une page prérendue, SSR qui plante, cookie partagé entre utilisateurs |
| **À corriger** | Bug réel dans un cas plausible, ou règle du projet enfreinte. | 500 renvoyé brut, cas `null` non géré, style en ligne, test manquant |
| **Mineur** | Améliore sans changer le comportement. Listé, pas imposé. | Nom peu clair, duplication légère, commentaire qui décrit au lieu d'expliquer |

## Format d'un point

```
[À corriger] src/server/routes/api/faces.get.ts:18
Problème : la réponse 401 de Spring est renvoyée en 500.
Scénario : session expirée → GET /api/faces → le navigateur reçoit 500 au lieu de rediriger vers le login.
Correction : traduire le 401 de Spring en 401 (createError).
```

Pas de scénario d'échec concret = pas un bug : c'est au mieux « à vérifier » ou « mineur ».

## Ne pas signaler

- Les questions de goût sans règle du projet derrière.
- Ce qui est hors du diff, sauf si le diff le casse.
- Un choix déjà tranché dans le plan validé ou dans `CLAUDE.md`, même si tu aurais fait autrement.
- Le formatage, tant qu'il suit les fichiers voisins.

Si tout est correct, dis-le en une ligne. Une relecture courte et juste vaut mieux qu'une liste longue.
