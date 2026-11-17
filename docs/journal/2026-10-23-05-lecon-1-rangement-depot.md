## 2026-10-23 — Leçon 1 et rangement du dépôt

**Leçon 1 (skill `teach`) : ce que renvoie le serveur quand on demande `/`.** En la préparant, l'agent a vérifié dans la documentation et dans les en-têtes HTTP de la production qu'Analog **prérend `/` au build** (SSG) : l'accueil n'est pas rendu à chaque requête, contrairement à `/design-system`. **Correction de l'agent** : le titre de la PR #40, « page d'accueil rendue côté serveur », était imprécis. La leçon part de cette surprise, avec trois vérifications à faire dans le terminal (`curl`, en-têtes `last-modified` et `etag`, fichier dans `dist/`).

**Question de l'utilisateur** : « est-ce que SSG donne la responsabilité de construire la page au client ? » C'est une confusion avec le rendu navigateur. L'agent a répondu par la question qui sépare les trois modes : qui fabrique le HTML, et quand ? Puis il a expliqué les avantages du SSG et du SSR, appliqués aux pages du projet. Les questions de vérification restent à faire.

**Rangement, à la demande de l'utilisateur** : « range tout ce qui s'apparente à du déploiement dans le dossier du même nom, et propose-moi d'autres modifications de ce type ».
- `Dockerfile`, `.dockerignore` et `docker-compose.prod.yml` passent dans `deploy/`. Le `.dockerignore` devient `Dockerfile.dockerignore`, le nom que BuildKit lit à côté du Dockerfile.
- Seul le workflow reste dans `.github/workflows/`, parce que GitHub l'exige.
- Docker Desktop ne tournait pas, donc le déplacement ne pouvait pas être vérifié en local. L'agent a fait construire l'image Docker sur chaque PR, sans la publier : un Dockerfile cassé se voit désormais avant la fusion, et non plus en production.
- Autres propositions, toutes validées :
  - README réécrit en français ;
  - `angular.json` supprimé (reste du gabarit, lu seulement par les commandes `ng`) ;
  - paquet renommé ;
  - vitrine du design system regroupée dans son dossier ;
  - `PRODUCT.md` et `skills-lock.json` laissés à la racine, où leurs outils les cherchent ;
  - une issue pour le favicon.
