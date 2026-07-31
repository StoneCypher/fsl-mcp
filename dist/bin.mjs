#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { fslDiagnostics, from } from 'jssm';
import { render, RasterizationUnsupportedError } from 'jssm/cli';

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
    // map() runs before filter() (rather than the more obvious filter-then-map)
    // so every diagnostic — errors included — passes through the mapping step;
    // only the exclusion happens after. Diagnostics that survive to fslLint's
    // callers are always non-error, so the two orderings are equivalent.
    const notes = analyze(source)
        .map(d => ({ rule: d.severity, message: d.message, line: d.line }))
        .filter(n => n.rule !== 'error');
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
        /* v8 ignore next -- defensive only: `.name` on a jssm edge is populated solely
           by the hand-built `new Machine(config)` JS API path (its constructor checks
           `if (tr.name) { ... }` to register `list_named_transitions()`); the FSL
           compiler pipeline (`from(source)` -> ... -> `makeTransition`) never writes a
           `name` key onto an edge literal - only `action`/`probability`/`after_time`.
           Since `fslExplain` only ever calls `from(source)` on FSL text, `e.name` is
           always `undefined` here for any real input; verified against jssm 5.162.10's
           bundled source and empirically via `list_edges()` on live-compiled machines. */
        if (e.name !== undefined) {
            t.name = e.name;
        }
        return t;
    });
    const start = states.filter((s) => m.is_start_state(s));
    const terminals = states.filter((s) => m.state_is_terminal(s));
    /* v8 ignore next -- defensive only: jssm's compiler rejects (error diagnostic)
       any source with zero transitions, and when no explicit start_state is
       declared it defaults to the first transition's `from` state - so a machine
       that clears the analyze-first guard above always has >=1 state and >=1
       start state; `start` can never be empty here. (`terminals` has no such
       guarantee - a cyclic machine like `a <-> b;` has zero terminal states - so
       only the `start` fallback, not the `terminals` one, is dead.) Verified
       against jssm 5.162.10's compile() source and empirically via
       fslDiagnostics()/from() on minimal sources. */
    const startLabel = start.join(', ') || '(none)';
    const summary = `${String(states.length)} states, ${String(transitions.length)} transitions; ` +
        `start: ${startLabel}; ` +
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

const MIME = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
};
/** Copy only the defined raster options (exactOptionalPropertyTypes-safe). */
function definedOptions(options) {
    const out = {};
    if (options.width !== undefined) {
        out['width'] = options.width;
    }
    if (options.height !== undefined) {
        out['height'] = options.height;
    }
    if (options.scale !== undefined) {
        out['scale'] = options.scale;
    }
    if (options.quality !== undefined) {
        out['quality'] = options.quality;
    }
    if (options.delay !== undefined) {
        out['delay'] = options.delay;
    }
    if (options.maxFrames !== undefined) {
        out['maxFrames'] = options.maxFrames;
    }
    return out;
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
async function fslRender(source, format = 'svg', options = {}, engine = render) {
    const diagnostics = analyze(source);
    if (hasErrors(diagnostics)) {
        return { valid: false, diagnostics };
    }
    try {
        const result = await engine(source, { target: format, ...definedOptions(options) });
        if (result.kind === 'text') {
            if (format === 'dot') {
                return { valid: true, format: 'dot', dot: result.content };
            }
            return { valid: true, format: 'svg', svg: result.content };
        }
        const raster = format;
        return { valid: true, format: raster, mimeType: MIME[raster], bytes: result.buffer };
    }
    catch (err) {
        if (err instanceof RasterizationUnsupportedError && (format === 'png' || format === 'jpeg' || format === 'gif')) {
            try {
                const fallback = await engine(source, { target: 'svg' });
                if (fallback.kind === 'text') {
                    return {
                        valid: true,
                        format,
                        svg: fallback.content,
                        note: 'no raster backend available in this runtime; returning the svg instead.',
                    };
                }
            }
            catch { /* fall through to failure below */ }
        }
        return { valid: false, error: err instanceof Error ? err.message : JSON.stringify(err) };
    }
}

// GENERATED FILE - DO NOT EDIT.
// Source: src/prompts/fsl-llms-draft.md + src/prompts/fsl-flowcharts.md
// Regenerate: node src/build_js/generate_guide_content.js (runs automatically before tsc)
/* eslint-disable @typescript-eslint/no-inferrable-types */
/** The "Flowcharts in FSL" idiom guide, verbatim from src/prompts/fsl-flowcharts.md. */
const GUIDE_FLOWCHARTS = `# Flowcharts in FSL

Flowcharts map cleanly onto state machines: every box is a state, every arrow
is a transition, and every decision is a state whose outgoing edges carry the
answers. This section shows the idiom. Every fenced example below is a
complete FSL document that compiles on its own. The fsl_scaffold tool returns
ready-to-edit starting documents for these idioms.

## The mapping

| Flowchart element | FSL |
|---|---|
| Process box | a plain state (default box shape) |
| Decision diamond | a state declared \`shape: diamond;\` with one labeled edge per outcome |
| Start terminal | your first state, styled so it reads as an entry point |
| End terminal | a state with no outgoing edges, declared \`shape: doublecircle;\` |
| Arrow label | an action label in single quotes BEFORE the arrow: \`'yes' ->\` |
| Failure/exception arrow | a forced transition \`~>\` |

## Decisions

One labeled edge per outcome, and the label goes **before** the arrow.
Decorations placed after the arrow silently do not bind - this is the single
most common flowchart-authoring mistake in FSL.

\`\`\`fsl
Validate 'ok' -> Ship;
Validate 'bad' -> Reject;

state Validate: { shape: diamond; };
\`\`\`

## Terminals

An end terminal is just a state with no outgoing edges; give it
\`doublecircle\` so it reads as terminal. Style the start state so the eye
finds the entry point. Note: a \`state\` declaration alone never creates a
state - \`state X : {};\` and \`state X : { shape: box; };\` alike are silently
dropped unless \`X\` appears in at least one edge. Only edges register states;
a self-loop \`X -> X;\` is the minimal way to make an edgeless box exist.
Properties are for styling, not existence.

\`\`\`fsl
Start -> Working;
Working -> Done;

state Start: { shape: circle; background-color: palegreen; };
state Done:  { shape: doublecircle; };
\`\`\`

## Failure paths

Keep the happy path on \`->\` and exceptional flow on \`~>\` (forced
transitions); they render distinctly, so main flow and failure flow separate
visually for free. Transitions chain: \`a -> b -> c;\` is three states and two
edges in one statement.

\`\`\`fsl
Fetch -> Parse -> Save;
Fetch ~> Failed;
Parse ~> Failed;
\`\`\`

## Loops

Rework cycles are ordinary edges pointing back; the labels keep the diagram
readable.

\`\`\`fsl
Draft -> Review;
Review 'approve' -> Publish;
Review 'revise'  -> Draft;
\`\`\`

## Layout and themes

\`flow: down;\` gives the classic top-to-bottom flowchart read; \`flow: right;\`
suits pipelines. Name the machine so renders are titled. Themes available:
\`default ocean modern plain bold\`.

\`\`\`fsl
machine_name: "Signup";
flow: down;

Landing -> Form -> Submitted;
\`\`\`

## Gotchas (all empirically verified)

- Action labels and decorations bind only BEFORE the arrow; after the arrow
  they are silently ignored - with ZERO diagnostics. Validation and lint
  both pass; only review catches the misplacement.
- A \`state\` declaration never creates a state - \`state X : {};\` and
  \`state X : { shape: box; };\` are both silently dropped unless \`X\` appears
  in an edge. Use a self-loop \`X -> X;\` to register an isolated state;
  properties style, they do not register.
- Two unlabeled edges with the same source and target collide, even across
  different arrow kinds. When you need parallel edges, give both distinct
  action labels - that is the verified-legal form.
- Apostrophes inside single-quoted labels need escaping: \`'it\\'s done'\`.
- Numeric cycle targets like \`+1\` compile - into an object pseudo-state
  (\`{"key":"cycle","value":1}\`) that appears in the state and edge lists,
  breaking things downstream rather than at compile time. Spell states out
  in flowcharts.

## Rendering flowcharts

Request \`format: "png"\` with \`width\` 640 or more for chat legibility;
\`format: "gif"\` (keep \`maxFrames\` at or under 20) animates a random walk
through the flow, which makes a good quick demo. If no raster backend is
available the render degrades to SVG plus a note.

## Worked example: an approval flowchart

\`\`\`fsl
machine_name: "Expense Approval";
flow: down;

Submitted -> Validating;
Validating 'complete'   -> ManagerReview;
Validating 'incomplete' -> Returned;
Returned 'resubmit' -> Submitted;
ManagerReview 'approve' -> Paid;
ManagerReview 'reject'  -> Returned;
ManagerReview ~> Escalated;
Escalated 'resolve' -> ManagerReview;

state Submitted:     { background-color: palegreen; };
state Validating:    { shape: diamond; };
state ManagerReview: { shape: diamond; };
state Paid:          { shape: doublecircle; background-color: palegreen; };
state Returned:      { line-style: dotted; };
state Escalated:     { background-color: mistyrose; };
\`\`\`

Submitted is the start terminal; Paid is the end terminal; both diamonds
carry one labeled edge per outcome; the escalation path rides \`~>\`; the
rework loop returns to Submitted. Render it with \`flow: down\` and it reads
exactly like the whiteboard version.
`;
/** The full FSL primer plus the flowchart guide, for agents new to FSL. */
const GUIDE_LANGUAGE = `# FSL — Finite State Language (authoring guide for LLMs)

You write FSL, the text language of the \`jssm\` library, to define finite-state
machines. This guide is verified against jssm 5.162.10. Emit only constructs
described here; do not import syntax from other DSLs or programming languages.

## Semantic model — read this first

An FSL document is a list of **statements**, each ending in a semicolon \`;\`.
Most statements are **transitions** between **states**. Whitespace and newlines
are insignificant; the \`;\` is the only statement separator.

- **States** are bare identifiers (\`Idle\`, \`Green\`, \`LoggedIn\`). You do not
  declare them to use them — a state exists as soon as a transition mentions
  it. Multi-word or punctuated names must be double-quoted strings
  (\`"Traffic Light"\`).
- **Transitions** connect states with an **arrow**. The arrow encodes a
  *direction* and a *kind*.
- **The start state** is whatever the \`start_states:\` directive names, or, in
  its absence, the **first state mentioned** in the document.
- **A terminal (final) state** is any state with no outgoing transition. You
  do not mark it; jssm derives it. (An \`end_states:\` directive marks
  *voluntary success* endpoints, which is a separate, optional concept.)

### The three transition kinds — this is the crux

| Arrow | Kind | Runtime meaning |
|-------|------|-----------------|
| \`->\`  | legal  | An ordinary allowed move. A driver may take it. |
| \`=>\`  | main   | The primary / "happy path". Also an ordinary allowed move at runtime — \`=>\` is \`->\` plus a "this is the main path" tag used for layout and documentation. It is **not** a different runtime mechanism. |
| \`~>\`  | forced | An **involuntary** edge: errors, timeouts, crashes, external interrupts. Naming the *target* is refused (\`transition('Failed')\` returns false), but firing the edge's *action* traverses it, and forced actions are listed in \`actions()\` / \`list_exit_actions()\`. The API's \`force_transition\` also traverses it. |

Use \`~>\` for anything the actor does not opt into. Model "the job crashed",
"the session timed out", "the payment was reversed" as forced edges — never as
\`->\`. This is the single most common FSL authoring mistake.

Verified (5.162.10): for \`Working 'crash' ~> Failed;\`, \`action('crash')\`
returns true and traverses the forced edge, and \`crash\` appears in \`actions()\`
/ \`list_exit_actions()\` (so it shows up in simulation's legal next moves). A
target-name \`transition('Failed')\` still returns false. \`force_transition\`
bypasses legality but not connectivity — the edge must still exist.

### Direction

A leftward glyph puts the source on the **right**. Two-headed glyphs make two
independent edges at once.

- \`A -> B;\` one edge A→B. \`A <- B;\` one edge B→A.
- \`A <-> B;\` two edges: A→B and B→A (both legal).

The kind letter is independent of direction, so every kind has three glyphs:

- legal: \`->\` \`<-\` \`<->\`
- main: \`=>\` \`<=\` \`<=>\`
- forced: \`~>\` \`<~\` \`<~>\`

**Mixed bidirectionals** give each direction its own kind. The left glyph
carries the leftward edge's kind, the right glyph the rightward edge's:
\`<-=>\` \`<=->\` \`<-~>\` \`<~->\` \`<=~>\` \`<~=>\`. Example — \`A <=-> B;\` makes A→B
*legal* (right glyph \`->\`) and B→A *main* (left glyph \`<=\`). These are rarely
needed; prefer two plain statements unless you specifically want one line.

Unicode arrow glyphs (\`→ ← ↔ ⇒ ⇐ ⇔ ↛ ↚ ↮\`) are accepted but **prefer ASCII**.

## Actions — named, single-quoted, BEFORE the arrow

An **action** is a named event that triggers a transition. Write it as a
single-quoted label placed **before** the arrow:

\`\`\`fsl
Idle 'insert coin' -> Paid;
\`\`\`

This binds the action \`insert coin\` to the edge Idle→Paid. At runtime, firing
that action from \`Idle\` moves the machine to \`Paid\`.

**Decorations placed *after* the arrow do NOT bind to a forward edge.** This is
verified and it is exactly the trap the previous guidance fell into:

- \`A 'go' -> B;\` binds action \`go\`  (fires A→B). ✅
- \`A -> 'go' B;\` binds **nothing** — the machine reports no action \`go\`. ❌

The same holds for probabilities (below). **Put actions and weights before the
arrow.** The misplacement produces **zero diagnostics**: validation and lint
both pass and the machine compiles with the decoration silently unbound. No
tool catches this — only review does.

Single quotes are for actions only. Double quotes make a string used as a
state/label name. \`A "go" -> B;\` is a **syntax error** — \`"go"\` is not an
action.

### Chains bind per hop

A chain is several arrows on one line; each action attaches to the hop it
precedes:

\`\`\`fsl
Green 'tick' => Yellow 'tick' => Red 'tick' => Green;
\`\`\`

\`tick\` from Green→Yellow, another \`tick\` Yellow→Red, another Red→Green. Verified:
driving \`tick\` three times cycles Green→Yellow→Red→Green.

## State lists — fan-in, fan-out, cross-product

A bracketed list \`[a b c]\` stands in for several states at once and expands to
one edge per member. It may appear as source, target, or both, and may carry a
pre-arrow action.

\`\`\`fsl
[Red Yellow Green] 'reset' -> Off;   // fan-in: 3 edges, each →Off, action reset
Off 'power' -> [Red];                // fan-out (single here)
\`\`\`

\`[a b] -> [c d];\` expands to the cross product (a→c, a→d, b→c, b→d).

## Probabilities and timing (for simulation)

A percentage weights a transition for stochastic simulation. Like actions it
goes **before** the arrow:

\`\`\`fsl
Rolling 70% -> Win;
Rolling 30% -> Lose;
\`\`\`

Verified: \`A 60% -> B\` attaches weight 60; \`A -> 60% B\` attaches nothing.

A timed edge fires after a delay: \`A 'go' -> after 5s B;\` (units: \`ms\`, \`s\`,
\`m\`/\`min\`, \`h\`, \`d\`, \`w\`, plus long forms like \`seconds\`, \`minutes\`).

## Worked examples (each compiles and runs as described)

Door with a lock:
\`\`\`fsl
Closed 'open'   -> Opened;
Opened 'close'  -> Closed;
Closed 'lock'   -> Locked;
Locked 'unlock' -> Closed;
\`\`\`

Job with an involuntary failure path and forced recovery:
\`\`\`fsl
start_states: [Idle];
Idle    'start'  -> Running;
Running 'finish' -> Done;
Running 'crash'  ~> Failed;
Failed           ~> Idle;
\`\`\`
\`crash\` and the \`Failed→Idle\` recovery are forced: an actor never *chooses* to
crash. \`Done\` and \`Failed\` (which has only a forced exit) behave differently —
\`Done\` is terminal, \`Failed\` is not, because a forced exit still counts as an
exit.

Approval flow with metadata and a voluntary end state:
\`\`\`fsl
machine_name:    "Approval Flow";
machine_version: 1.0.0;
machine_license: MIT;
start_states: [Draft];
end_states:   [Published];
Draft  'submit'  -> Review;
Review 'approve' -> Published;
Review 'reject'  ~> Draft;
\`\`\`

## Syntax reference

### Machine metadata (accepted keys, \`key: value;\`)
\`machine_name\` (label/string), \`machine_author\` (label, string, or \`[list]\`),
\`machine_contributor\`, \`machine_comment\`, \`machine_reference\`,
\`machine_version\` (semver \`x.y.z\`), \`fsl_version\` (semver), \`machine_license\`
(\`MIT\`, \`BSD 2-clause\`, \`BSD 3-clause\`, \`Apache 2.0\`, \`Mozilla 2.0\`,
\`Public domain\`, \`GPL v2\`, \`GPL v3\`, \`LGPL v2.1\`, \`LGPL v3.0\`, \`Unknown\`, or a
custom label/string), \`machine_language\`, \`npm_name\` (quote it if it contains a
hyphen), \`theme\` (\`default ocean modern plain bold\`), \`flow\`
(\`up right down left\`), \`dot_preamble\` ("string"), \`default_size\`.

\`\`\`fsl
machine_name: "Traffic Light";
machine_author: [Ada Grace];
machine_version: 2.1.0;
Green -> Yellow -> Red -> Green;
\`\`\`
A document needs at least one transition; metadata alone will not compile.

### Structural / rendering directives
- \`start_states: [A B];\` — override start-state inference.
- \`end_states: [A];\` — voluntary success endpoints.
- \`failed_outputs: [A];\` — failure endpoints.
- \`graph_layout: dot;\` — one of \`dot circo fdp neato twopi\`.
- \`allow_islands:\` — disconnected subgraphs are permitted **by default**
  (equivalent to \`allow_islands: true;\`). \`allow_islands: false;\` rejects a
  graph with disconnected components; \`allow_islands: with_start;\` requires
  every component to contain a start state.
- Default style blocks: \`state: { ... };\`, \`start_state: { ... };\`,
  \`end_state: { ... };\`, \`terminal_state: { ... };\`, \`active_state: { ... };\`,
  \`transition: { ... };\`, \`graph: { ... };\`.

### State declarations (styling one state)
\`\`\`fsl
state Error: { background-color: red; text-color: white; shape: box; };
Ok 'fail' -> Error;
Error 'clear' -> Ok;
\`\`\`
Item keys: \`label\`, \`color\`, \`text-color\`, \`background-color\`, \`border-color\`,
\`shape\`, \`corners\` (\`regular rounded lined\`), \`line-style\` (\`solid dotted
dashed\`), \`image\` ("url"), \`url\` ("url"), \`property\`. Colors: SVG names
(\`red\`, \`cornflowerblue\`), or hex \`#rgb\` / \`#rgba\` / \`#rrggbb\` / \`#rrggbbaa\`.
Shapes: graphviz names (\`box circle ellipse diamond hexagon cylinder note
plaintext\` …). A \`state\` declaration only styles; it creates neither
states nor edges - the state must appear in an edge to exist.

### Edge decoration block
Attach display data to an edge with a brace block after the arrow (keep
*actions/weights* before the arrow). One block holds **either** a run of
\`arc_label\`/\`head_label\`/\`tail_label\` items, **or** a single \`edge-color\`,
**or** a single \`line-style\` — these three groups cannot be combined in one
block.
\`\`\`fsl
A -> { arc_label: sync; head_label: out; } B;
B -> { edge-color: blue; } A;
\`\`\`

### Groups (named lists)
Declare a reusable set with \`&name\`, then use \`&name\` as a transition endpoint;
it expands to one edge per member.
\`\`\`fsl
&lit: [Red Yellow Green];
&lit 'reset' -> Off;
\`\`\`
Members may nest another group (\`&child\`) or spread it flat (\`...&child\`). A
group may also be styled: \`state &lit: { color: gold; };\`.

### Boundary hooks (in FSL text)
Register an action to fire when control crosses a state/group boundary:
\`\`\`fsl
Idle 'start' -> Working;
on enter Working do 'startTimer';
on exit  Working do 'stopTimer';
\`\`\`
\`enter\`/\`exit\`, subject is a state or \`&group\`, action is single-quoted. (This
is distinct from jssm's JavaScript hook API, which lives in code, not FSL text.)

### Layout hints (no colon)
\`arrange [A B];\` \`arrange-start [A];\` \`arrange-end [B];\` \`oarrange […];\`
\`farrange […];\` — ordering hints for rendering only.

### Global properties
\`property cost default 0;\` / \`property size required;\` — declare a machine
property. A per-state \`property: name value;\` (inside a \`state {}\` block)
requires the name to be globally declared first.

### Comments
\`// line comment\` to end of line; \`/* block comment */\` anywhere. Trailing
comments after a statement are fine.

## Agent directives

- **Use the exact state and action names the task gives you**, including their
  case and word form. If the request says states \`open\` and \`closed\`, write
  \`open\` - not \`Open\`, not \`Opened\`. Invented paraphrases are the most common
  correctness failure in otherwise-valid machines.
- **End every statement with \`;\`.** Missing semicolons are the top syntax
  error.
- **Actions: single quotes, before the arrow.** \`S 'act' -> T;\`. Never double
  quotes for an action; never place the action after the arrow.
- **Names with spaces or punctuation: double-quoted strings.** Bare atoms allow
  letters, digits, and \`. _ ! $ ^ * ? ,\` (and more), but **not spaces or
  hyphens**; quote such names.
- **Model involuntary events as forced (\`~>\`), voluntary choices as \`->\`.**
  Errors, timeouts, and external interrupts are \`~>\`; a user/actor decision is
  \`->\`. Reserve \`=>\` for marking the primary happy path.
- **Let start and terminal states be derived** unless the machine needs
  otherwise: start = \`start_states:\` or first-mentioned; terminal = any state
  with no exit. Add \`start_states:\` only when the first-mentioned state is not
  the real entry point.
- **Do not invent syntax.** No loops, conditionals, variables, guards,
  expressions, or nested machines — FSL has none. If a concept is not in this
  guide, do not emit it. In particular \`machine_definition:\` and a
  \`hooks: open;\` attribute are **not** accepted by this version; omit them.
- **No \`+N\` cycle targets.** \`A -> +1;\` compiles, but into an object
  pseudo-state (\`{"key":"cycle","value":1}\`) visible in the state and edge
  lists; breakage surfaces downstream, not at compile time. Spell the target
  state out.
- **One machine per document.** Put metadata first, then transitions, then
  optional styling — though order is not enforced.
- **Prefer ASCII arrows** over the Unicode equivalents.


# Flowcharts in FSL

Flowcharts map cleanly onto state machines: every box is a state, every arrow
is a transition, and every decision is a state whose outgoing edges carry the
answers. This section shows the idiom. Every fenced example below is a
complete FSL document that compiles on its own. The fsl_scaffold tool returns
ready-to-edit starting documents for these idioms.

## The mapping

| Flowchart element | FSL |
|---|---|
| Process box | a plain state (default box shape) |
| Decision diamond | a state declared \`shape: diamond;\` with one labeled edge per outcome |
| Start terminal | your first state, styled so it reads as an entry point |
| End terminal | a state with no outgoing edges, declared \`shape: doublecircle;\` |
| Arrow label | an action label in single quotes BEFORE the arrow: \`'yes' ->\` |
| Failure/exception arrow | a forced transition \`~>\` |

## Decisions

One labeled edge per outcome, and the label goes **before** the arrow.
Decorations placed after the arrow silently do not bind - this is the single
most common flowchart-authoring mistake in FSL.

\`\`\`fsl
Validate 'ok' -> Ship;
Validate 'bad' -> Reject;

state Validate: { shape: diamond; };
\`\`\`

## Terminals

An end terminal is just a state with no outgoing edges; give it
\`doublecircle\` so it reads as terminal. Style the start state so the eye
finds the entry point. Note: a \`state\` declaration alone never creates a
state - \`state X : {};\` and \`state X : { shape: box; };\` alike are silently
dropped unless \`X\` appears in at least one edge. Only edges register states;
a self-loop \`X -> X;\` is the minimal way to make an edgeless box exist.
Properties are for styling, not existence.

\`\`\`fsl
Start -> Working;
Working -> Done;

state Start: { shape: circle; background-color: palegreen; };
state Done:  { shape: doublecircle; };
\`\`\`

## Failure paths

Keep the happy path on \`->\` and exceptional flow on \`~>\` (forced
transitions); they render distinctly, so main flow and failure flow separate
visually for free. Transitions chain: \`a -> b -> c;\` is three states and two
edges in one statement.

\`\`\`fsl
Fetch -> Parse -> Save;
Fetch ~> Failed;
Parse ~> Failed;
\`\`\`

## Loops

Rework cycles are ordinary edges pointing back; the labels keep the diagram
readable.

\`\`\`fsl
Draft -> Review;
Review 'approve' -> Publish;
Review 'revise'  -> Draft;
\`\`\`

## Layout and themes

\`flow: down;\` gives the classic top-to-bottom flowchart read; \`flow: right;\`
suits pipelines. Name the machine so renders are titled. Themes available:
\`default ocean modern plain bold\`.

\`\`\`fsl
machine_name: "Signup";
flow: down;

Landing -> Form -> Submitted;
\`\`\`

## Gotchas (all empirically verified)

- Action labels and decorations bind only BEFORE the arrow; after the arrow
  they are silently ignored - with ZERO diagnostics. Validation and lint
  both pass; only review catches the misplacement.
- A \`state\` declaration never creates a state - \`state X : {};\` and
  \`state X : { shape: box; };\` are both silently dropped unless \`X\` appears
  in an edge. Use a self-loop \`X -> X;\` to register an isolated state;
  properties style, they do not register.
- Two unlabeled edges with the same source and target collide, even across
  different arrow kinds. When you need parallel edges, give both distinct
  action labels - that is the verified-legal form.
- Apostrophes inside single-quoted labels need escaping: \`'it\\'s done'\`.
- Numeric cycle targets like \`+1\` compile - into an object pseudo-state
  (\`{"key":"cycle","value":1}\`) that appears in the state and edge lists,
  breaking things downstream rather than at compile time. Spell states out
  in flowcharts.

## Rendering flowcharts

Request \`format: "png"\` with \`width\` 640 or more for chat legibility;
\`format: "gif"\` (keep \`maxFrames\` at or under 20) animates a random walk
through the flow, which makes a good quick demo. If no raster backend is
available the render degrades to SVG plus a note.

## Worked example: an approval flowchart

\`\`\`fsl
machine_name: "Expense Approval";
flow: down;

Submitted -> Validating;
Validating 'complete'   -> ManagerReview;
Validating 'incomplete' -> Returned;
Returned 'resubmit' -> Submitted;
ManagerReview 'approve' -> Paid;
ManagerReview 'reject'  -> Returned;
ManagerReview ~> Escalated;
Escalated 'resolve' -> ManagerReview;

state Submitted:     { background-color: palegreen; };
state Validating:    { shape: diamond; };
state ManagerReview: { shape: diamond; };
state Paid:          { shape: doublecircle; background-color: palegreen; };
state Returned:      { line-style: dotted; };
state Escalated:     { background-color: mistyrose; };
\`\`\`

Submitted is the start terminal; Paid is the end terminal; both diamonds
carry one labeled edge per outcome; the escalation path rides \`~>\`; the
rework loop returns to Submitted. Render it with \`flow: down\` and it reads
exactly like the whiteboard version.
`;

// GENERATED FILE - DO NOT EDIT.
// Source: src/prompts/scaffolds/*.fsl
// Regenerate: node src/build_js/generate_scaffold_content.js (runs automatically before tsc)
/** Raw preset FSL sources, keyed by preset id (scaffold filename sans .fsl). */
const SCAFFOLD_SOURCES = {
    'decision': `machine_name: "Decision";
flow: down;

// Labels bind BEFORE the arrow; after the arrow they are silently ignored.
Validate 'ok'  -> Ship;
Validate 'bad' -> Reject;

state Validate: { shape: diamond; };
state Ship:     { shape: doublecircle; background-color: palegreen; };
state Reject:   { shape: doublecircle; background-color: mistyrose; };
`,
    'flowchart': `machine_name: "Expense Approval";
flow: down;

// Full flowchart idiom: terminals, diamonds, forced escalation, rework loop.
Submitted -> Validating;
Validating 'complete'   -> ManagerReview;
Validating 'incomplete' -> Returned;
Returned 'resubmit' -> Submitted;
ManagerReview 'approve' -> Paid;
ManagerReview 'reject'  -> Returned;
ManagerReview ~> Escalated;
Escalated 'resolve' -> ManagerReview;

state Submitted:     { background-color: palegreen; };
state Validating:    { shape: diamond; };
state ManagerReview: { shape: diamond; };
state Paid:          { shape: doublecircle; background-color: palegreen; };
state Returned:      { line-style: dotted; };
state Escalated:     { background-color: mistyrose; };
`,
    'handshake': `machine_name: "Handshake";
flow: right;

Idle 'connect'          -> Connecting;
Connecting 'acknowledge' -> Established;
Established 'close'      -> Idle;
// A timeout is involuntary: it rides ~>.
Connecting ~> TimedOut;
TimedOut 'connect' -> Connecting;

state Established: { background-color: palegreen; };
state TimedOut:    { background-color: mistyrose; };
`,
    'job-lifecycle': `machine_name: "Job Lifecycle";
flow: right;

Queued 'start'   -> Running;
Running 'finish' -> Done;
// Jobs do not choose to fail.
Running ~> Failed;
Failed 'retry' -> Retrying;
Retrying -> Running;

state Done:   { shape: doublecircle; background-color: palegreen; };
state Failed: { background-color: mistyrose; };
`,
    'network-topology': `machine_name: "Network";
graph_layout: neato;

// A drawing, not a machine: <-> draws linked pairs.
Hub <-> Switch_A;
Hub <-> Switch_B;
Switch_A <-> Host_One;
Switch_A <-> Host_Two;
Switch_B <-> Host_Three;
// Islands are allowed by default; a self-loop registers an isolated node.
Standby -> Standby;

state Hub:     { shape: hexagon; };
state Standby: { line-style: dashed; };
`,
    'org-chart': `machine_name: "Org Chart";
flow: down;

// A drawing, not a process: edges are reporting lines. Render it; never simulate it.
CEO -> [VP_Eng VP_Sales];
VP_Eng -> [Eng_One Eng_Two];
VP_Sales -> [Sales_One Sales_Two];

state CEO: { background-color: lightgoldenrodyellow; };
`,
    'pipeline': `machine_name: "Pipeline";
flow: right;

// Happy path rides ->; involuntary failure rides ~>.
Fetch -> Parse -> Save;
Fetch ~> Failed;
Parse ~> Failed;

state Fetch:  { background-color: palegreen; };
state Failed: { background-color: mistyrose; };
`,
    'review-loop': `machine_name: "Review Loop";
flow: down;

Draft 'submit'   -> Review;
Review 'approve' -> Publish;
Review 'revise'  -> Draft;

state Publish: { shape: doublecircle; background-color: palegreen; };
`,
};

/**
 * The scaffold preset registry: which presets exist, their family, their
 * renamable role slots (with canonical names as authored in the .fsl
 * sources), and the teaching notes returned alongside each scaffold.
 * Adding a chart family later = a new .fsl file + one entry here.
 *
 * @see ./scaffold.js for the substitution logic that consumes this.
 */
const NOTE_BEFORE = 'Action labels and decorations bind only BEFORE the arrow; misplacement compiles clean with zero diagnostics.';
const NOTE_FORCED = 'Involuntary flow (failures, timeouts) rides ~>, never ->.';
const NOTE_EDGES = 'Only edges register states; a state declaration alone styles and never creates.';
const NOTE_DRAWING = 'This preset is a drawing, not a process: simulate is meaningless; render it (fsl_render, format png).';
/** All preset definitions, keyed by preset id. */
const SCAFFOLD_REGISTRY = {
    'decision': { family: 'flowchart', machineName: 'Decision',
        slots: [{ role: 'decision', kind: 'state', canonical: 'Validate' },
            { role: 'outcomes', kind: 'stateList', canonical: ['Ship', 'Reject'] }],
        notes: [NOTE_BEFORE, NOTE_EDGES] },
    'pipeline': { family: 'flowchart', machineName: 'Pipeline',
        slots: [{ role: 'stages', kind: 'stateList', canonical: ['Fetch', 'Parse', 'Save'] },
            { role: 'failed', kind: 'state', canonical: 'Failed' }],
        notes: [NOTE_FORCED, NOTE_BEFORE] },
    'review-loop': { family: 'flowchart', machineName: 'Review Loop',
        slots: [{ role: 'draft', kind: 'state', canonical: 'Draft' },
            { role: 'review', kind: 'state', canonical: 'Review' },
            { role: 'publish', kind: 'state', canonical: 'Publish' },
            { role: 'approve', kind: 'action', canonical: 'approve' },
            { role: 'revise', kind: 'action', canonical: 'revise' }],
        notes: [NOTE_BEFORE] },
    'flowchart': { family: 'flowchart', machineName: 'Expense Approval',
        slots: [{ role: 'submitted', kind: 'state', canonical: 'Submitted' },
            { role: 'validating', kind: 'state', canonical: 'Validating' },
            { role: 'managerReview', kind: 'state', canonical: 'ManagerReview' },
            { role: 'paid', kind: 'state', canonical: 'Paid' },
            { role: 'returned', kind: 'state', canonical: 'Returned' },
            { role: 'escalated', kind: 'state', canonical: 'Escalated' }],
        notes: [NOTE_BEFORE, NOTE_FORCED, NOTE_EDGES] },
    'handshake': { family: 'protocol', machineName: 'Handshake',
        slots: [{ role: 'idle', kind: 'state', canonical: 'Idle' },
            { role: 'connecting', kind: 'state', canonical: 'Connecting' },
            { role: 'established', kind: 'state', canonical: 'Established' },
            { role: 'failed', kind: 'state', canonical: 'TimedOut' },
            { role: 'connect', kind: 'action', canonical: 'connect' },
            { role: 'acknowledge', kind: 'action', canonical: 'acknowledge' }],
        notes: [NOTE_FORCED] },
    'job-lifecycle': { family: 'process', machineName: 'Job Lifecycle',
        slots: [{ role: 'queued', kind: 'state', canonical: 'Queued' },
            { role: 'running', kind: 'state', canonical: 'Running' },
            { role: 'done', kind: 'state', canonical: 'Done' },
            { role: 'failed', kind: 'state', canonical: 'Failed' },
            { role: 'retrying', kind: 'state', canonical: 'Retrying' },
            { role: 'start', kind: 'action', canonical: 'start' },
            { role: 'finish', kind: 'action', canonical: 'finish' },
            { role: 'retry', kind: 'action', canonical: 'retry' }],
        notes: [NOTE_FORCED, NOTE_BEFORE] },
    'org-chart': { family: 'orgchart', machineName: 'Org Chart',
        slots: [{ role: 'root', kind: 'state', canonical: 'CEO' },
            { role: 'branches', kind: 'stateList', canonical: ['VP_Eng', 'VP_Sales'] },
            { role: 'leaves', kind: 'stateList', canonical: ['Eng_One', 'Eng_Two', 'Sales_One', 'Sales_Two'] }],
        notes: [NOTE_DRAWING, NOTE_EDGES] },
    'network-topology': { family: 'network', machineName: 'Network',
        slots: [{ role: 'hub', kind: 'state', canonical: 'Hub' },
            { role: 'switches', kind: 'stateList', canonical: ['Switch_A', 'Switch_B'] },
            { role: 'hosts', kind: 'stateList', canonical: ['Host_One', 'Host_Two', 'Host_Three'] },
            { role: 'isolated', kind: 'state', canonical: 'Standby' }],
        notes: [NOTE_DRAWING, NOTE_EDGES] },
};
/** Preset ids in stable sorted order; the tool's input enum derives from this. */
const PRESET_IDS = Object.keys(SCAFFOLD_REGISTRY).sort();

/**
 * fsl_scaffold's engine: resolves a preset id plus optional machine name and
 * role renames into a complete, analyze-verified FSL document. Substitution
 * is a token-boundary rename of the canonical names authored in the preset
 * sources - it never changes structure, which is why list slots are
 * fixed-arity.
 *
 * @example
 *   const r = fslScaffold('decision', 'Fraud Check', { outcomes: ['Approve', 'Deny'] });
 *   if (r.valid) console.log(r.source);
 *
 * @see ./scaffold-registry.js for the preset catalog
 */
const BARE = /^[A-Za-z][A-Za-z0-9_]*$/;
/**
 * True when `s` is unusable as a scaffold name: empty, containing any
 * control character, or containing a backslash ANYWHERE. Backslashes are
 * rejected wholesale - not just trailing ones - because every name is
 * embedded in a quoted FSL literal where jssm's string grammar interprets
 * backslash escapes: a trailing `\` eats the closing quote, an unrecognized
 * escape (e.g. `\m`) fails to compile, and a recognized escape (e.g. `\\`
 * or `\n`) COLLAPSES, so the compiled state name would silently differ from
 * the caller's string and the returned roles map would lie about it.
 * Control characters (C0 plus DEL) are rejected for the same family of
 * reasons: jssm's single-quoted action-label grammar rejects some of them
 * while double-quoted contexts accept the same character, and none of them
 * belong in a diagram label.
 */
const hasControlChar = (s) => {
    for (let i = 0; i < s.length; i += 1) {
        const code = s.charCodeAt(i);
        if (code < 0x20 || code === 0x7f)
            return true;
    }
    return false;
};
const isBadName = (s) => s.length === 0 || hasControlChar(s) || s.includes('\\');
/** Renders a state name as FSL: bare when safe, double-quoted otherwise. */
const stateToken = (name) => (BARE.test(name) ? name : `"${name}"`);
/** Renders an action label body with apostrophes escaped for single quotes. */
const actionBody = (name) => name.replace(/'/g, "\\'");
/** Escapes regex metacharacters so a literal string is safe inside an alternation. */
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * Applies every substitution to `src` in one single-pass combined regex, so no
 * replacement text is ever re-scanned by a later alternative (the source of the
 * cross-slot corruption this replaces). Order in `subs` sets alternation
 * precedence: earlier entries win when two alternatives could start at the
 * same position. `subs` must be non-empty; the sole caller always pushes the
 * machine_name statement first.
 */
const substitute = (src, subs) => {
    const lookup = new Map(subs.map((sub) => [sub.from, sub.to]));
    const pattern = subs
        .map((sub) => (sub.bounded ? `\\b${escapeRegExp(sub.from)}\\b` : escapeRegExp(sub.from)))
        .join('|');
    const combined = new RegExp(pattern, 'g');
    /* v8 ignore next -- defensive fallback only: `combined`'s alternatives are built
       verbatim from each `sub.from` (`\b` bounding only adds zero-width anchors, it
       never alters the matched text), and `lookup` is keyed by those same `from`
       strings, so any `match` the regex captures is always present in `lookup`.
       No real input can make `.get(match)` miss. */
    return src.replace(combined, (match) => lookup.get(match) ?? match);
};
/**
 * Builds a scaffold from a preset with optional renames; never throws.
 *
 * @param preset - a preset id from the registry (the tool's enum enforces this at the boundary)
 * @param machineName - replacement for the preset's machine_name (always quoted)
 * @param roles - renames keyed by role; list slots need exactly their canonical count
 */
function fslScaffold(preset, machineName, roles) {
    const presetKnown = Object.prototype.hasOwnProperty.call(SCAFFOLD_REGISTRY, preset)
        && Object.prototype.hasOwnProperty.call(SCAFFOLD_SOURCES, preset);
    const def = presetKnown ? SCAFFOLD_REGISTRY[preset] : undefined;
    const raw = presetKnown ? SCAFFOLD_SOURCES[preset] : undefined;
    if (def === undefined || raw === undefined) {
        return { valid: false, errors: [`unknown preset: ${preset}`] };
    }
    const errors = [];
    const known = new Set(def.slots.map((s) => s.role));
    for (const key of Object.keys(roles ?? {})) {
        if (!known.has(key))
            errors.push(`unknown role: ${key}`);
    }
    if (machineName !== undefined && (isBadName(machineName) || machineName.includes('"'))) {
        errors.push('machine_name must be non-empty with no quotes, control characters, or backslashes');
    }
    const resolved = {};
    const finalNames = [];
    const actionNames = [];
    for (const slot of def.slots) {
        const given = roles?.[slot.role];
        if (slot.kind === 'stateList') {
            const value = given ?? slot.canonical;
            if (typeof value === 'string' || value.length !== slot.canonical.length) {
                errors.push(`role ${slot.role} needs exactly ${String(slot.canonical.length)} names`);
                continue;
            }
            value.forEach((n) => {
                if (isBadName(n) || n.includes('"'))
                    errors.push(`role ${slot.role}: bad name ${JSON.stringify(n)}`);
            });
            resolved[slot.role] = value;
            finalNames.push(...value);
        }
        else {
            const value = given ?? slot.canonical;
            if (typeof value !== 'string') {
                errors.push(`role ${slot.role} takes a single name`);
                continue;
            }
            if (isBadName(value) || (slot.kind === 'state' && value.includes('"'))) {
                errors.push(`role ${slot.role}: bad name ${JSON.stringify(value)}`);
                continue;
            }
            resolved[slot.role] = value;
            if (slot.kind === 'state')
                finalNames.push(value);
            if (slot.kind === 'action')
                actionNames.push(value);
        }
    }
    if (new Set(finalNames).size !== finalNames.length) {
        errors.push('resolved state names must be unique');
    }
    if (new Set(actionNames).size !== actionNames.length) {
        errors.push('resolved action labels must be unique');
    }
    if (errors.length > 0)
        return { valid: false, errors };
    // Build every substitution against the ORIGINAL raw source, then resolve them
    // all in one combined regex pass (see `substitute`). Order matters: the
    // machine_name statement and quoted-action forms are pushed before bare
    // state tokens, so they take alternation precedence. The machine_name
    // substitution is ALWAYS pushed - even as an identity rewrite - so the
    // combined regex consumes the whole statement and no bare state token can
    // reach into its quoted text (e.g. review-loop's "Review Loop" containing
    // the canonical state Review).
    const subs = [];
    subs.push({
        from: `machine_name: "${def.machineName}";`,
        to: `machine_name: "${machineName ?? def.machineName}";`,
        bounded: false,
    });
    for (const slot of def.slots) {
        if (slot.kind !== 'action')
            continue;
        const value = resolved[slot.role];
        if (typeof value === 'string' && value !== slot.canonical) {
            subs.push({ from: `'${slot.canonical}'`, to: `'${actionBody(value)}'`, bounded: false });
        }
    }
    for (const slot of def.slots) {
        const value = resolved[slot.role];
        /* v8 ignore next -- defensive only: `errors.length === 0` is already guaranteed
           here (checked above), and the resolution loop above sets `resolved[slot.role]`
           for every slot unless it also pushes an error and `continue`s - so every
           slot's value is guaranteed defined by this point. No real input reaches the
           `undefined` branch. */
        if (value === undefined)
            continue;
        if (slot.kind === 'stateList' && typeof value !== 'string') {
            slot.canonical.forEach((from, i) => {
                const to = value[i];
                if (to !== undefined && to !== from) {
                    subs.push({ from, to: stateToken(to), bounded: true });
                }
            });
        }
        else if (slot.kind === 'state' && typeof value === 'string' && value !== slot.canonical) {
            subs.push({ from: slot.canonical, to: stateToken(value), bounded: true });
        }
    }
    const source = substitute(raw, subs);
    const diagnostics = analyze(source);
    /* v8 ignore start -- defensive armor: substitution performs token-boundary
       renames of names validated above (non-empty, no quotes, no control
       characters, no backslashes anywhere, unique states, unique action
       labels, correct arity) into source text that scaffold.spec.ts proves
       compiles both unmodified and under a full rename of every slot for
       every preset in SCAFFOLD_REGISTRY. Probed and confirmed rejected in
       validation, never reaching this gate: every backslash-grammar class
       (trailing '\', unrecognized interior escapes like '\m', recognized
       escapes '\\'/'\n' that would silently collapse and make the roles map
       lie), raw C0/DEL control characters in any position (previously the
       one reachable class, via single-quoted action-label grammar), and
       duplicate resolved action labels. No known input reaches this branch;
       it is retained as armor against jssm grammar surprises. */
    if (hasErrors(diagnostics)) {
        return { valid: false, errors: ['substituted scaffold failed to compile (tool defect - please report)'] };
    }
    /* v8 ignore stop */
    return { valid: true, preset, family: def.family, source, roles: resolved, notes: def.notes };
}

// GENERATED FILE - DO NOT EDIT.
// Source: package.json (version field)
// Regenerate: node src/build_js/generate_version.js (runs automatically before tsc)
/** The published fsl-mcp version, reported as this server's identity over MCP. */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const FSL_MCP_VERSION = '0.6.0';

/** Default freshness window for `tools/list`: one hour. */
const DEFAULT_TTL_MS = 3_600_000;
/**
 * Resolve the cache hint applied to `tools/list` results.
 *
 * fsl-mcp's tool list is compiled in and cannot change while the process runs,
 * so it is safely cacheable for a long window, and it carries no
 * authorization-specific or user-specific data, so it is `'public'`. The TTL is
 * overridable via `FSL_MCP_TOOLS_TTL_MS` so a development loop can force a
 * refetch after a rebuild; set it to `0` to mark every response immediately
 * stale.
 *
 * An unparseable, fractional, or negative override is ignored with a warning
 * rather than propagated, because the SDK throws a `RangeError` at
 * server-construction time for an invalid hint - which would take the whole
 * server down at startup and surface to the user as a broken server.
 *
 * @param env - the environment to read `FSL_MCP_TOOLS_TTL_MS` from
 * @returns the hint to pass as the server's `tools/list` cache hint
 *
 * @example
 *   toolsCacheHint({});                                 // { ttlMs: 3600000, cacheScope: 'public' }
 *   toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: '0' });      // { ttlMs: 0, cacheScope: 'public' }
 *   toolsCacheHint({ FSL_MCP_TOOLS_TTL_MS: 'banana' }); // default, plus a stderr warning
 *
 * @see {@link https://modelcontextprotocol.io/specification/2026-07-28/changelog | SEP-2549}
 */
function toolsCacheHint(env) {
    const raw = env['FSL_MCP_TOOLS_TTL_MS'];
    if (raw === undefined) {
        return { ttlMs: DEFAULT_TTL_MS, cacheScope: 'public' };
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
        console.error(`fsl-mcp: ignoring invalid FSL_MCP_TOOLS_TTL_MS=${raw}; using ${String(DEFAULT_TTL_MS)}`);
        return { ttlMs: DEFAULT_TTL_MS, cacheScope: 'public' };
    }
    return { ttlMs: parsed, cacheScope: 'public' };
}

/** Wrap any JSON-serializable value as an MCP text-content tool result. */
function jsonResult(value) {
    return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}
/**
 * Formats the fsl_scaffold tool description's per-preset family list, e.g.
 * `decision (flowchart), handshake (protocol), ...` for every registered preset.
 *
 * @returns a comma-separated `preset (family)` list in `PRESET_IDS` order
 */
function presetFamilySummary() {
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
function renderResult(r) {
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
function createServer() {
    const server = new McpServer({ name: 'fsl-mcp', version: FSL_MCP_VERSION }, { cacheHints: { 'tools/list': toolsCacheHint(process.env) } });
    server.registerTool('fsl_validate', { description: 'Validate FSL source; returns { valid, diagnostics: [{severity, message, line, col}] }.',
        inputSchema: z.object({ source: z.string() }) }, ({ source }) => jsonResult(fslValidate(source)));
    server.registerTool('fsl_lint', { description: 'Lint FSL source; returns { notes: [{rule, message, line}] } for non-error diagnostics.',
        inputSchema: z.object({ source: z.string() }) }, ({ source }) => jsonResult(fslLint(source)));
    server.registerTool('fsl_explain', { description: 'Explain an FSL machine: { states, transitions, start, terminals, summary } or diagnostics.',
        inputSchema: z.object({ source: z.string() }) }, ({ source }) => jsonResult(fslExplain(source)));
    server.registerTool('fsl_simulate', { description: 'Simulate a walk: apply actions/target-states in order; returns { endState, path, legalNext, rejected? }.',
        inputSchema: z.object({ source: z.string(), actions: z.array(z.string()) }) }, ({ source, actions }) => jsonResult(fslSimulate(source, actions)));
    server.registerTool('fsl_render', { description: 'Render FSL to a diagram. format: svg (default) | dot (text) | png | jpeg | gif (returned as an image content block when a raster backend is available, otherwise degraded to svg text plus a note; gif animates a random walk). Raster options: width, height, scale (zoom %, 100 = 3x), quality (jpeg 1-100), delay (gif centiseconds/frame), maxFrames (gif; keep <= 20 for chat).',
        inputSchema: z.object({
            source: z.string(),
            format: z.enum(['svg', 'dot', 'png', 'jpeg', 'gif']).optional(),
            width: z.number().int().positive().optional(),
            height: z.number().int().positive().optional(),
            scale: z.number().int().positive().optional(),
            quality: z.number().int().min(1).max(100).optional(),
            delay: z.number().int().positive().optional(),
            maxFrames: z.number().int().min(1).max(100).optional(),
        }) }, async ({ source, format, width, height, scale, quality, delay, maxFrames }) => {
        const options = {};
        if (width !== undefined) {
            options.width = width;
        }
        if (height !== undefined) {
            options.height = height;
        }
        if (scale !== undefined) {
            options.scale = scale;
        }
        if (quality !== undefined) {
            options.quality = quality;
        }
        if (delay !== undefined) {
            options.delay = delay;
        }
        if (maxFrames !== undefined) {
            options.maxFrames = maxFrames;
        }
        return renderResult(await fslRender(source, format, options));
    });
    server.registerTool('fsl_guide', { description: 'Returns FSL authoring guidance as markdown. topic "language": the full FSL primer - call before writing FSL for the first time. topic "flowcharts": how to express flowcharts in FSL (decision diamonds, labeled branches, terminals, failure paths). Takes no FSL source.',
        inputSchema: z.object({ topic: z.enum(['flowcharts', 'language']) }) }, ({ topic }) => ({
        content: [{ type: 'text', text: topic === 'flowcharts' ? GUIDE_FLOWCHARTS : GUIDE_LANGUAGE }],
    }));
    server.registerTool('fsl_scaffold', { description: `Returns a complete, compiling FSL starting document for a preset chart shape, with your names substituted in. Presets by family: ${presetFamilySummary()}. Pass roles to rename states/actions; list roles need their exact canonical count. See fsl_guide topic "flowcharts" for the idioms.`,
        inputSchema: z.object({
            preset: z.enum(PRESET_IDS),
            machine_name: z.string().optional(),
            roles: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
        }) }, ({ preset, machine_name, roles }) => jsonResult(fslScaffold(preset, machine_name, roles)));
    return server;
}
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
function startServer(transport) {
    const onerror = (error) => { console.error(error); };
    return serveStdio(() => createServer(), 
    /* v8 ignore next -- the omitted-transport arm binds serveStdio to the
       real process stdin/stdout; exercising it here would hijack the test
       process's actual stdio, exactly what passing an explicit transport
       exists to avoid (see this function's DocBlock). Exercised in
       production by every real invocation of the `fsl-mcp` bin entry
       (src/ts/bin.ts), which is itself excluded from the coverage gate for
       the same reason. */
    { onerror } );
}

const handle = startServer();
process.on('SIGINT', () => { void handle.close(); });
process.on('SIGTERM', () => { void handle.close(); });
//# sourceMappingURL=bin.mjs.map
