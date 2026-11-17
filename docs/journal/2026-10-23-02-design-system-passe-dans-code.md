## 2026-10-23 — Le design system passe dans le code

**Demande.** Reporter le design system en CSS et faire une page qui le présente.

**Décisions validées par l'utilisateur** (présentées avec leurs compromis, recommandations suivies) :
- polices **auto-hébergées** (`@fontsource-variable` : Unbounded, Geist, Geist Mono) plutôt que Google Fonts, pour qu'aucun visiteur n'envoie son adresse IP à Google (confidentialité) ;
- vitrine **publique** sur `/design-system`, utile au jury et à l'oral, contrairement au site actuel où elle n'existait qu'en développement.

**Réalisé par l'agent** (outillage et présentation, pas encore un concept à apprendre) :
- `src/styles/tokens.css` est généré à partir du `tokens.json` du design system, pour qu'il n'y ait qu'une source ;
- `src/styles/components.css` reprend les classes `.cdt-*` ;
- la page `/design-system` lit les valeurs dans les variables CSS au lieu de les recopier, et propose un sélecteur de thème (système, sombre, clair) ;
- `docs/design-system.md` est écrit, et la section Design de `CLAUDE.md` est mise à jour.

La première vraie page en mode mixte reste l'accueil : c'est l'utilisateur qui écrira la page SSR.
