## 2026-11-17 — Un composant par dossier, et un trou dans le garde-fou du prérendu

**Demande** : « chaque composant doit être dans son dossier, ne pas avoir de dossier avec plusieurs composants mélangés ».

**État des lieux par l'agent** : les pages étaient déjà chacune dans leur dossier. Trois endroits mélangeaient pourtant plusieurs composants : `src/app/ui/` (quatre composants), `src/app/layout/` (deux) et `src/app/pages/(public)/`, où l'accueil et la page 404 côtoyaient les dossiers des autres pages. **Validé** : appliquer la règle aux pages aussi, avec des dossiers de groupe pour les pages dont le nom fixe l'adresse.

**Fait** :
- `ui/<nom>/` et `layout/<nom>/` : un dossier par composant (`git mv`, historique gardé). Imports corrigés.
- L'accueil passe dans `(public)/(accueil)/index.page.ts`, toujours à l'adresse `/`.
- Règle et exceptions écrites dans `conventions-analog`. Chemins des modèles mis à jour dans `tests-analog` et le `planner`.

**Ce qui a cassé, et comment ça s'est vu** : la page 404, rangée dans `(introuvable)/`, prenait le pas sur les autres routes. `/`, `/mod` et `/login` répondaient 404. Les tests unitaires passaient tous, et le garde-fou du prérendu affichait « ✓ Prérendu : 2 pages avec contenu », alors qu'il en fallait 4. C'est le « 2 » qui a mis la puce à l'oreille. Un `curl` sur le serveur construit a confirmé le problème. La 404 est revenue dans `(public)/`, comme exception imposée par le routage, notée dans la règle.

**Trou du garde-fou, bouché** : le contrôle vérifiait que les pages prérendues avaient du contenu, mais pas que toutes les pages attendues avaient été écrites. Une page en 404 au prérendu n'est pas écrite du tout, donc elle passait inaperçue. La liste des pages n'existe plus qu'à un endroit, `scripts/pages-prerendues.mjs`, lu par `vite.config.ts` et par le contrôle. Ce dernier échoue désormais en nommant chaque page manquante. Essayé en retirant `/mod` : code 1, « /mod » cité.

**Erreur rattrapée par un contrôle de sécurité** : pour supprimer le dossier vide `(introuvable)`, l'agent a écrit `rmdir "$P/(introuvable)"` avec une variable. Claude Code a bloqué toute la commande, puisqu'une variable vide aurait visé la racine. Rien n'a tourné ; l'agent a refait la manœuvre avec des chemins littéraux.

**Pour l'oral** : un déplacement de fichiers « sans risque » a changé le routage, parce que dans Analog le nom et la place d'un fichier sont son adresse. Seule une vérification sur le résultat construit l'a vu, et elle a montré du même coup qu'un contrôle pouvait afficher « ✓ » sur un site à moitié cassé.
