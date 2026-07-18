import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
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
export declare function createServer(): McpServer;
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
export declare function startServer(transport?: Transport): Promise<void>;
//# sourceMappingURL=server.d.ts.map