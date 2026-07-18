import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { z } from 'zod';

import { fslValidate } from './tools/validate.js';
import { fslLint     } from './tools/lint.js';
import { fslExplain  } from './tools/explain.js';
import { fslSimulate } from './tools/simulate.js';
import { fslRender  } from './tools/render.js';
import type { RenderRasterOptions } from './tools/render.js';
import { GUIDE_FLOWCHARTS, GUIDE_LANGUAGE } from './tools/guide-content.js';
import { fslScaffold } from './tools/scaffold.js';
import { PRESET_IDS, SCAFFOLD_REGISTRY } from './tools/scaffold-registry.js';

/** Wrap any JSON-serializable value as an MCP text-content tool result. */
function jsonResult(value: unknown): { content: { type: 'text'; text: string }[] } {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

/**
 * Formats the fsl_scaffold tool description's per-preset family list, e.g.
 * `decision (flowchart), handshake (protocol), ...` for every registered preset.
 *
 * @returns a comma-separated `preset (family)` list in `PRESET_IDS` order
 */
function presetFamilySummary(): string {
  return PRESET_IDS.map((p) => {
    const d = SCAFFOLD_REGISTRY[p];
    /* v8 ignore next -- defensive only: PRESET_IDS is always
       Object.keys(SCAFFOLD_REGISTRY).sort(), so every `p` iterated here is
       guaranteed to already be a key of SCAFFOLD_REGISTRY and `d` can never
       be undefined. No real input reaches the bare-`p` fallback. */
    return d === undefined ? p : `${p} (${d.family})`;
  }).join(', ');
}

/**
 * Wrap a render result: raster results become an MCP image content block plus
 * a JSON text summary; every other shape uses the standard JSON text block.
 */
function renderResult(r: Awaited<ReturnType<typeof fslRender>>): {
  content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[];
} {
  if (r.valid && 'bytes' in r) {
    return {
      content: [
        { type: 'image', data: Buffer.from(r.bytes).toString('base64'), mimeType: r.mimeType },
        { type: 'text', text: JSON.stringify({ valid: true, format: r.format, mimeType: r.mimeType, byteLength: r.bytes.length }, null, 2) },
      ],
    };
  }
  return jsonResult(r);
}

/**
 * Build the fsl-mcp server: the five FSL authoring tools, the fsl_guide
 * guidance tool, and the fsl_scaffold preset-generator tool (seven tools total).
 * The returned server is transport-agnostic; connect it to stdio (production)
 * or an in-memory transport (tests).
 *
 * @returns a configured, not-yet-connected MCP server
 *
 * @example
 *   const server = createServer();
 *   await server.connect(new StdioServerTransport());
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'fsl-mcp', version: '0.1.0' });

  server.registerTool('fsl_validate',
    { description: 'Validate FSL source; returns { valid, diagnostics: [{severity, message, line, col}] }.',
      inputSchema: { source: z.string() } },
    ({ source }) => jsonResult(fslValidate(source)));

  server.registerTool('fsl_lint',
    { description: 'Lint FSL source; returns { notes: [{rule, message, line}] } for non-error diagnostics.',
      inputSchema: { source: z.string() } },
    ({ source }) => jsonResult(fslLint(source)));

  server.registerTool('fsl_explain',
    { description: 'Explain an FSL machine: { states, transitions, start, terminals, summary } or diagnostics.',
      inputSchema: { source: z.string() } },
    ({ source }) => jsonResult(fslExplain(source)));

  server.registerTool('fsl_simulate',
    { description: 'Simulate a walk: apply actions/target-states in order; returns { endState, path, legalNext, rejected? }.',
      inputSchema: { source: z.string(), actions: z.array(z.string()) } },
    ({ source, actions }) => jsonResult(fslSimulate(source, actions)));

  server.registerTool('fsl_render',
    { description: 'Render FSL to a diagram. format: svg (default) | dot (text) | png | jpeg | gif (returned as an image content block when a raster backend is available, otherwise degraded to svg text plus a note; gif animates a random walk). Raster options: width, height, scale (zoom %, 100 = 3x), quality (jpeg 1-100), delay (gif centiseconds/frame), maxFrames (gif; keep <= 20 for chat).',
      inputSchema: {
        source    : z.string(),
        format    : z.enum(['svg', 'dot', 'png', 'jpeg', 'gif']).optional(),
        width     : z.number().int().positive().optional(),
        height    : z.number().int().positive().optional(),
        scale     : z.number().int().positive().optional(),
        quality   : z.number().int().min(1).max(100).optional(),
        delay     : z.number().int().positive().optional(),
        maxFrames : z.number().int().min(1).max(100).optional(),
      } },
    async ({ source, format, width, height, scale, quality, delay, maxFrames }) => {
      const options: RenderRasterOptions = {};
      if (width     !== undefined) { options.width     = width; }
      if (height    !== undefined) { options.height    = height; }
      if (scale     !== undefined) { options.scale     = scale; }
      if (quality   !== undefined) { options.quality   = quality; }
      if (delay     !== undefined) { options.delay     = delay; }
      if (maxFrames !== undefined) { options.maxFrames = maxFrames; }
      return renderResult(await fslRender(source, format, options));
    });

  server.registerTool('fsl_guide',
    { description: 'Returns FSL authoring guidance as markdown. topic "language": the full FSL primer - call before writing FSL for the first time. topic "flowcharts": how to express flowcharts in FSL (decision diamonds, labeled branches, terminals, failure paths). Takes no FSL source.',
      inputSchema: { topic: z.enum(['flowcharts', 'language']) } },
    ({ topic }) => ({
      content: [{ type: 'text' as const, text: topic === 'flowcharts' ? GUIDE_FLOWCHARTS : GUIDE_LANGUAGE }],
    }));

  server.registerTool('fsl_scaffold',
    { description: `Returns a complete, compiling FSL starting document for a preset chart shape, with your names substituted in. Presets by family: ${presetFamilySummary()}. Pass roles to rename states/actions; list roles need their exact canonical count. See fsl_guide topic "flowcharts" for the idioms.`,
      inputSchema: {
        preset: z.enum(PRESET_IDS as [string, ...string[]]),
        machine_name: z.string().optional(),
        roles: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
      } },
    ({ preset, machine_name, roles }) => jsonResult(fslScaffold(preset, machine_name, roles)));

  return server;
}

/**
 * Start the fsl-mcp server on a transport. Resolves once the transport is
 * connected; the process then serves requests until the transport closes.
 *
 * Defaults to a real stdio transport wired to the process's actual
 * `stdin`/`stdout` — that default is what the `fsl-mcp` bin entry relies on
 * in production. Pass an explicit transport (e.g. an in-memory transport, or
 * a `StdioServerTransport` wired to injected streams) to run the server
 * without touching the real process streams — this is how tests exercise
 * `startServer` itself without hijacking the test process's stdio.
 *
 * @param transport - the MCP transport to connect (defaults to real stdio)
 *
 * @example
 *   await startServer();   // used by the `fsl-mcp` bin entry
 */
export async function startServer(transport: Transport = new StdioServerTransport()): Promise<void> {
  const server = createServer();
  await server.connect(transport);
}
