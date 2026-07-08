#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fslDiagnostics, from } from 'jssm';
import { fsl_to_svg_string } from 'jssm/viz';

/**
 * Convert a 0-based character offset in `source` to a 1-based line/column.
 *
 * Offsets outside the string are clamped to its bounds, so a diagnostic that
 * points just past the end still yields a sane coordinate.
 *
 * @param source - the FSL source text
 * @param offset - a 0-based character index into `source`
 * @returns 1-based `line` and `col`
 *
 * @example
 *   offsetToLineCol('ab\ncd', 4)  // => { line: 2, col: 2 }
 */
function offsetToLineCol(source, offset) {
    const clamped = Math.max(0, Math.min(offset, source.length));
    let line = 1;
    let col = 1;
    for (let i = 0; i < clamped; i++) {
        if (source[i] === '\n') {
            line += 1;
            col = 1;
        }
        else {
            col += 1;
        }
    }
    return { line, col };
}
/**
 * Run jssm's editor-agnostic diagnostics over FSL source and normalize each to
 * fsl-mcp's `FslDiagnostic` shape (offsets -> 1-based line/col). Never throws.
 *
 * @param source - the FSL source text
 * @returns the diagnostics; `[]` when the source is clean
 *
 * @example
 *   analyze('a -> b -> c;')  // => []
 */
function analyze(source) {
    return fslDiagnostics(source).map(d => {
        const { line, col } = offsetToLineCol(source, d.range.from);
        return { severity: d.severity, message: d.message, line, col };
    });
}
/**
 * Whether any diagnostic is an error (i.e. the source does not compile).
 *
 * @example
 *   hasErrors(analyze('a -> ;'))  // => true
 */
function hasErrors(diags) {
    return diags.some(d => d.severity === 'error');
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
function fslValidate(source) {
    const diagnostics = analyze(source);
    return { valid: !hasErrors(diagnostics), diagnostics };
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
function fslLint(source) {
    const notes = analyze(source)
        .filter(d => d.severity !== 'error')
        .map(d => ({ rule: d.severity, message: d.message, line: d.line }));
    return { notes };
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
function fslExplain(source) {
    const diagnostics = analyze(source);
    if (hasErrors(diagnostics)) {
        return { valid: false, diagnostics };
    }
    const m = from(source);
    const states = m.states().map(String);
    const transitions = m.list_edges().map(e => {
        const t = { from: e.from, to: e.to, kind: e.kind };
        if (e.action !== undefined) {
            t.action = e.action;
        }
        if (e.name !== undefined) {
            t.name = e.name;
        }
        return t;
    });
    const start = states.filter((s) => m.is_start_state(s));
    const terminals = states.filter((s) => m.state_is_terminal(s));
    const summary = `${String(states.length)} states, ${String(transitions.length)} transitions; ` +
        `start: ${start.join(', ') || '(none)'}; ` +
        `terminal: ${terminals.join(', ') || '(none)'}.`;
    return { valid: true, states, transitions, start, terminals, summary };
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
function fslSimulate(source, actions) {
    const diagnostics = analyze(source);
    if (hasErrors(diagnostics)) {
        return { valid: false, diagnostics };
    }
    const m = from(source);
    const path = [m.state()];
    let rejected;
    for (const [i, a] of actions.entries()) {
        const ok = m.action(a) || m.transition(a);
        if (!ok) {
            rejected = { action: a, index: i };
            break;
        }
        path.push(m.state());
    }
    const result = {
        valid: true,
        endState: m.state(),
        path,
        legalNext: m.actions(),
    };
    if (rejected !== undefined) {
        result.rejected = rejected;
    }
    return result;
}

/**
 * Render FSL source to a diagram. SVG is produced natively; `format:'png'` is
 * accepted but degrades to the SVG plus a note in v1 (no rasterizer shipped).
 * Invalid source yields diagnostics and is never handed to the renderer.
 *
 * @param source - the FSL source text
 * @param format - `'svg'` (default) or `'png'`
 * @returns an SVG result, a degraded-png result, or an error with diagnostics
 *
 * @example
 *   await fslRender('a -> b;')          // => { valid: true, format: 'svg', svg: '<svg ...' }
 *   await fslRender('a -> b;', 'png')   // => { valid: true, format: 'png', svg: '<svg ...', note: '...' }
 */
async function fslRender(source, format = 'svg') {
    const diagnostics = analyze(source);
    if (hasErrors(diagnostics)) {
        return { valid: false, diagnostics };
    }
    const svg = await fsl_to_svg_string(source);
    if (format === 'png') {
        return {
            valid: true,
            format: 'png',
            svg,
            note: 'png rasterization is not yet supported in v1; returning svg. Tracked via the Wmcp sync items.',
        };
    }
    return { valid: true, format: 'svg', svg };
}

/** Wrap any JSON-serializable value as an MCP text-content tool result. */
function jsonResult(value) {
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
function createServer() {
    const server = new McpServer({ name: 'fsl-mcp', version: '0.1.0' });
    server.registerTool('fsl_validate', { description: 'Validate FSL source; returns { valid, diagnostics: [{severity, message, line, col}] }.',
        inputSchema: { source: z.string() } }, ({ source }) => jsonResult(fslValidate(source)));
    server.registerTool('fsl_lint', { description: 'Lint FSL source; returns { notes: [{rule, message, line}] } for non-error diagnostics.',
        inputSchema: { source: z.string() } }, ({ source }) => jsonResult(fslLint(source)));
    server.registerTool('fsl_explain', { description: 'Explain an FSL machine: { states, transitions, start, terminals, summary } or diagnostics.',
        inputSchema: { source: z.string() } }, ({ source }) => jsonResult(fslExplain(source)));
    server.registerTool('fsl_simulate', { description: 'Simulate a walk: apply actions/target-states in order; returns { endState, path, legalNext, rejected? }.',
        inputSchema: { source: z.string(), actions: z.array(z.string()) } }, ({ source, actions }) => jsonResult(fslSimulate(source, actions)));
    server.registerTool('fsl_render', { description: 'Render FSL to SVG. format:"png" degrades to svg-plus-note in v1.',
        inputSchema: { source: z.string(), format: z.enum(['svg', 'png']).optional() } }, async ({ source, format }) => jsonResult(await fslRender(source, format)));
    return server;
}
/**
 * Start the fsl-mcp server on stdio. Resolves once the transport is connected;
 * the process then serves requests until stdin closes.
 *
 * @example
 *   await startServer();   // used by the `fsl-mcp` bin entry
 */
async function startServer() {
    const server = createServer();
    await server.connect(new StdioServerTransport());
}

startServer().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=bin.mjs.map
