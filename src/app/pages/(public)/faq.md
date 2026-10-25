---
title: Questions fréquentes
meta:
  - name: description
    content: Ce que fait Celeste Death Tracker, ce que le mod enregistre, et comment commencer.
  - property: og:title
    content: FAQ
  - property: og:description
    content: Ce que fait Celeste Death Tracker, ce que le mod enregistre, et comment commencer.
  - property: og:type
    content: website
# Chaque question est un bloc <details> : le HTML passe tel quel dans le Markdown.
# Laisser une ligne vide après </summary> et avant </details>, sinon la réponse
# n'est pas lue comme du Markdown (gras, liens).
# Emplacement d'image : remplacer le contenu de <figure class="cdt-slot"> par <img src alt>.
# Ces notes sont dans le frontmatter pour ne pas finir dans le HTML de la page.
---

# Questions fréquentes

<p class="faq-lead">Ce que fait le site, comment marche le mod, et ce qu'il envoie.</p>

<nav class="cdt-chips faq-themes" aria-label="Thèmes">
  <a class="cdt-chip" href="/faq#le-site-et-le-deathless">Le site et le deathless</a>
  <a class="cdt-chip" href="/faq#le-mod">Le mod</a>
  <a class="cdt-chip" href="/faq#tes-données">Tes données</a>
</nav>

## Le site et le deathless

<figure class="cdt-slot cdt-slot--wide">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>
  <figcaption class="cdt-slot__title">Capture du jeu : une face en cours</figcaption>
  <span class="cdt-slot__hint">L'interface du mod pendant une tentative.</span>
  <span class="cdt-slot__size">21:9 · 1680 × 720</span>
</figure>

<details class="cdt-disclosure" open>
<summary>À quoi sert le site ?</summary>

À accompagner tes tentatives de **deathless** : finir une face de map sans mourir une seule fois. Le site te montre, face par face, jusqu'où tu vas, dans quelles rooms tes tentatives s'arrêtent, et si tu progresses d'une session à l'autre.

</details>

<details class="cdt-disclosure">
<summary>Qu'est-ce qu'une tentative ?</summary>

Une partie sur une face d'une map, de ton entrée dans la map à ta sortie. Elle est **deathless** si elle va jusqu'au bout sans aucune mort. Sinon, la première mort marque la room où ta tentative a cassé : c'est cette room que le site retient.

</details>

<details class="cdt-disclosure">
<summary>Qu'est-ce qu'une face ?</summary>

Une map jouée d'un côté précis : A, B ou C. Un deathless de la face A n'a rien à voir avec celui de la face B, alors le site ne mélange jamais deux faces dans un même chiffre.

</details>

<details class="cdt-disclosure">
<summary>Pourquoi le site n'affiche-t-il pas mon nombre total de morts ?</summary>

Parce qu'il ne dit rien de ta progression : il additionne toutes les maps et toutes les sauvegardes. Ici, une mort est une information (où la tentative s'est arrêtée), pas un score.

</details>

## Le mod

<figure class="cdt-slot cdt-slot--wide">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>
  <figcaption class="cdt-slot__title">Capture du jeu : le menu du mod</figcaption>
  <span class="cdt-slot__hint">Mod Options, sur l'entrée CelesteDeathTracker.</span>
  <span class="cdt-slot__size">21:9 · 1680 × 720</span>
</figure>

<details class="cdt-disclosure">
<summary>Comment installer le mod ?</summary>

Le mod n'est pas encore publié : il s'installe à la main dans Everest. La [page du mod](/mod) explique chaque étape.

</details>

<details class="cdt-disclosure">
<summary>Comment le mod est-il relié à mon compte ?</summary>

Au premier lancement, le jeu affiche un code et ouvre une page du site. Tu saisis ce code en étant connecté, et le jeu est associé à ton compte. Tu n'as aucun mot de passe ni aucune clé à copier dans le jeu.

<figure class="cdt-slot">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>
  <figcaption class="cdt-slot__title">Capture du jeu : le bandeau du code</figcaption>
  <span class="cdt-slot__size">16:9 · 1280 × 720</span>
</figure>

</details>

## Tes données

<figure class="cdt-slot cdt-slot--wide">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>
  <figcaption class="cdt-slot__title">Capture du jeu : l'option d'envoi</figcaption>
  <span class="cdt-slot__hint">Le menu du mod, sur le réglage qui coupe l'envoi.</span>
  <span class="cdt-slot__size">21:9 · 1680 × 720</span>
</figure>

<details class="cdt-disclosure">
<summary>Qu'est-ce que le mod envoie ?</summary>

Uniquement ce qui se passe dans tes parties : la map et la face, les rooms traversées, le moment et l'endroit de chaque mort, la durée de la tentative, et la raison de sa fin (face terminée, recommencée, abandonnée…). Rien d'autre sur ton ordinateur n'est lu. Le détail est sur la page [confidentialité](/confidentialite).

</details>

<details class="cdt-disclosure">
<summary>Le site est-il officiel ?</summary>

Non. C'est un projet de fan, sans lien avec Extremely OK Games, l'éditeur de Celeste. Le site n'utilise ni les sprites, ni la musique, ni la police du jeu ; les seules images du jeu sont des captures de l'interface du mod.

</details>

<section class="cdt-panel faq-cta" aria-label="Commencer">
  <div>
    <p class="cdt-panel__title">Prêt à commencer ?</p>
    <p>Installe le mod, associe ton jeu, et joue.</p>
  </div>
  <a class="cdt-btn cdt-btn--primary" href="/mod">Installer le mod</a>
</section>
