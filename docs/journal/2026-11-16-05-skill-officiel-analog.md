## 2026-11-16 — Skill officiel d'Analog

**Demande** : « installe les skills de développement Analog ». Elle fait suite au diagnostic du prérendu, où l'utilisateur regrettait de ne pas avoir pris « les skills Analog classiques ».

**Recherche de l'agent** (`npx skills find`, dépôts GitHub de l'éditeur) :
- `analogjs/angular-skills`, en tête des résultats (jusqu'à 11,8 K installations), est marqué **DEPRECATED** par l'éditeur, qui renvoie vers `angular/skills`. C'est le pack obsolète déjà rencontré le 2026-10-23, et son remplaçant est déjà installé (`angular-developer`).
- Les skills du dépôt `analogjs/analog` (`.agents/skills`) servent aux mainteneurs du framework (traiter une issue d'Analog, ouvrir une PR), pas à une application.
- Le seul skill de développement Analog est **officiel et livré dans le paquet** : `node_modules/@analogjs/platform/skills/analogjs/SKILL.md`, manifeste Agent Plugins `plugin.json`, même contenu que l'`AGENTS.md` du paquet.

**Fait** : `.claude/skills/analogjs` est un **lien symbolique** vers ce dossier de `node_modules`, au lieu d'une copie. Le skill suit ainsi la version d'Analog installée, selon le même principe que l'`AGENTS.md` du gabarit. Il est préchargé par `dev`, `planner` et `reviewer`, et référencé dans `conventions-analog` et `CLAUDE.md`.

**À dire honnêtement à l'oral** : ce skill n'aurait pas évité le bug du prérendu. Il dit de placer les tests à côté du fichier (`*.spec.ts`), et le bug venait d'une course dans le plugin Angular, qu'aucune documentation ne décrit. Son intérêt est ailleurs : la source officielle des conventions, à jour avec la version.

**Limite** : le lien est cassé tant que `npm install` n'a pas été lancé (clone neuf). Sans conséquence pour la CI et l'image Docker, qui n'utilisent pas `.claude/`.

**Erreur de l'agent, rattrapée en fusionnant la PR** : le lien symbolique ne marchait pas sur le poste de l'utilisateur. Le mode développeur de Windows est désactivé, donc Git pour Windows a cloné avec `core.symlinks=false` et a sorti le lien comme un fichier texte contenant le chemin : le skill ne se chargeait pas, et les agents ne le préchargeaient pas. L'agent ne l'avait pas vérifié avant la PR. À la question « pourquoi un lien symbolique ? », l'agent a présenté trois options (activer le mode développeur, script `postinstall` qui copie le skill, copie commitée) et recommandé la copie, la plus simple. L'utilisateur l'a validée : `.claude/skills/analogjs/SKILL.md` est une copie du skill d'Analog 2.9.1, **à recopier à chaque mise à jour d'Analog**. Le skill apparaît bien dans la liste des skills chargés de la session.

**Pour l'oral** : un choix « élégant » (suivre la version automatiquement) s'est révélé fragile sur la vraie machine. Vérifier le résultat là où il sert, pas seulement dans Git.
