import { analyze, hasErrors } from '../analyze.js';
import { fslExplain }         from '../tools/explain.js';
import { fslSimulate }        from '../tools/simulate.js';
import type { Expect }        from './types.js';

/**
 * Extract the FSL source from a model's response. Prefers a fenced ```fsl block;
 * falls back to a bare ``` fence. Returns null when no fenced block is present.
 *
 * @param text - the model's full text response
 * @returns the FSL inside the first matching fence, trimmed, or null
 *
 * @example
 *   extractFsl('```fsl\na -> b;\n```')  // => 'a -> b;'
 */
export function extractFsl(text: string): string | null {
  const fenced = /```fsl\s*\n([\s\S]*?)```/i.exec(text) ?? /```\s*\n([\s\S]*?)```/.exec(text);
  if (fenced === null) { return null; }
  const body = fenced[1];
  if (body === undefined) { return null; }
  const trimmed = body.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Whether the FSL source compiles clean (no error-severity diagnostics).
 *
 * @example
 *   scoreValidity('a -> b;')  // => true
 */
export function scoreValidity(source: string): boolean {
  return !hasErrors(analyze(source));
}

/** Case-fold a name for comparison purposes only; never used to alter what
 *  jssm itself returns or is given as machine source. */
function fold(name: string): string {
  return name.toLowerCase();
}

/**
 * Whether the FSL source satisfies every present expectation in `expect`.
 * Only meaningful for valid source; an invalid machine returns false. An empty
 * `expect` passes for any valid machine.
 *
 * All name comparisons — state names, transition endpoints, start states,
 * terminal states, a walk's `endState`, and the action labels in a walk's
 * `actions` — are case-insensitive: a task's expectation may be written in
 * whatever case (e.g. `on`/`off`) and still match a machine that names its
 * states or actions differently (e.g. `On`/`Off`), since a case difference
 * alone does not make the machine structurally wrong. Because jssm's own
 * `action()`/`transition()` lookups are case-sensitive, a walk's `actions`
 * are first resolved (case-insensitively, against the machine's own action
 * labels and state names) to their actual casing before being simulated;
 * only the resolved copy is passed to jssm, never a mutated view of jssm's
 * own output.
 *
 * @param source - the FSL source (assumed already validity-checked by the caller)
 * @param expect - the machine-checkable expectations for this task
 * @returns true iff all present checks (states/transitions/start/terminals/walks) pass
 *
 * @example
 *   scoreCorrectness('a -> b;', { states: ['a','b'], transitions: [['a','b']] })  // => true
 *
 * @example
 *   // case-insensitive: machine uses 'On'/'Off', expectation uses lowercase
 *   scoreCorrectness('On -> Off;', { states: ['on', 'off'], start: ['on'] })  // => true
 */
export function scoreCorrectness(source: string, expect: Expect): boolean {
  const explained = fslExplain(source);
  if (!explained.valid) { return false; }

  if (expect.states !== undefined) {
    const have = new Set(explained.states.map(fold));
    if (!expect.states.every(s => have.has(fold(s)))) { return false; }
  }

  if (expect.transitions !== undefined) {
    const edges = new Set(explained.transitions.map(t => `${fold(t.from)} ${fold(t.to)}`));
    if (!expect.transitions.every(([from, to]) => edges.has(`${fold(from)} ${fold(to)}`))) { return false; }
  }

  if (expect.start !== undefined) {
    const starts = new Set(explained.start.map(fold));
    if (!expect.start.every(s => starts.has(fold(s)))) { return false; }
  }

  if (expect.terminals !== undefined) {
    const terms = new Set(explained.terminals.map(fold));
    if (!expect.terminals.every(s => terms.has(fold(s)))) { return false; }
  }

  if (expect.walks !== undefined) {
    // Case-insensitive lookup from a folded name back to the machine's actual
    // casing, so a walk's actions can be written in any case even though
    // jssm's own action()/transition() require an exact-case match.
    const actionNames = new Map<string, string>();
    for (const t of explained.transitions) {
      if (t.action !== undefined) { actionNames.set(fold(t.action), t.action); }
    }
    const stateNames = new Map(explained.states.map(s => [fold(s), s] as const));

    for (const walk of expect.walks) {
      const resolvedActions = walk.actions.map(a => actionNames.get(fold(a)) ?? stateNames.get(fold(a)) ?? a);
      const sim = fslSimulate(source, resolvedActions);
      if (!sim.valid) { return false; }
      if (fold(sim.endState) !== fold(walk.endState)) { return false; }
      if (walk.rejectedAt !== undefined) {
        if (sim.rejected?.index !== walk.rejectedAt) { return false; }
      } else if (sim.rejected !== undefined) {
        return false;
      }
    }
  }

  return true;
}
