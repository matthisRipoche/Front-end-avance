// Contenu de la page /design-system : les jetons à présenter et leur usage.
// Les valeurs ne sont pas recopiées ici : la page les lit dans les variables CSS
// de src/styles/tokens.css, la seule source.

export interface TokenDoc {
  name: string;
  usage: string;
}

export interface TypeStyleDoc {
  name: string;
  sample: string;
  usage: string;
}

export const COLOR_GROUPS: { title: string; tokens: TokenDoc[] }[] = [
  {
    title: 'Fonds et texte',
    tokens: [
      { name: 'bg', usage: 'Fond de page.' },
      { name: 'surface', usage: 'Panneaux, lignes de liste, champs.' },
      { name: 'surface-raised', usage: 'Survol, onglet actif, piste des barres.' },
      { name: 'border', usage: 'Séparateurs discrets, sans sens propre.' },
      { name: 'border-strong', usage: 'Contour des champs et boutons secondaires.' },
      { name: 'ink', usage: 'Texte principal et chiffres.' },
      { name: 'ink-muted', usage: 'Texte secondaire, libellés, légendes.' },
    ],
  },
  {
    title: 'Marque et action',
    tokens: [
      { name: 'accent', usage: 'Action principale, lien, onglet actif, focus. Jamais un résultat.' },
      { name: 'on-accent', usage: 'Texte posé sur un aplat accent.' },
      { name: 'accent-soft', usage: 'Fond d’un élément sélectionné ou d’une info.' },
    ],
  },
  {
    title: 'Résultats',
    tokens: [
      { name: 'success', usage: 'Réussite : room passée, progression. Avec coche et mot.' },
      { name: 'success-soft', usage: 'Fond d’une étiquette de réussite.' },
      { name: 'danger', usage: 'Chute, erreur. Avec croix et mot.' },
      { name: 'danger-soft', usage: 'Fond d’une étiquette de chute ou d’une erreur.' },
      { name: 'gold', usage: 'Deathless réussi, un seul élément doré par écran.' },
      { name: 'on-gold', usage: 'Texte posé sur un aplat gold.' },
      { name: 'gold-text', usage: 'Texte doré sur bg ou surface.' },
    ],
  },
];

export const TYPE_STYLES: TypeStyleDoc[] = [
  { name: 'display-xl', sample: 'Ton deathless.', usage: 'Unbounded · titre d’accueil, une fois par page publique' },
  { name: 'display', sample: 'Forsaken City · B', usage: 'Unbounded · titre de page' },
  { name: 'stat', sample: 'b-11', usage: 'Unbounded · chiffre clé, chiffres tabulaires' },
  { name: 'title', sample: 'Où tes tentatives s’arrêtent', usage: 'Geist · titre de section' },
  { name: 'heading', sample: 'Meilleure tentative', usage: 'Geist · titre de bloc' },
  { name: 'body', sample: 'Le mod enregistre chaque tentative pendant que tu joues.', usage: 'Geist · texte courant' },
  { name: 'body-sm', sample: '120 tentatives cette semaine', usage: 'Geist · texte secondaire' },
  { name: 'label', sample: 'Tentatives', usage: 'Geist · libellé, jamais en capitales espacées' },
  { name: 'data', sample: 'b-05  31  26 %', usage: 'Geist Mono · rooms, SID, durées, colonnes' },
];

export const SPACING: string[] = ['space-1', 'space-2', 'space-3', 'space-4', 'space-6', 'space-8', 'space-12', 'space-16'];

export const RADII: TokenDoc[] = [
  { name: 'radius-sm', usage: 'Étiquettes, barres' },
  { name: 'radius-md', usage: 'Champs, boutons, lignes' },
  { name: 'radius-lg', usage: 'Panneaux' },
  { name: 'radius-pill', usage: 'Onglets, navigation' },
];

// Exemple de répartition des arrêts par room (données fictives).
export const SAMPLE_ROOMS: { id: string; stops: number }[] = [
  { id: 'b-00', stops: 4 },
  { id: 'b-01', stops: 9 },
  { id: 'b-02', stops: 6 },
  { id: 'b-03', stops: 21 },
  { id: 'b-04', stops: 8 },
  { id: 'b-05', stops: 31 },
  { id: 'b-06', stops: 12 },
];
