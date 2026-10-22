# Mission : un front Analog.js compris, en production, et l'organisation avec l'agent pour le raconter

## Why
Rendre un projet de cours noté sur le front : un nouveau front pour CelesteDeathTracker en Analog.js, déployé en production, puis présenter à l'oral comment l'organisation de travail avec l'agent m'a fait comprendre les concepts au lieu de produire une boîte noire.

## Success looks like
- Expliquer, sur mes propres pages, la différence entre rendu serveur (SSR), génération au build (SSG) et rendu côté navigateur, et dire pourquoi j'ai choisi l'un ou l'autre.
- Expliquer l'hydratation et le routage par fichiers d'Analog.
- Expliquer le relais `/api` vers Spring, et pourquoi la session et le CSRF fonctionnent sans CORS.
- Écrire et tester des routes serveur Nitro (couche dédiée au front) qui appellent Spring, valident les paramètres et traduisent les erreurs.
- Expliquer comment le serveur vérifie la connexion pendant le rendu SSR, et pourquoi ça évite le clignotement.
- Avoir écrit moi-même le cœur de la première occurrence de chaque concept.
- Présenter à l'oral mon organisation avec l'agent (CLAUDE.md, skills, journal), avec des exemples tirés de `docs/journal-ia.md`.

## Constraints
- 3 jours de cours + 3 à 4 semaines à la maison, à partir du 2026-10-22.
- Mode mixte : l'agent fait l'outillage, j'écris le cœur des nouveaux concepts.

## Out of scope
- Modifier l'API Spring.
- Approfondir Docker, Traefik ou la CI au-delà de ce qu'il faut pour mettre en ligne.
