import { fsl_to_svg_string } from 'jssm/viz';
import { analyze, hasErrors } from '../analyze.js';
/**
 * Render FSL source to a diagram. SVG is produced natively; `format:'png'` is
 * accepted but degrades to the SVG plus a note in v1 (no rasterizer shipped).
 * Invalid source yields diagnostics and is never handed to the renderer.
 *
 * @param source - the FSL source text
 * @param format - `'svg'` (default) or `'png'`
 * @returns an SVG result, a degraded-png result, or an error with diagnostics
 *
 * @example
 *   await fslRender('a -> b;')          // => { valid: true, format: 'svg', svg: '<svg ...' }
 *   await fslRender('a -> b;', 'png')   // => { valid: true, format: 'png', svg: '<svg ...', note: '...' }
 */
export async function fslRender(source, format = 'svg') {
    const diagnostics = analyze(source);
    if (hasErrors(diagnostics)) {
        return { valid: false, diagnostics };
    }
    const svg = await fsl_to_svg_string(source);
    if (format === 'png') {
        return {
            valid: true,
            format: 'png',
            svg,
            note: 'png rasterization is not yet supported in v1; returning svg. Tracked via the Wmcp sync items.',
        };
    }
    return { valid: true, format: 'svg', svg };
}
//# sourceMappingURL=render.js.map