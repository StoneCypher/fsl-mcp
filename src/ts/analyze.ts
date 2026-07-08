import { fslDiagnostics } from 'jssm';
import type { FslDiagnostic } from './types.js';

/**
 * Convert a 0-based character offset in `source` to a 1-based line/column.
 *
 * Offsets outside the string are clamped to its bounds, so a diagnostic that
 * points just past the end still yields a sane coordinate.
 *
 * @param source - the FSL source text
 * @param offset - a 0-based character index into `source`
 * @returns 1-based `line` and `col`
 *
 * @example
 *   offsetToLineCol('ab\ncd', 4)  // => { line: 2, col: 2 }
 */
export function offsetToLineCol(source: string, offset: number): { line: number; col: number } {
  const clamped = Math.max(0, Math.min(offset, source.length));
  let line = 1;
  let col  = 1;
  for (let i = 0; i < clamped; i++) {
    if (source[i] === '\n') { line += 1; col = 1; }
    else { col += 1; }
  }
  return { line, col };
}

/**
 * Run jssm's editor-agnostic diagnostics over FSL source and normalize each to
 * fsl-mcp's `FslDiagnostic` shape (offsets -> 1-based line/col). Never throws.
 *
 * @param source - the FSL source text
 * @returns the diagnostics; `[]` when the source is clean
 *
 * @example
 *   analyze('a -> b -> c;')  // => []
 */
export function analyze(source: string): FslDiagnostic[] {
  return fslDiagnostics(source).map(d => {
    const { line, col } = offsetToLineCol(source, d.range.from);
    return { severity: d.severity, message: d.message, line, col };
  });
}

/**
 * Whether any diagnostic is an error (i.e. the source does not compile).
 *
 * @example
 *   hasErrors(analyze('a -> ;'))  // => true
 */
export function hasErrors(diags: FslDiagnostic[]): boolean {
  return diags.some(d => d.severity === 'error');
}
