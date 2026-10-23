# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Les joueurs de Celeste qui font du deathless.** Le deathless, c'est réussir une face de map sans mourir une seule fois. Ils ont souvent fini le jeu, jouent des maps de la communauté (Everest) et recommencent la même face des dizaines ou des centaines de fois. Le mod enregistre leurs tentatives pendant qu'ils jouent ; ils consultent le site entre deux sessions, ou à côté du jeu.

Deux situations :
- **Visiteur qui découvre** (pages publiques) : il ne connaît pas l'outil. Il doit comprendre ce qu'il mesure, voir que ça vaut le coup, puis installer le mod et créer un compte.
- **Joueur connecté** (pages connectées) : il veut savoir jusqu'où il arrive, où ses tentatives s'arrêtent, s'il progresse et combien de temps il tient.

Public secondaire : le jury du cours, qui évalue le site en production. Il n'impose rien au produit.

## Product Purpose

Celeste Death Tracker est un **compagnon de deathless**, pas un compteur de morts. Un mod Everest enregistre chaque tentative ; le site les regroupe par face de map et montre la progression.

Le site réussit quand un joueur, après une session, sait où il bloque et voit qu'il avance.

## Positioning

Le site part de la **tentative** et non de la mort. Une tentative va de l'entrée dans une face jusqu'à la première mort (échec) ou jusqu'à la fin de la map (deathless réussi). Les statistiques sont donc par face précise : jusqu'à quelle room on arrive, où les tentatives s'arrêtent, la meilleure tentative. Ce ne sont pas des morts cumulées sur tout le jeu. Le nombre total de morts n'apparaît nulle part.

## Operating Context

- Le mod Everest envoie les tentatives à l'API (`celeste.matthisripoche.com`), liée au compte par un appareil appairé.
- Vocabulaire du joueur : **face** (une map + un côté A, B ou C), **room** (nom envoyé par le jeu, comme `6a` ou `b-05`), **tentative**, **deathless réussi**, **SID** (identifiant de map, par exemple `Celeste/1-ForsakenCity`).
- Le joueur ouvre souvent le site juste après une session, parfois sur un second écran pendant qu'il joue.

## Capabilities and Constraints

- **Pages publiques** : accueil, page du mod, FAQ, confidentialité.
- **Pages connectées** : tableau de bord, mes maps, détail d'une face. Plus tard, s'il reste du temps : historique, détail d'une room, direct, appareils, appairage.
- Connexion par email et mot de passe ; Discord plus tard.
- Les données viennent de l'API Spring existante, qu'on ne modifie pas (contrat : `docs/api-spring.md`).
- **Le mod n'est pas encore publié** : il s'installe à la main. La page du mod doit expliquer comment le récupérer et l'installer, sans lien vers une page de téléchargement officielle.
- Langue de l'interface : français, comme le site actuel. **Décision ouverte** : une version anglaise pour la communauté internationale.

## Brand Commitments

- Nom : **Celeste Death Tracker**.
- **Projet de fan, non officiel.** Interdits : les sprites, les images et la police (Renogare) de Celeste, © Extremely OK Games. Ne jamais laisser croire à un produit officiel. Seuls les motifs dessinés pour le site sont autorisés.
- Le design system « Topo » du site actuel est **remplacé** : on peut s'en servir comme repère, pas comme base.

## Evidence on Hand

- Les vraies données d'un joueur, via l'API (tentatives, faces, tableau de bord `/api/summary`).
- Spécification des pages : `docs/arborescence-pages.md` et `docs/donnees-du-jeu.md` du dépôt d'origine (`~/projects/CelesteDeathTracker`).
- **Absents, à ne pas inventer** : nombre d'utilisateurs, témoignages, captures du mod en jeu, page de téléchargement.

## Product Principles

1. **La tentative est l'unité.** Chaque écran répond à une question de joueur (jusqu'où, où ça casse, est-ce que je progresse), jamais par un total de morts.
2. **Par face, précisément.** On ne mélange jamais deux faces ni deux maps dans un même chiffre.
3. **Un échec est une information, pas une punition.** Une tentative ratée dit où travailler.
4. **Honnête sur ce qui existe.** Le mod n'est pas encore publié, il n'y a pas encore de communauté chiffrée : les pages publiques ne promettent que ce qui est vrai.

## Accessibility & Inclusion

- Le site actuel visait des contrastes d'au moins 4,5:1, un focus toujours visible et des résultats lisibles autrement que par la couleur (réussite et échec). On garde ces exigences (WCAG 2.2 AA).
- Respecter `prefers-reduced-motion`.
