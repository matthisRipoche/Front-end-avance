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
