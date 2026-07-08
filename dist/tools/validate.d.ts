import type { FslDiagnostic } from '../types.js';
/** Result of validating FSL source. */
export interface ValidateResult {
    valid: boolean;
    diagnostics: FslDiagnostic[];
}
/**
 * Validate FSL source: does it parse and compile, and what does jssm report.
 *
 * @param source - the FSL source text
 * @returns `valid` (no error-severity diagnostics) and the full diagnostic list
 *
 * @example
 *   fslValidate('a -> b;')   // => { valid: true,  diagnostics: [] }
 *   fslValidate('a -> ;')    // => { valid: false, diagnostics: [ {severity:'error', ...} ] }
 */
export declare function fslValidate(source: string): ValidateResult;
//# sourceMappingURL=validate.d.ts.map