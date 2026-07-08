import { from } from 'jssm';
import { analyze, hasErrors } from '../analyze.js';
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
export function fslExplain(source) {
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
//# sourceMappingURL=explain.js.map