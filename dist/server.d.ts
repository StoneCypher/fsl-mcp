import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
export declare function createServer(): McpServer;
/**
 * Start the fsl-mcp server on stdio. Resolves once the transport is connected;
 * the process then serves requests until stdin closes.
 *
 * @example
 *   await startServer();   // used by the `fsl-mcp` bin entry
 */
export declare function startServer(): Promise<void>;
//# sourceMappingURL=server.d.ts.map