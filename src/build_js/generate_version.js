/**
 * Emits src/ts/version.ts from package.json's version field, so the version
 * the MCP server reports can never drift from the published package. Under
 * protocol revision 2026-07-28 this string is stamped into every result's
 * _meta as io.modelcontextprotocol/serverInfo. Runs before tsc via the
 * `typescript` npm script.
 *
 * @example
 *   node src/build_js/generate_version.js
 */
import { readFileSync, writeFileSync } from 'fs';

const OUT = 'src/ts/version.ts';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

const body = `// GENERATED FILE - DO NOT EDIT.
// Source: package.json (version field)
// Regenerate: node src/build_js/generate_version.js (runs automatically before tsc)

/** The published fsl-mcp version, reported as this server's identity over MCP. */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const FSL_MCP_VERSION: string = '${version}';
`;
writeFileSync(OUT, body);
console.log(`[version] wrote ${OUT} (${version})`);
