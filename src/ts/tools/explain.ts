import { from } from 'jssm';
import { analyze, hasErrors } from '../analyze.js';
import type { FslDiagnostic } from '../types.js';

/** A transition in the explained structure. */
export interface ExplainTransition {
  from    : string;
  to      : string;
  kind    : string;
  action? : string;
  name?   : string;
}

/** Structural explanation of a valid machine. */
export interface ExplainResult {
  valid       : true;
  states      : string[];
  transitions : ExplainTransition[];
  start       : string[];
  terminals   : string[];
  summary     : string;
}

/** Returned instead of a structure when the source does not compile. */
export interface ExplainError {
  valid       : false;
  diagnostics : FslDiagnostic[];
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
export function fslExplain(source: string): ExplainResult | ExplainError {
  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) { return { valid: false, diagnostics }; }

  const m      = from(source);
  const states = m.states().map(String);

  const transitions = m.list_edges().map(e => {
    const t: ExplainTransition = { from: e.from, to: e.to, kind: e.kind };
    if (e.action !== undefined) { t.action = e.action; }
    /* v8 ignore next -- defensive only: `.name` on a jssm edge is populated solely
       by the hand-built `new Machine(config)` JS API path (its constructor checks
       `if (tr.name) { ... }` to register `list_named_transitions()`); the FSL
       compiler pipeline (`from(source)` -> ... -> `makeTransition`) never writes a
       `name` key onto an edge literal - only `action`/`probability`/`after_time`.
       Since `fslExplain` only ever calls `from(source)` on FSL text, `e.name` is
       always `undefined` here for any real input; verified against jssm 5.162.10's
       bundled source and empirically via `list_edges()` on live-compiled machines. */
    if (e.name   !== undefined) { t.name   = e.name; }
    return t;
  });

  const start     = states.filter((s: string) => m.is_start_state(s));
  const terminals = states.filter((s: string) => m.state_is_terminal(s));
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
  const summary   =
    `${String(states.length)} states, ${String(transitions.length)} transitions; ` +
    `start: ${startLabel}; ` +
    `terminal: ${terminals.join(', ') || '(none)'}.`;

  return { valid: true, states, transitions, start, terminals, summary };
}
