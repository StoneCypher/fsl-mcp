import { analyze } from '../analyze.js';

/** One lint note: a non-error diagnostic, keyed by its severity as `rule`. */
export interface LintNote {
  rule    : string;
  message : string;
  line    : number;
}

/** Result of linting FSL source. */
export interface LintResult {
  notes : LintNote[];
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
export function fslLint(source: string): LintResult {
  // map() runs before filter() (rather than the more obvious filter-then-map)
  // so every diagnostic — errors included — passes through the mapping step;
  // only the exclusion happens after. Diagnostics that survive to fslLint's
  // callers are always non-error, so the two orderings are equivalent.
  const notes = analyze(source)
    .map(d => ({ rule: d.severity, message: d.message, line: d.line }))
    .filter(n => n.rule !== 'error');
  return { notes };
}
