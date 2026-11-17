## 2026-10-23 — Coque commune (#7) et bug de la FAQ

**Demande** : « on passe à la suite », puis `/loop` sur toute l'étape 2 (pages publiques). L'agent fait d'abord le point : en-tête et pied de page existent déjà, mais chaque page les importe elle-même.

**Proposition** : deux options pour partager la coque.
- A : garder les imports page par page.
- B : une route de mise en page d'Analog, `(public).page.ts`, avec un `<router-outlet>`. Les parenthèses forment un groupe sans segment d'URL.

L'agent recommande B : à l'étape 4, les pages connectées auront leur propre groupe `(app)`, où se posera une seule fois la garde de session côté serveur. L'utilisateur a lancé la suite sans objecter ; l'agent l'a pris pour un accord, et l'a dit.

**Bug découvert en vérifiant le build** : la FAQ en ligne n'était **pas** notre page.
- Analog 2.9 transforme en route tout fichier `.md` de `src/content/`. `faq.md` créait donc une route `/faq`, qui devenait le parent de notre composant `faq/index.page.ts`, mais sans `<router-outlet>` : seul le Markdown brut s'affichait, sans navigation ni pied de page.
- **Erreur de l'agent à l'étape précédente** : il avait vérifié que le HTML prérendu contenait les 8 questions et le bon titre. C'était vrai, mais cela ne prouvait pas que *notre composant* était rendu. Il aurait fallu chercher une classe propre à la page (`faq__title`). À retenir : vérifier une marque qui n'existe *que* dans le code qu'on veut voir rendu.
- **Décision de l'utilisateur** (deux options présentées) : adopter la convention d'Analog, où le Markdown *est* la page. `faq.md` va dans `pages/(public)/`, le titre et les balises meta passent dans le frontmatter, et le composant est supprimé. La page Confidentialité (#10) sera un simple fichier `.md`.

**Autres faux pas de l'agent, rattrapés en cours de route** :
- un `grep -o` sur une seule ligne lui a fait croire que la page était vide ;
- un `pkill -f` dont le motif figurait dans sa propre commande a tué le shell avant le `git stash pop`. Le travail était à l'abri dans le stash ; l'agent l'a restauré en le signalant.

**Même piège côté serveur** : Nitro sert tout fichier de `src/server/routes/`. Le test `health.spec.ts` est donc devenu une route `/health.spec` en production, qui plante (`describe is not defined`). Correction prévue sur une branche à part.

**Pour l'oral** : le routage par fichiers fait gagner de la configuration, mais *tout* fichier du dossier compte. Deux bugs de la même famille, trouvés en vérifiant le rendu réel et pas seulement les tests.
