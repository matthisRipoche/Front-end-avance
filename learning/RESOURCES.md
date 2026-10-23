# Ressources : front Analog.js et serveur Node

## Connaissances

- [Documentation d'Analog : Routing overview](https://analogjs.org/docs/features/routing/overview)
  Routage par fichiers, routes dynamiques, groupes, routes attrape-tout. Pour : toute nouvelle page.
- [Documentation d'Analog : Route Metadata](https://analogjs.org/docs/features/routing/metadata)
  `routeMeta` : titre, balises meta, gardes, redirections. Pour : le `<head>` des pages, les gardes de l'étape 3.
- [Documentation d'Analog : Server Side Rendering](https://analogjs.org/docs/features/server/server-side-rendering)
  SSR activé par défaut, prérendu (`prerender.routes`), routes rendues seulement dans le navigateur. Pour : choisir SSR ou SSG.
- [angular.dev : Hydration](https://angular.dev/guide/hydration)
  Ce que fait l'hydratation, `provideClientHydration`, `withEventReplay`. Pour : comprendre ce qui se passe après l'arrivée du HTML.
- Guide livré avec la version installée d'Analog : `node_modules/@analogjs/platform/AGENTS.md`
  Conventions de la version 2.9 (routage, routes serveur, chargement de données, contenu). Pour : vérifier qu'une doc en ligne correspond à la version installée.

## Sagesse (communautés)

- [Discord d'Analog](https://chat.analogjs.org)
  Communauté officielle, mainteneurs présents. Pour : questions qui dépassent la doc.

## Manques

- Nitro (routes serveur, middlewares, relais) : à ajouter avant l'étape 3 (https://nitro.build).
