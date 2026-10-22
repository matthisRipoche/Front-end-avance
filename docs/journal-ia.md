# Journal de l'IA

Pour chaque étape : la demande, la proposition de l'agent, ce qui a été validé ou corrigé, et pourquoi. C'est la matière de l'oral sur l'organisation de travail avec l'IA agentique.

Agent : Claude Code (modèle Claude Opus 5.5).

---

## 2026-10-22 — Cadrage et passation

**Demande.** Démarrer le projet de cours à partir d'une note de passation rédigée lors d'une session précédente avec l'agent (sujet, décisions déjà prises, plan, contraintes de production, pièges d'environnement).

**Proposition de l'agent.** Ne rien coder tout de suite. Reformuler le plan en 6 étapes (0 : dépôt et organisation de l'agent ; 1 : squelette en production dès le début ; 2 : pages publiques SSR/SSG ; 3 : relais `/api` et connexion ; 4 : pages connectées ; 5 : finitions et oral). Poser les questions bloquantes : échéance, nom et emplacement du dépôt.

**Validé / corrigé.**
- Plan validé tel quel.
- Emplacement : le dossier déjà créé `~/projects/front-end-avance`, et non celui proposé dans la passation.
- Échéance : 3 jours de cours + 3 à 4 semaines à la maison. Le plan complet tient.

**Pourquoi.** La passation permet de reprendre le travail sans perdre le contexte d'une session à l'autre. L'agent présente le plan avant de coder, parce que l'utilisateur doit garder la main sur les décisions structurantes.

---

## 2026-10-22 — Création du projet

**Demande.** Monter le dépôt.

**Proposition de l'agent.** Lire le code de `create-analog@2.9.1` avant de le lancer, pour connaître ses options et ne pas répondre à l'aveugle aux questions interactives. Utiliser le gabarit `latest` (Angular 22, Vite 8), **sans Tailwind** : le design system Topo du projet d'origine est déjà en CSS (jetons + classes `.ds-*`).

**Résultat.** Le build (client, SSR, prérendu, serveur Nitro) et le test d'exemple passent.

**Points notables.**
- Le générateur a fait lui-même un premier commit `initial commit` sur la branche par défaut. Elle a été renommée `main` ; ce commit sert de racine, et tout le reste passe par des branches.
- Le gabarit fournit un `AGENTS.md` qui renvoie au guide pour agents IA livré **dans le paquet** `@analogjs/platform`. Il est conservé : les conventions restent alignées sur la version installée au lieu d'une copie qui vieillit.
- `npm audit` signale 16 vulnérabilités dans les dépendances générées. À examiner plus tard, sans `npm audit fix --force`, qui peut changer de version majeure.

---

## 2026-10-22 — Répartition des rôles et `CLAUDE.md`

**Question de l'agent.** Qui écrit le code ? L'agent a proposé trois options : il implémente tout ; mode mixte ; l'utilisateur code et l'agent guide.

**Validé.** **Mode mixte** :
- l'agent fait l'outillage (Docker, CI, configuration) ;
- la première fois qu'un concept d'Analog apparaît, l'agent explique, prépare un squelette avec des `TODO`, l'utilisateur écrit le cœur du code, puis l'agent relit ;
- les cas répétitifs reviennent ensuite à l'agent.

**Pourquoi.** Le cours demande une organisation qui fait comprendre les concepts. Si l'agent implémente tout, ça va plus vite mais le code reste une boîte noire. Si l'utilisateur code tout, le projet risque de ne pas tenir dans le délai.

**Mis en place.**
- `CLAUDE.md` : cadre du cours, mode mixte, journal, Git, commandes, architecture, design, production, pièges.
- `docs/api-spring.md` : contrat de l'API sorti du `CLAUDE.md`, pour que celui-ci reste court.
- Skill `commit` adapté : commandes `npm`, portées du projet, rappel du journal avant la PR, ne pas réécrire le code de l'utilisateur.
- Skill `teach` adapté : espace `learning/`, chaque nouveau concept se termine par un exercice dans le vrai code.
- `learning/MISSION.md` : la mission d'apprentissage.
