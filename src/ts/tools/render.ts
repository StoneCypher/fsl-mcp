import { fsl_to_svg_string } from 'jssm/viz';
import { analyze, hasErrors } from '../analyze.js';
import type { FslDiagnostic } from '../types.js';

/** Requested render format. */
export type RenderFormat = 'svg' | 'png';

/** Successful SVG render. */
export interface RenderSvg {
  valid  : true;
  format : 'svg';
  svg    : string;
}

/** PNG requested but unsupported in v1: the SVG plus an explanatory note. */
export interface RenderUnsupported {
  valid  : true;
  format : 'png';
  svg    : string;
  note   : string;
}

/** Returned instead of a diagram when the source does not compile. */
export interface RenderError {
  valid       : false;
  diagnostics : FslDiagnostic[];
}

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
export async function fslRender(
  source: string,
  format: RenderFormat = 'svg',
): Promise<RenderSvg | RenderUnsupported | RenderError> {
  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) { return { valid: false, diagnostics }; }

  const svg = await fsl_to_svg_string(source);

  if (format === 'png') {
    return {
      valid : true,
      format: 'png',
      svg,
      note  : 'png rasterization is not yet supported in v1; returning the svg instead.',
    };
  }

  return { valid: true, format: 'svg', svg };
}
