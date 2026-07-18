/**
 * Embeds every src/prompts/scaffolds/*.fsl into src/ts/tools/scaffold-content.ts
 * so presets ship inside the bundle. Scans the directory - adding a preset
 * file requires no generator change. Runs before tsc via the `typescript`
 * npm script.
 *
 * @example
 *   node src/build_js/generate_scaffold_content.js
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';

const DIR = 'src/prompts/scaffolds';
const OUT = 'src/ts/tools/scaffold-content.ts';

const escapeTemplate = (s) =>
  s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const files = readdirSync(DIR).filter((f) => f.endsWith('.fsl')).sort();
const entries = files.map((f) => {
  const id = f.replace(/\.fsl$/, '');
  return `  '${id}': \`${escapeTemplate(readFileSync(`${DIR}/${f}`, 'utf8'))}\`,`;
});

const body = `// GENERATED FILE - DO NOT EDIT.
// Source: ${DIR}/*.fsl
// Regenerate: node src/build_js/generate_scaffold_content.js (runs automatically before tsc)

/** Raw preset FSL sources, keyed by preset id (scaffold filename sans .fsl). */
export const SCAFFOLD_SOURCES: Record<string, string> = {
${entries.join('\n')}
};
`;
writeFileSync(OUT, body);
console.log(`[scaffold] wrote ${OUT} (${String(files.length)} presets)`);
