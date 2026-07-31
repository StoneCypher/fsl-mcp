import { McpServer } from '@modelcontextprotocol/server';
import type { StdioServerHandle } from '@modelcontextprotocol/server/stdio';
import type { Transport } from '@modelcontextprotocol/server';
/**
 * Build the fsl-mcp server: the five FSL authoring tools, the fsl_guide
 * guidance tool, and the fsl_scaffold preset-generator tool (seven tools
 * total), carrying the generated package identity and the `tools/list`
 * cache hint.
 *
 * Returns a configured but unconnected server - it is a factory product, not
 * something to `.connect()` directly. Its consumer is `startServer`, which
 * passes a factory wrapping this function to the SDK's `serveStdio`;
 * `serveStdio` owns instance construction (it may call the factory more than
 * once per connection, once per protocol era) and connects each instance to
 * its own era-aware channel. A hand-connected instance bypasses that era
 * dispatch entirely, so production and the e2e specs alike go through
 * `startServer`, never through a direct `server.connect(...)` call.
 *
 * @returns a configured, not-yet-connected MCP server
 *
 * @example
 *   const server = createServer();   // wrapped in a factory and passed to startServer
 *
 * @see {@link startServer}
 */
export declare function createServer(): McpServer;
/**
 * Start the fsl-mcp server on stdio, serving both protocol eras.
 *
 * Delegates to the SDK's `serveStdio`, which owns transport construction and
 * is what provides dual-era support: modern clients (revision `2026-07-28`,
 * per-request `_meta`) and legacy clients (`2025-11-25` and earlier, which
 * open with an `initialize` handshake) are both served from one process. The
 * factory form is required for this - a hand-connected transport bypasses the
 * era dispatch entirely.
 *
 * Passing an explicit transport runs the same serve path over injected
 * streams instead of the real process `stdin`/`stdout`, which is how the e2e
 * specs exercise real newline-delimited JSON-RPC framing without hijacking
 * the test process's stdio.
 *
 * Wires `onerror` (both when a transport is passed and when it is omitted)
 * to log every out-of-band error `serveStdio` reports - send failures,
 * malformed envelopes, discarded-probe timeouts, and a failed `wire.start()`
 * among them - to `stderr` via `console.error`. `stdout` is the protocol
 * channel; a stray write there would corrupt the stream for every connected
 * client, so nothing here ever writes to it. This does not exit the process:
 * `onerror` is the single sink for both a fatal startup failure and routine
 * per-message conditions, and the SDK gives no way to tell those apart from
 * the callback alone, so treating any of them as fatal risks killing an
 * otherwise-healthy server over one malformed message. Logging preserves the
 * pre-migration behavior's visibility without that risk.
 *
 * @param transport - an optional transport to serve on; omit for real stdio
 * @returns a handle whose `close()` tears down the server and the transport
 *
 * @example
 *   const handle = startServer();          // used by the `fsl-mcp` bin entry
 *   process.on('SIGINT', () => { void handle.close(); });
 *
 * @example
 *   const handle = startServer(new StdioServerTransport(stdin, stdout));
 *
 * @see {@link createServer}
 */
export declare function startServer(transport?: Transport): StdioServerHandle;
//# sourceMappingURL=server.d.ts.map