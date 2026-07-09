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

/**
 * Whether the FSL source satisfies every present expectation in `expect`.
 * Only meaningful for valid source; an invalid machine returns false. An empty
 * `expect` passes for any valid machine.
 *
 * @param source - the FSL source (assumed already validity-checked by the caller)
 * @param expect - the machine-checkable expectations for this task
 * @returns true iff all present checks (states/transitions/start/terminals/walks) pass
 *
 * @example
 *   scoreCorrectness('a -> b;', { states: ['a','b'], transitions: [['a','b']] })  // => true
 */
export function scoreCorrectness(source: string, expect: Expect): boolean {
  const explained = fslExplain(source);
  if (!explained.valid) { return false; }

  if (expect.states !== undefined) {
    const have = new Set(explained.states);
    if (!expect.states.every(s => have.has(s))) { return false; }
  }

  if (expect.transitions !== undefined) {
    const edges = new Set(explained.transitions.map(t => `${t.from} ${t.to}`));
    if (!expect.transitions.every(([from, to]) => edges.has(`${from} ${to}`))) { return false; }
  }

  if (expect.start !== undefined) {
    const starts = new Set(explained.start);
    if (!expect.start.every(s => starts.has(s))) { return false; }
  }

  if (expect.terminals !== undefined) {
    const terms = new Set(explained.terminals);
    if (!expect.terminals.every(s => terms.has(s))) { return false; }
  }

  if (expect.walks !== undefined) {
    for (const walk of expect.walks) {
      const sim = fslSimulate(source, walk.actions);
      if (!sim.valid) { return false; }
      if (sim.endState !== walk.endState) { return false; }
      if (walk.rejectedAt !== undefined) {
        if (sim.rejected?.index !== walk.rejectedAt) { return false; }
      } else if (sim.rejected !== undefined) {
        return false;
      }
    }
  }

  return true;
}
