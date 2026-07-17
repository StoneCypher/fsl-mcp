/**
 * Generates src/ts/tools/guide-content.ts from the authored markdown in
 * src/prompts, so guidance ships inside the bundle with no runtime file
 * reads. Runs automatically before tsc via the `typescript` npm script.
 *
 * @example
 *   node src/build_js/generate_guide_content.js
 */
import { readFileSync, writeFileSync } from 'fs';

const PRIMER     = 'src/prompts/fsl-llms-draft.md';
const FLOWCHARTS = 'src/prompts/fsl-flowcharts.md';
const OUT        = 'src/ts/tools/guide-content.ts';

/**
 * Escape a string for safe embedding inside a TS template literal.
 *
 * @param {string} s - raw markdown
 * @returns {string} template-literal-safe text
 */
const escapeTemplate = (s) =>
  s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const primer     = readFileSync(PRIMER, 'utf8');
const flowcharts = readFileSync(FLOWCHARTS, 'utf8');
const language   = primer + '\n\n' + flowcharts;

const body = `// GENERATED FILE - DO NOT EDIT.
// Source: ${PRIMER} + ${FLOWCHARTS}
// Regenerate: node src/build_js/generate_guide_content.js (runs automatically before tsc)
/* eslint-disable @typescript-eslint/no-inferrable-types */

/** The "Flowcharts in FSL" idiom guide, verbatim from src/prompts/fsl-flowcharts.md. */
export const GUIDE_FLOWCHARTS: string = \`${escapeTemplate(flowcharts)}\`;

/** The full FSL primer plus the flowchart guide, for agents new to FSL. */
export const GUIDE_LANGUAGE: string = \`${escapeTemplate(language)}\`;
`;

writeFileSync(OUT, body);
console.log(`[guide] wrote ${OUT} (${String(flowcharts.length)} + ${String(primer.length)} chars)`);
