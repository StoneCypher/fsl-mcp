import { McpServer, Transport } from '@modelcontextprotocol/server';
import { StdioServerHandle } from '@modelcontextprotocol/server/stdio';
export { StdioServerHandle } from '@modelcontextprotocol/server/stdio';
export { RasterizationUnsupportedError } from 'jssm/cli';

/** Severity of an FSL diagnostic, aligned with LSP / jssm's DiagnosticSeverity. */
type FslSeverity = 'error' | 'warning' | 'info' | 'hint';
/**
 * A single FSL diagnostic in fsl-mcp's normalized shape.
 *
 * jssm reports positions as character offsets; fsl-mcp normalizes them to
 * 1-based line/column so tool consumers get human-facing coordinates.
 *
 * @example
 *   { severity: 'error', message: 'unexpected end of input', line: 1, col: 6 }
 */
interface FslDiagnostic {
    severity: FslSeverity;
    message: string;
    line: number;
    col: number;
}

/** Result of validating FSL source. */
interface ValidateResult {
    valid: boolean;
    diagnostics: FslDiagnostic[];
}
/**
 * Validate FSL source: does it parse and compile, and what does jssm report.
 *
 * @param source - the FSL source text
 * @returns `valid` (no error-severity diagnostics) and the full diagnostic list
 *
 * @example
 *   fslValidate('a -> b;')   // => { valid: true,  diagnostics: [] }
 *   fslValidate('a -> ;')    // => { valid: false, diagnostics: [ {severity:'error', ...} ] }
 */
declare function fslValidate(source: string): ValidateResult;

/** One lint note: a non-error diagnostic, keyed by its severity as `rule`. */
interface LintNote {
    rule: string;
    message: string;
    line: number;
}
/** Result of linting FSL source. */
interface LintResult {
    notes: LintNote[];
}
/**
 * Lint FSL source: surface warning/info/hint diagnostics as style notes.
 * Error-severity problems are the province of `fslValidate` and are excluded.
 *
 * @param source - the FSL source text
 * @returns the non-error notes; `notes: []` when the source is clean
 *
 * @example
 *   fslLint('a -> b;')  // => { notes: [] }
 */
declare function fslLint(source: string): LintResult;

/** A transition in the explained structure. */
interface ExplainTransition {
    from: string;
    to: string;
    kind: string;
    action?: string;
    name?: string;
}
/** Structural explanation of a valid machine. */
interface ExplainResult {
    valid: true;
    states: string[];
    transitions: ExplainTransition[];
    start: string[];
    terminals: string[];
    summary: string;
}
/** Returned instead of a structure when the source does not compile. */
interface ExplainError {
    valid: false;
    diagnostics: FslDiagnostic[];
}
/**
 * Explain an FSL machine's structure: its states, transitions, start state(s),
 * terminal state(s), and a one-line summary. Invalid source yields diagnostics.
 *
 * @param source - the FSL source text
 * @returns an `ExplainResult` for valid source, or an `ExplainError` otherwise
 *
 * @example
 *   fslExplain('a -> b;')
 *   // => { valid: true, states: ['a','b'], transitions: [{from:'a',to:'b',kind:...}],
 *   //      start: ['a'], terminals: ['b'], summary: '2 states, 1 transitions; ...' }
 */
declare function fslExplain(source: string): ExplainResult | ExplainError;

/** Result of simulating a walk over a valid machine. */
interface SimulateResult {
    valid: true;
    endState: string;
    path: string[];
    legalNext: string[];
    rejected?: {
        action: string;
        index: number;
    };
}
/** Returned instead of a walk when the source does not compile. */
interface SimulateError {
    valid: false;
    diagnostics: FslDiagnostic[];
}
/**
 * Simulate a walk over an FSL machine. Each entry in `actions` is applied as an
 * action label first (`.action`), then — if that is not legal — as a target
 * state (`.transition`). The walk stops at the first move that is neither, and
 * that rejection is reported. Invalid source yields diagnostics.
 *
 * @param source - the FSL source text
 * @param actions - action labels and/or target state names to apply in order
 * @returns a `SimulateResult` for valid source, or a `SimulateError` otherwise
 *
 * @example
 *   fslSimulate('a -> b -> c;', ['b', 'c'])
 *   // => { valid: true, endState: 'c', path: ['a','b','c'], legalNext: [...] }
 *
 * @example
 *   fslSimulate('a -> b;', ['c'])
 *   // => { valid: true, endState: 'a', path: ['a'], legalNext: [...],
 *   //      rejected: { action: 'c', index: 0 } }
 */
declare function fslSimulate(source: string, actions: string[]): SimulateResult | SimulateError;

/** Requested render format: two text targets and three raster targets. */
type RenderFormat = 'svg' | 'dot' | 'png' | 'jpeg' | 'gif';
/** Raster-only tuning knobs, forwarded verbatim to jssm's render engine. */
interface RenderRasterOptions {
    /** Fit raster output to this pixel width. */
    width?: number;
    /** Fit raster output to this pixel height. */
    height?: number;
    /** Raster zoom percentage; 100 = 3x natural size. */
    scale?: number;
    /** JPEG quality 1-100; ignored for other formats. */
    quality?: number;
    /** GIF per-frame delay in centiseconds; ignored for other formats. */
    delay?: number;
    /** GIF walk-length frame ceiling; ignored for other formats. */
    maxFrames?: number;
}
/** The engine contract: jssm/cli's render(), injectable for error-path tests. */
type RenderEngine = (fsl: string, opts: Record<string, unknown>) => Promise<{
    kind: 'text';
    content: string;
} | {
    kind: 'raster';
    buffer: Uint8Array;
}>;
/** Successful SVG render. */
interface RenderSvg {
    valid: true;
    format: 'svg';
    svg: string;
}
/** Successful DOT (graphviz source) render. */
interface RenderDot {
    valid: true;
    format: 'dot';
    dot: string;
}
/** Successful raster render; bytes are the encoded image. */
interface RenderImage {
    valid: true;
    format: 'png' | 'jpeg' | 'gif';
    mimeType: 'image/png' | 'image/jpeg' | 'image/gif';
    bytes: Uint8Array;
}
/** Raster requested but no rasterizer backend exists: the SVG plus a note. */
interface RenderUnsupported {
    valid: true;
    format: 'png' | 'jpeg' | 'gif';
    svg: string;
    note: string;
}
/** Returned instead of a diagram when the source does not compile. */
interface RenderError {
    valid: false;
    diagnostics: FslDiagnostic[];
}
/** Returned when the render engine itself fails at render time. */
interface RenderFailure {
    valid: false;
    error: string;
}
/**
 * Render FSL source to a diagram. `svg` (default) and `dot` return text;
 * `png`, `jpeg`, and `gif` return real encoded image bytes (the gif animates a
 * random walk). When a raster format is requested but no rasterizer backend is
 * available, degrades to the SVG plus a note. Invalid source yields
 * diagnostics and is never handed to the render engine.
 *
 * @param source - the FSL source text
 * @param format - one of `'svg' | 'dot' | 'png' | 'jpeg' | 'gif'`; default `'svg'`
 * @param options - raster tuning knobs; ignored for text formats
 * @param engine - render engine, injectable for tests; defaults to jssm/cli's
 * @returns a text result, an image result, a degraded result, or a failure
 * @throws never - all failures are returned as values
 *
 * @example
 *   await fslRender('a -> b;')                          // => { valid: true, format: 'svg', svg: '<svg ...' }
 * @example
 *   await fslRender('a -> b;', 'png', { width: 640 })   // => { valid: true, format: 'png', mimeType: 'image/png', bytes: Uint8Array }
 */
declare function fslRender(source: string, format?: RenderFormat, options?: RenderRasterOptions, engine?: RenderEngine): Promise<RenderSvg | RenderDot | RenderImage | RenderUnsupported | RenderFailure | RenderError>;

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
declare function createServer(): McpServer;
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
declare function startServer(transport?: Transport): StdioServerHandle;

export { createServer, fslExplain, fslLint, fslRender, fslSimulate, fslValidate, startServer };
export type { ExplainError, ExplainResult, ExplainTransition, FslDiagnostic, FslSeverity, LintNote, LintResult, RenderDot, RenderEngine, RenderError, RenderFailure, RenderFormat, RenderImage, RenderRasterOptions, RenderSvg, RenderUnsupported, SimulateError, SimulateResult, ValidateResult };
