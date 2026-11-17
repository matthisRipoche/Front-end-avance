## 2026-10-25 — Refonte des pages du mod et de la FAQ, maquettes d'abord

**Demande** : « revoir le design des pages mod et FAQ », avec des espaces images à remplir plus tard.

**Correction de l'utilisateur** : l'agent partait lire le code pour le modifier tout de suite. L'utilisateur l'a arrêté : « fait les maquettes avant de changer le code ». La règle est notée dans la mémoire de l'agent : pour toute refonte visuelle, d'abord la maquette, puis sa validation, et seulement ensuite le code.

**Déroulé** :
- **Goûts d'abord**, comme le veut `CLAUDE.md`. Trois directions par page. L'utilisateur a choisi la direction « vitrine et guide » pour le mod et un accordéon par thème pour la FAQ, avec des captures du jeu et de la page du mod.
- **Maquettes sur un canvas Claude Design**, construites avec le design system du projet : chaque emplacement d'image y porte une légende et ses dimensions.
- **Signalé par l'agent** : les captures du jeu contredisaient la règle « aucun élément du jeu ». L'utilisateur a choisi une **exception limitée** aux captures de l'interface du mod, sans sprites ni décor. La règle a été corrigée dans `CLAUDE.md`, `PRODUCT.md`, `docs/design-system.md`, le README, le pied de page et la FAQ.
- **Décision structurante** (trois options présentées) : la page du mod devient un **composant** (`mod/index.page.ts`), parce que ses colonnes et ses cartes ne s'écrivent pas en Markdown. La **FAQ reste en Markdown** : l'agent a vérifié dans le code d'Analog que le HTML du `.md` passe tel quel (`bypassSecurityTrustHtml`). Chaque question est donc un `<details>` natif, sans JavaScript.

**Détail technique pour l'oral** : les styles de la prose Markdown (`:is(.analog-markdown-route) a`) étaient plus spécifiques que ceux des composants, si bien qu'un bouton posé dans la FAQ aurait pris la couleur d'un lien. Le passage à `:where()`, dont la spécificité est nulle, donne la priorité aux composants.

**Nouveaux composants du design system** : `cdt-slot` (emplacement d'image, rempli en y mettant un `<img>`), `cdt-chip` et `cdt-disclosure`. Ils ne sont pas encore reportés dans la source Claude Design.

**Vérifié** : 21 tests, build et prérendu (4 étapes sur `/mod`, 8 questions et les ancres des thèmes sur `/faq`), puis rendu et dépliage dans le navigateur.

**Faux pas de l'agent au commit** : la suppression de `mod.md`, indexée plus tôt par `git rm`, est partie dans le premier commit (styles du design system) au lieu de celui de la page. Rien n'était poussé : l'agent a annulé ce commit (`git reset --soft`), puis l'a refait en ne passant que le bon fichier (`git commit -- <fichier>`). À retenir : regarder ce qui est *déjà* indexé (`git diff --cached --stat`) avant le premier commit d'une série.
