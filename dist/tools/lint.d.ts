/** One lint note: a non-error diagnostic, keyed by its severity as `rule`. */
export interface LintNote {
    rule: string;
    message: string;
    line: number;
}
/** Result of linting FSL source. */
export interface LintResult {
    notes: LintNote[];
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
export declare function fslLint(source: string): LintResult;
//# sourceMappingURL=lint.d.ts.map