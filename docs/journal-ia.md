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

---

## 2026-10-22 — L'utilisateur prend la main : premier commit et point sur l'existant

**Ce qui s'est passé.**
- L'agent avait préparé une branche `chore/organisation-agent` et proposé deux commits. L'utilisateur a créé le dépôt GitHub et poussé lui-même un `first commit` sur `main`. Pour le tout premier commit, ce n'est pas un problème : la règle « jamais sur `main` » s'applique dès que `main` existe sur GitHub.
- L'agent a voulu enchaîner sur la mise en production. L'utilisateur l'a **interrompu** : « avant je voudrais être sûr de sur quoi on part ». L'agent a alors fait le point à partir des vrais fichiers : la pile (Angular, Analog, Vite, Nitro), le rôle de chaque fichier généré, ce qui est décidé et ce qui ne l'est pas.

**Pourquoi c'est notable.** L'agent avance vite par défaut. C'est à l'utilisateur de garder le rythme qui lui permet de comprendre. L'agent l'a enregistré dans sa mémoire : faire le point sur l'existant avant d'ouvrir l'étape suivante.

---

## 2026-10-22 — Correction : la partie Node est aussi notée

**Correction de l'utilisateur.** La passation disait « seul le front est noté ». C'était faux : **la partie Node est notée aussi**.

**Conséquence, selon l'agent.** Dans le plan, Nitro ne faisait que relayer `/api`, ce qui ne se note pas. L'agent a proposé six pistes pour donner au serveur de vraies responsabilités : (A) couche serveur dédiée au front, (B) connexion vérifiée côté serveur, (C) cache, (D) relais SSE, (E) transversal (`/health`, journaux, limitation de débit), (F) données propres. Il a recommandé A + B + E, et F seulement si la consigne l'exige.

**Validé.** A + B + E ; C et D s'il reste du temps.

**Question de l'utilisateur.** « Le but, ce serait de refaire le front de mon projet de base ? » L'agent a comparé ce front avec le site actuel :
- les pages publiques n'existent pas aujourd'hui, elles sont nouvelles ;
- les pages connectées sont un sous-ensemble, refait sur une autre architecture ;
- le reste du site est hors périmètre.

Il a aussi présenté l'autre façon de voir (ne faire que la vitrine publique) et ce qu'elle coûte : moins de matière pour la partie Node, qui est notée. **Sujet gardé tel quel.**

**Mis à jour.** `CLAUDE.md` (cadre, périmètre, rôle du serveur Node) et `learning/MISSION.md` (critères de réussite côté Node).

---

## 2026-10-22 — Pas de signature de l'agent dans le dépôt

**Demande de l'utilisateur.** « J'ai pas envie que tu sois visible dans le repo. »

**Proposition de l'agent.** Avant de toucher à quoi que ce soit, lister tous les endroits où il apparaissait :
- la ligne `Co-Authored-By` dans ses commits ;
- la mention « Generated with Claude Code » dans la description de la PR. Elle serait entrée dans l'historique de `main`, puisque la fusion en squash reprend la description de la PR ;
- le skill `commit`, qui imposait cette ligne ;
- les fichiers d'organisation.

Il a ensuite proposé trois niveaux : retirer les signatures seulement ; les signatures et le nom du modèle ; tout ce qui concerne l'IA. Il a signalé que le troisième niveau retirerait du dépôt la matière de l'oral.

**Validé.** Retirer **les signatures seulement**. Les deux commits de la PR #1 sont réécrits sans la ligne (la branche n'était pas encore fusionnée), et le skill `commit` interdit désormais toute signature. `CLAUDE.md`, les skills, `learning/` et ce journal restent : ils montrent l'organisation, sans signer le code.

**Pourquoi c'est notable.** Une consigne de l'utilisateur passe avant les réglages par défaut de l'outil. L'agent l'a aussi enregistrée dans sa mémoire, pour qu'elle tienne dans les prochaines sessions.

---

## 2026-10-22 — Étape 1 : squelette en production

**Proposition de l'agent.** Reprendre le modèle de déploiement du projet d'origine, simplifié :
- un `Dockerfile` en deux étapes, dont l'image finale ne garde que le serveur produit par Nitro (environ 6 Mo, utilisateur non root, contrôle de santé sur `/health`) ;
- un seul conteneur derrière le Traefik existant, avec un routeur nommé `celeste-next` pour ne pas entrer en collision avec le site actuel ;
- une CI GitHub Actions : tests et build sur chaque PR ; image GHCR et déploiement par SSH sur `main`.

**Corrigé ou décidé par l'utilisateur.**
- **Domaine** : l'utilisateur a créé `new-celeste.matthisripoche.com` au lieu du `next.celeste…` prévu. L'agent a adapté la documentation.
- **Rien à faire sur le serveur** : l'utilisateur voulait tout passer par les secrets GitHub. L'agent a adapté la CI : elle crée le dossier dans le répertoire de l'utilisateur SSH (sans `sudo`) et réécrit le `.env` à chaque déploiement. GitHub devient la seule source de vérité.
- **Secrets SSH** : l'utilisateur ne savait pas où retrouver la clé privée et l'empreinte du serveur. L'agent a expliqué qu'un secret GitHub ne se relit jamais. Il a créé une clé dédiée au projet, installé sa partie publique sur le serveur et relevé l'empreinte, en vérifiant qu'elle correspondait à celle que le poste connaissait déjà. L'outil de l'agent a **bloqué** l'écriture des secrets dans GitHub, jugée sensible : l'utilisateur a lancé lui-même les commandes. La clé privée n'a jamais été affichée, et la copie locale a été supprimée ensuite.
- **La passation était fausse sur un point** : le port SSH du VPS est joignable depuis le poste de développement.

**Premier exercice en mode mixte : la route `/health`.**
- L'agent a préparé le fichier avec un `TODO` et des indices, ainsi que le test.
- L'utilisateur a buté sur `process`. L'erreur ne venait pas de lui : le gabarit de `create-analog` n'installe pas `@types/node`, donc TypeScript ne connaissait pas `process`. **Erreur de l'agent** : il aurait dû vérifier l'outillage avant de donner l'exercice.
- **Correction de l'utilisateur** : l'indice contenait déjà la solution (`process.uptime()`). « Ne mets pas la réponse en prérempli. » Désormais, les indices disent où chercher, pas quoi écrire. C'est noté dans le skill `teach` et dans la mémoire de l'agent.
- **Question de relecture** : faut-il vérifier Spring dans `/health` ? Réponse de l'utilisateur : non. Si Spring tombe, le site serait marqué en panne à tort. C'est la différence entre la vivacité du processus et la disponibilité de ses dépendances.

---

## 2026-10-23 — Backlog, skills et décision d'une nouvelle identité visuelle

**Demande.** Reprendre le contexte et faire un backlog.

**Proposition de l'agent.** Il a fait le point sur l'existant à partir des fichiers : étapes 0 et 1 faites, site en ligne, reste du gabarit à retirer, `index.html` modifié et pas commité, note obsolète dans `docs/api-spring.md` (la PR #18 du dépôt d'origine, qui ajoute `/api/summary`, est fusionnée). Il a ensuite proposé un backlog de 25 éléments, découpés par étape. Pour chacun, il indique qui écrit le cœur : l'utilisateur pour la première occurrence d'un concept, l'agent pour les cas répétitifs. Emplacement du backlog (fichier du dépôt ou Issues GitHub) : **pas encore tranché**.

**Skills ajoutés au projet, à la demande de l'utilisateur.**
- L'utilisateur a demandé un skill Angular et un skill de maquettes. L'agent a recommandé le pack `analogjs/angular-skills` sur la foi des chiffres d'installation et de l'éditeur.
- **Erreur de l'agent** : une fois installé, chaque skill du pack s'est affiché « DEPRECATED, unmaintained ». L'agent ne l'avait pas vérifié avant de le recommander. Il l'a désinstallé et remplacé par le skill officiel de l'équipe Angular (`angular/skills@angular-developer`), puis l'a signalé. Leçon : lire le contenu d'un skill avant de le recommander, pas seulement sa popularité.
- `html-wireframe` (`plannotator/effective-html`) : wireframes HTML basse fidélité.

**Décision de l'utilisateur : nouvelle identité visuelle.** Le design system « Topo » du site actuel est abandonné. On refait un design system complet. L'utilisateur a demandé de chercher d'abord un skill fait pour ça.
- Cette fois, l'agent a lu les skills candidats avant de recommander. Il a écarté ceux qui dépendent de Tailwind ou de React, et ceux qui ne couvrent que les écrans d'application.
- Recommandation validée : `pbakaus/impeccable`. Il couvre le cadrage du produit (`PRODUCT.md`), le remplacement d'une identité visuelle et la documentation du design system (`DESIGN.md`).
- **Point de sécurité soulevé par l'agent** : le skill fournit un lanceur qui télécharge un exécutable. Validé : on l'installe **sans jamais lancer ce binaire**. Un refus explicite est inscrit dans `.claude/settings.json`, pour que la règle tienne d'une session à l'autre.

**Cadrage du produit (`PRODUCT.md`).** Le skill impose de décrire le produit avant de parler de style. L'agent a repris ce que disaient déjà les deux dépôts, et n'a posé que trois questions. Réponses : le public est **la communauté des joueurs** (les pages publiques doivent convaincre des inconnus) ; le nom reste **Celeste Death Tracker** ; le mod **n'est pas encore publié** (la page du mod expliquera l'installation à la main). Les faits absents sont notés comme tels, pour ne pas en inventer : pas de témoignages, pas de nombre d'utilisateurs.

**Direction visuelle : maquettes d'abord.** L'agent suivait la démarche du skill `impeccable` : questions sur la situation d'usage, liste de sept univers visuels tirés du monde des joueurs, tirage au sort de trois d'entre eux. Le lanceur étant bloqué, il a fait le tirage au sort avec `shuf`. L'utilisateur l'a **interrompu** : il voulait voir des maquettes avant d'aller plus loin, faites avec Claude Design. L'agent a dessiné la page d'accueil sur un canvas Claude Design, une planche par direction tirée (carnet de routing, bulletin de risque d'avalanche, partition), en sombre d'abord (le site est surtout regardé sur un second écran le soir), avec un réglage clair. Les données de démonstration sont fictives et signalées comme telles.

**Choix de l'utilisateur : la direction B (bulletin de risque), mais « moins ordinaire et plat ».** Plutôt que d'ajouter des effets, l'agent a poussé l'univers du bulletin d'avalanche lui-même. Il a ajouté une rose des rooms (inspirée de la rose des expositions), des hachures et un damier pour les niveaux 4 et 5, une jauge de risque sur toute la hauteur, un texte de situation rédigé comme par un prévisionniste, et des plans qui se chevauchent. La version poussée (B2) est posée sous la B pour comparer.

**Correction de l'utilisateur : « c'est parti dans la mauvaise direction, on fait le design system avant ».** B2 était trop chargée, la métaphore du bulletin prenait le dessus, le style ne correspondait pas, et surtout la méthode était mauvaise : des pages avant le système. L'agent avait choisi les directions par lui-même (à partir des univers du skill) **sans avoir demandé les goûts de l'utilisateur**. Il a reposé deux séries de questions courtes. Réponses : repartir de zéro, sans métaphore ; références Strava et Linear ; une interface précise et énergique ; des formes arrondies et douces ; le design system dans Claude Design puis reporté dans le dépôt.

**Design system v1 (Claude Design).**
- Sombre d'abord, et un accent cyan pour la marque et l'action, jamais pour un résultat.
- On garde le vert pour la réussite, le rouge pour la chute et le doré pour le deathless, toujours accompagnés d'une forme et d'un mot.
- Typographies : Unbounded pour les titres et les chiffres, Geist pour le texte, Geist Mono pour les données.
- Base d'espacement de 4 px, arrondis généreux, une seule élévation.
- Douze composants avec leurs règles d'usage, dont deux propres au produit : la répartition des arrêts par room et la trajectoire d'une tentative.

Leçon pour l'agent : demander les références et le caractère voulus **avant** de proposer des directions visuelles.

**Design system validé tel quel ; première maquette de l'accueil construite dessus.** Le design system est installé dans le canvas (copie des jetons et des styles des composants). La page d'accueil n'utilise que ses composants : navigation, panneau d'exemple (pastille de face, Stat, trajectoires des dernières tentatives), alerte « mod pas encore publié », trois panneaux pour les trois questions du joueur, mise en route, pied de page. Les trois directions écartées restent sur le canvas, sous la nouvelle planche, comme trace de l'exploration (matière de l'oral).

**Maquette de l'accueil validée (« c'est bien mieux »).** À la demande de l'utilisateur, les quatre planches d'exploration (A, B, C, B2) sont supprimées du canvas. Il ne reste que l'accueil construit sur le design system. Ce journal garde la trace de l'exploration.
