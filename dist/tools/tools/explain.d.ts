import type { FslDiagnostic } from '../types.js';
/** A transition in the explained structure. */
export interface ExplainTransition {
    from: string;
    to: string;
    kind: string;
    action?: string;
    name?: string;
}
/** Structural explanation of a valid machine. */
export interface ExplainResult {
    valid: true;
    states: string[];
    transitions: ExplainTransition[];
    start: string[];
    terminals: string[];
    summary: string;
}
/** Returned instead of a structure when the source does not compile. */
export interface ExplainError {
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
export declare function fslExplain(source: string): ExplainResult | ExplainError;
//# sourceMappingURL=explain.d.ts.map