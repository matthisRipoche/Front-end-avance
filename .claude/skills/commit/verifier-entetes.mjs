// Valide l'en-tête YAML de chaque agent (.claude/agents/*.md) et de chaque skill
// (.claude/skills/*/SKILL.md). Un en-tête invalide fait disparaître l'agent ou le skill
// sans message d'erreur : c'est arrivé avec une description contenant « : ».
// Usage, depuis la racine du dépôt : node .claude/skills/commit/verifier-entetes.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

// js-yaml n'est pas une dépendance directe du projet : on le prend dans node_modules
// s'il y est, sans l'ajouter à package.json.
const require = createRequire(join(process.cwd(), 'package.json'));
const yaml = require('js-yaml');

const fichiers = [
  ...readdirSync('.claude/agents')
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ chemin: join('.claude/agents', f), type: 'agent', attendu: f.slice(0, -3) })),
  ...readdirSync('.claude/skills')
    .map((d) => ({ chemin: join('.claude/skills', d, 'SKILL.md'), type: 'skill', attendu: d }))
    .filter((f) => existsSync(f.chemin)),
];

let erreurs = 0;
for (const { chemin, type, attendu } of fichiers) {
  const entete = readFileSync(chemin, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  let probleme = null;
  if (!entete) {
    probleme = 'pas d’en-tête --- … ---';
  } else {
    try {
      const donnees = yaml.load(entete[1]);
      if (!donnees?.name || !donnees?.description) probleme = 'name ou description manquant';
      else if (donnees.name !== attendu) probleme = `name « ${donnees.name} » ≠ « ${attendu} »`;
      else if (donnees.skills && !Array.isArray(donnees.skills)) probleme = 'skills doit être une liste';
    } catch (e) {
      probleme = `YAML invalide : ${e.message.split('\n')[0]}`;
    }
  }
  if (probleme) {
    erreurs++;
    console.log(`KO  ${type}  ${chemin} : ${probleme}`);
  }
}

console.log(erreurs ? `${erreurs} en-tête(s) à corriger.` : `${fichiers.length} en-têtes valides.`);
process.exit(erreurs ? 1 : 0);
