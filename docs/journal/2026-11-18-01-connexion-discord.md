## 2026-11-18 — Connexion avec Discord (#35), un blocage mesuré en production avant de coder

**Demande** : prendre #35 comme exemple pour l'oral (diapos « Une issue, de bout en bout »). L'utilisateur prend les captures, et l'agent s'arrête à chaque étape pour lui dire quoi capturer. L'agent a d'abord précisé qu'il ne peut pas capturer l'interface de l'app lui-même.

**Plan** : le `planner` a lu le code Spring (`~/projects/CelesteDeathTracker`). Spring construit l'adresse de retour Discord (`redirect_uri`) à partir des en-têtes `X-Forwarded-*`. Il a anticipé un **blocage possible** : en production, le front joint Spring en passant par le Traefik partagé, qui réécrit probablement `X-Forwarded-Host`. Discord renverrait alors le joueur sur l'ancien site. Il a proposé un test à faire avant tout code (« étape 0 »), un contournement, et 5 décisions.

**Décisions de l'utilisateur** :
- **D1** : le relais calcule l'origine publique (`X-Forwarded-*`) ;
- **D3** : la page demandée est retenue dans un cookie court et rendue par une 302 côté serveur ;
- **D4** : le bouton s'affiche selon `/api/auth/providers`, lu pendant le SSR ;
- **D5** : bouton **avec le logo Discord**, contre la recommandation de l'agent (texte seul) ; l'exception est notée dans `conventions-analog` ;
- **étape 0** : à lancer par l'agent, par SSH.

**Étape 0, mesurée en production** (une requête en lecture seule depuis le conteneur du front) :
- **par Traefik** : `redirect_uri` sur `celeste.matthisripoche.com`, donc **cassé** ;
- **en joignant directement le nginx de l'ancien projet** (`http://celeste-web-1`, réseau Docker `frontend`) : `redirect_uri` sur `new-celeste`, donc **correct**.

**D2**, validée : joindre Spring par `celeste-web-1`. La règle « Spring joint par son adresse publique » change dans `CLAUDE.md`, `deploy/` et `docs/`.

**Développement** : trois lots en parallèle, aux fichiers disjoints, puis la documentation.
- **Relais** : `redirect: 'manual'`, en-têtes d'origine calculés, `Location` absolue réécrite en chemin relatif.
- **Route `/api/connexion/discord`** : cookie `retour-connexion`, et redirection du joueur connecté sur `/login`.
- **Page `/login`** : résolveur `providers`, bouton, alerte d'échec.

**Vérification et relecture** :
- **Premier tour** : le `verifier` a tout validé, contre un faux Spring qui simule le flux OAuth2. Le `reviewer` a relevé un point à corriger et six mineurs. Le point à corriger : le résolveur `providers` attendait Spring sans délai, alors qu'un Spring lent aurait bloqué `/login` plusieurs minutes.
- **Corrections choisies** par l'utilisateur (« Plan modifié ») :
  - délai de 2 s ;
  - une `Location` en `//` laissée intacte, plutôt que transformée en adresse externe ;
  - cookie périmé effacé ;
  - valeur par défaut de `API_URL` passée à `http://celeste-web-1` dans la CI. Sans ce changement, oublier la variable aurait cassé Discord sans aucune erreur visible.
- **Second tour** : `verifier` OK (`/login` répond en 2,1 s avec un Spring muet), `reviewer` « fusionnable ».

**Erreurs et limites** :
- **L'agent ne voit pas son interface** : les captures sont faites par l'utilisateur, qui suit les indications de l'agent.
- **Logo Discord** : il a été écrit de mémoire par l'agent `dev`. Le `reviewer` a seulement vérifié que le tracé était cohérent. Il reste à le regarder à l'écran.
- **Mineur restant** : en SSR, le délai libère le rendu mais n'annule pas la requête vers Spring, parce que l'intercepteur d'Analog n'a pas de signal d'annulation.
- **Mineurs laissés par l'utilisateur** :
  - caractère non ASCII dans `?redirect=` ;
  - nouvel appel à `providers` à l'hydratation après une erreur ;
  - alerte d'échec si `/me` est en panne au retour.
- **Reste à faire par l'utilisateur** :
  - déclarer les adresses de retour dans le portail Discord ;
  - tester de bout en bout avec le vrai Discord.

**Pour l'oral** : le risque principal venait de l'infrastructure, pas du code. Le planner l'a déduit en lisant le code de Spring, une seule requête en production l'a confirmé avant d'écrire une ligne, et le contournement a été testé de la même façon. Sans cette étape 0, les tests et le faux Spring auraient tous été verts, et la fonctionnalité aurait été cassée en production.
