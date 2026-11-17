// Hook PreToolUse de Claude Code (déclaré dans .claude/settings.json) : avant tout `git commit`
// lancé par l'agent ou un sous-agent, exécute les tests, le build (avec le garde-fou du prérendu)
// et la validation des en-têtes de skills. Si l'un échoue, le commit est bloqué (code 2) et la
// sortie revient à l'agent, qui doit corriger avant de recommencer.
//
// Pourquoi un hook et pas une règle du skill `commit` : la règle existait déjà, et elle a été
// sautée deux fois (un agent qui annonce « build OK » sans lire les erreurs du prérendu, un commit
// fait alors que le build venait d'échouer). Le hook est exécuté par Claude Code, pas par le modèle.

import { spawnSync } from 'node:child_process';

const entree = JSON.parse(await new Response(process.stdin).text() || '{}');
const commande = entree.tool_input?.command ?? '';

// Seulement les vrais commits : pas `git commit-tree`, ni un texte qui contient « git commit ».
if (!/(^|[;&|(]\s*|\s)git(\s+-C\s+\S+)?\s+commit(\s|$)/.test(commande)) process.exit(0);

const dossier = entree.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
const etapes = [
  ['Tests', 'npx', ['vitest', 'run']],
  ['Build', 'npm', ['run', 'build']],
  ['En-têtes des skills', 'node', ['.claude/skills/commit/verifier-entetes.mjs']],
];

// Les étapes tournent l'une après l'autre, jamais en parallèle (la charge a déjà fait échouer
// des builds).
for (const [nom, programme, args] of etapes) {
  const r = spawnSync(programme, args, { cwd: dossier, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-40).join('\n');
    console.error(`Commit bloqué : « ${nom} » a échoué (${programme} ${args.join(' ')}).\n\n${sortie}`);
    process.exit(2);
  }
}
process.exit(0);
