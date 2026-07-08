import { analyze } from '../analyze.js';
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
export function fslLint(source) {
    const notes = analyze(source)
        .filter(d => d.severity !== 'error')
        .map(d => ({ rule: d.severity, message: d.message, line: d.line }));
    return { notes };
}
//# sourceMappingURL=lint.js.map