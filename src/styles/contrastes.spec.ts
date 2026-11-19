import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Jetons = Record<string, string>;

const css = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Corps du bloc `{ … }` qui suit le sélecteur donné (sans accolade imbriquée). */
function corpsDe(selecteur: string): string {
  const debut = css.indexOf(selecteur);
  if (debut === -1) throw new Error(`Sélecteur introuvable dans tokens.css : ${selecteur}`);
  const ouverture = css.indexOf('{', debut);
  return css.slice(ouverture + 1, css.indexOf('}', ouverture));
}

function jetonsDe(corps: string): Jetons {
  const jetons: Jetons = {};
  for (const [, nom, valeur] of corps.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) jetons[nom] = valeur.trim();
  return jetons;
}

const sombre = jetonsDe(corpsDe(':root {'));
const clairSysteme = corpsDe(':root:not([data-theme="dark"])');
const clairForce = corpsDe(':root[data-theme="light"]');
const clair = jetonsDe(clairForce);

/** Valeur finale d'un jeton : suit les `var(--…)`, échoue sur tout ce qui n'est pas une couleur hexadécimale. */
function resoudre(jetons: Jetons, nom: string, vus: string[] = []): string {
  const valeur = jetons[nom];
  if (valeur === undefined) throw new Error(`Jeton --${nom} absent`);
  if (vus.includes(nom)) throw new Error(`Jeton --${nom} : référence circulaire`);
  const reference = valeur.match(/^var\(--([\w-]+)\)$/);
  if (reference) return resoudre(jetons, reference[1], [...vus, nom]);
  if (/^#[0-9a-f]{6}$/i.test(valeur)) return valeur;
  throw new Error(`Jeton --${nom} : « ${valeur} » n'est pas résoluble (hexadécimal ou var() attendus)`);
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(jetons: Jetons, premier: string, second: string): number {
  const [a, b] = [luminance(resoudre(jetons, premier)), luminance(resoudre(jetons, second))];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// [jeton, fonds sur lesquels il se lit]
const TEXTE: [string, string[]][] = [
  ['ink', ['bg', 'surface', 'surface-raised', 'accent-soft', 'danger-soft']],
  ['ink-muted', ['bg', 'surface', 'surface-raised', 'accent-soft', 'danger-soft']],
  ['accent', ['bg', 'surface', 'surface-raised', 'accent-soft', 'danger-soft']],
  ['on-accent', ['accent']],
  ['success', ['success-soft', 'surface']],
  ['danger', ['danger-soft', 'surface', 'bg']],
  ['on-gold', ['gold']],
  ['gold-text', ['bg', 'surface']],
];

const COMPOSANTS: [string, string[]][] = [
  ['border-strong', ['surface', 'bg']],
  ['accent', ['surface-raised']],
];

describe.each([
  ['sombre', sombre],
  ['clair', clair],
])('Contrastes du thème %s', (_theme, jetons) => {
  it.each(TEXTE.flatMap(([texte, fonds]) => fonds.map((fond) => [texte, fond])))(
    'texte --%s sur --%s : au moins 4,5',
    (texte, fond) => {
      expect(ratio(jetons, texte, fond)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(COMPOSANTS.flatMap(([composant, fonds]) => fonds.map((fond) => [composant, fond])))(
    'composant --%s sur --%s : au moins 3',
    (composant, fond) => {
      expect(ratio(jetons, composant, fond)).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('Thème clair', () => {
  it('le liseré doré (--gold-edge) se voit sur --surface : au moins 3', () => {
    expect(ratio(clair, 'gold-edge', 'surface')).toBeGreaterThanOrEqual(3);
  });

  it('les deux blocs clairs sont identiques', () => {
    expect(jetonsDe(clairSysteme)).toEqual(jetonsDe(clairForce));
  });

  it('le thème sombre n’affiche aucun liseré doré', () => {
    expect(sombre['gold-edge']).toBe('transparent');
  });
});

describe('Lecture des jetons', () => {
  it('échoue clairement sur un jeton qui n’est pas une couleur résoluble', () => {
    expect(() => resoudre({ x: 'color-mix(in srgb, red, blue)' }, 'x')).toThrow(/n'est pas résoluble/);
    expect(() => resoudre({}, 'absent')).toThrow(/absent/);
  });
});
