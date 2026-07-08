import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { fslValidate } from './tools/validate.js';
import { fslLint     } from './tools/lint.js';
import { fslExplain  } from './tools/explain.js';
import { fslSimulate } from './tools/simulate.js';
import { fslRender   } from './tools/render.js';

/** Wrap any JSON-serializable value as an MCP text-content tool result. */
function jsonResult(value: unknown): { content: { type: 'text'; text: string }[] } {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

/**
 * Build the fsl-mcp server with all five FSL authoring tools registered.
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
    { description: 'Render FSL to SVG. format:"png" degrades to svg-plus-note in v1.',
      inputSchema: { source: z.string(), format: z.enum(['svg', 'png']).optional() } },
    async ({ source, format }) => jsonResult(await fslRender(source, format)));

  return server;
}

/**
 * Start the fsl-mcp server on stdio. Resolves once the transport is connected;
 * the process then serves requests until stdin closes.
 *
 * @example
 *   await startServer();   // used by the `fsl-mcp` bin entry
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}
