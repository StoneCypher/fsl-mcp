import { from } from 'jssm';
import { analyze, hasErrors } from '../analyze.js';
import type { FslDiagnostic } from '../types.js';

/** Result of simulating a walk over a valid machine. */
export interface SimulateResult {
  valid     : true;
  endState  : string;
  path      : string[];
  legalNext : string[];
  rejected? : { action: string; index: number };
}

/** Returned instead of a walk when the source does not compile. */
export interface SimulateError {
  valid       : false;
  diagnostics : FslDiagnostic[];
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
export function fslSimulate(source: string, actions: string[]): SimulateResult | SimulateError {
  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) { return { valid: false, diagnostics }; }

  const m    = from(source);
  const path : string[] = [ m.state() ];
  let rejected: { action: string; index: number } | undefined;

  for (const [i, a] of actions.entries()) {
    const ok = m.action(a) || m.transition(a);
    if (!ok) { rejected = { action: a, index: i }; break; }
    path.push(m.state());
  }

  const result: SimulateResult = {
    valid    : true,
    endState : m.state(),
    path,
    legalNext: m.actions(),
  };
  if (rejected !== undefined) { result.rejected = rejected; }
  return result;
}
