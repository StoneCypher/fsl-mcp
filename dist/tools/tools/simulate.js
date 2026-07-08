import { from } from 'jssm';
import { analyze, hasErrors } from '../analyze.js';
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
export function fslSimulate(source, actions) {
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
//# sourceMappingURL=simulate.js.map