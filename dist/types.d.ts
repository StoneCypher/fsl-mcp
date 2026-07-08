/** Severity of an FSL diagnostic, aligned with LSP / jssm's DiagnosticSeverity. */
export type FslSeverity = 'error' | 'warning' | 'info' | 'hint';
/**
 * A single FSL diagnostic in fsl-mcp's normalized shape.
 *
 * jssm reports positions as character offsets; fsl-mcp normalizes them to
 * 1-based line/column so tool consumers get human-facing coordinates.
 *
 * @example
 *   { severity: 'error', message: 'unexpected end of input', line: 1, col: 6 }
 */
export interface FslDiagnostic {
    severity: FslSeverity;
    message: string;
    line: number;
    col: number;
}
//# sourceMappingURL=types.d.ts.map