// Garde-fou lancé après `npm run build` (script postbuild) : fait échouer le build si une page
// prérendue est vide.
//
// Pourquoi : le plugin Angular d'Analog 2.9.1 partage une seule compilation entre les builds
// client et SSR, qui tournent en parallèle. Si le client finit le premier, il la libère pendant
// que le SSR en a encore besoin : le SSR embarque alors des composants non compilés (JIT), le
// prérendu affiche « Component '…' is not resolved » et écrit des coquilles vides… mais
// `vite build` sort quand même en code 0. Ça arrive quand la machine est chargée (CI, tests en
// parallèle). Ce contrôle empêche une telle image d'être construite et mise en ligne.
//
// Critères :
// - chaque page de PAGES_PRERENDUES a son fichier. Une page qui répond 404 au prérendu n'est pas
//   écrite : c'est arrivé le 2026-11-17, quand la page 404 rangée dans un dossier de groupe a pris
//   le pas sur `/` et `/mod`, et que ce contrôle n'avait vu que les 2 pages restantes ;
// - chaque page prérendue contient un <h1> (toutes les pages du site en ont un ; une coquille vide
//   n'a que <app-root><router-outlet>).

import { access, readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { PAGES_PRERENDUES } from './pages-prerendues.mjs';

const racine = 'dist/analog/public';

async function pagesHtml(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const pages = [];
  for (const entree of entrees) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) pages.push(...(await pagesHtml(chemin)));
    else if (entree.name === 'index.html') pages.push(chemin);
  }
  return pages;
}

// `/` → index.html, `/faq` → faq/index.html.
const fichierDe = (adresse) => join(racine, adresse.replace(/^\/+/, ''), 'index.html');
const manquantes = [];
for (const adresse of PAGES_PRERENDUES) {
  await access(fichierDe(adresse)).catch(() => manquantes.push(adresse));
}
if (manquantes.length > 0) {
  console.error(`✗ Prérendu : ${manquantes.length} page(s) attendue(s) non écrite(s) : ${manquantes.join(', ')}.`);
  console.error('  Une page qui répond 404 ou plante au prérendu n\'est pas écrite : lire « [req] GET … » plus haut.');
  process.exit(1);
}

const pages = await pagesHtml(racine).catch(() => []);
if (pages.length === 0) {
  console.error(`✗ Prérendu : aucune page dans ${racine}.`);
  process.exit(1);
}

const vides = [];
for (const page of pages) {
  if (!(await readFile(page, 'utf8')).includes('<h1')) vides.push(relative(racine, page));
}

if (vides.length > 0) {
  console.error(`✗ Prérendu : ${vides.length} page(s) sans contenu : ${vides.join(', ')}.`);
  console.error('  Cause probable : composants non compilés dans le build SSR. Relancer le build.');
  process.exit(1);
}
console.log(`✓ Prérendu : ${pages.length} pages avec contenu.`);
