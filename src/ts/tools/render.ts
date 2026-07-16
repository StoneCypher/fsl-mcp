import { render as jssmRender, RasterizationUnsupportedError } from 'jssm/cli';
import { analyze, hasErrors } from '../analyze.js';
import type { FslDiagnostic } from '../types.js';

/**
 * jssm's error for raster requests in runtimes with no rasterizer backend;
 * re-exported so engine stubs and callers can detect the degrade path.
 */
export { RasterizationUnsupportedError };

/** Requested render format: two text targets and three raster targets. */
export type RenderFormat = 'svg' | 'dot' | 'png' | 'jpeg' | 'gif';

/** Raster-only tuning knobs, forwarded verbatim to jssm's render engine. */
export interface RenderRasterOptions {
  /** Fit raster output to this pixel width. */
  width?: number;
  /** Fit raster output to this pixel height. */
  height?: number;
  /** Raster zoom percentage; 100 = 3x natural size. */
  scale?: number;
  /** JPEG quality 1-100; ignored for other formats. */
  quality?: number;
  /** GIF per-frame delay in centiseconds; ignored for other formats. */
  delay?: number;
  /** GIF walk-length frame ceiling; ignored for other formats. */
  maxFrames?: number;
}

/** The engine contract: jssm/cli's render(), injectable for error-path tests. */
export type RenderEngine = (
  fsl: string,
  opts: Record<string, unknown>,
) => Promise<{ kind: 'text'; content: string } | { kind: 'raster'; buffer: Uint8Array }>;

/** Successful SVG render. */
export interface RenderSvg {
  valid  : true;
  format : 'svg';
  svg    : string;
}

/** Successful DOT (graphviz source) render. */
export interface RenderDot {
  valid  : true;
  format : 'dot';
  dot    : string;
}

/** Successful raster render; bytes are the encoded image. */
export interface RenderImage {
  valid    : true;
  format   : 'png' | 'jpeg' | 'gif';
  mimeType : 'image/png' | 'image/jpeg' | 'image/gif';
  bytes    : Uint8Array;
}

/** Raster requested but no rasterizer backend exists: the SVG plus a note. */
export interface RenderUnsupported {
  valid  : true;
  format : 'png' | 'jpeg' | 'gif';
  svg    : string;
  note   : string;
}

/** Returned instead of a diagram when the source does not compile. */
export interface RenderError {
  valid       : false;
  diagnostics : FslDiagnostic[];
}

/** Returned when the render engine itself fails at render time. */
export interface RenderFailure {
  valid : false;
  error : string;
}

const MIME = {
  png  : 'image/png',
  jpeg : 'image/jpeg',
  gif  : 'image/gif',
} as const;

/** Copy only the defined raster options (exactOptionalPropertyTypes-safe). */
function definedOptions(options: RenderRasterOptions): Record<string, number> {
  const out: Record<string, number> = {};
  if (options.width     !== undefined) { out['width']     = options.width; }
  if (options.height    !== undefined) { out['height']    = options.height; }
  if (options.scale     !== undefined) { out['scale']     = options.scale; }
  if (options.quality   !== undefined) { out['quality']   = options.quality; }
  if (options.delay     !== undefined) { out['delay']     = options.delay; }
  if (options.maxFrames !== undefined) { out['maxFrames'] = options.maxFrames; }
  return out;
}

/**
 * Render FSL source to a diagram. `svg` (default) and `dot` return text;
 * `png`, `jpeg`, and `gif` return real encoded image bytes (the gif animates a
 * random walk). When a raster format is requested but no rasterizer backend is
 * available, degrades to the SVG plus a note. Invalid source yields
 * diagnostics and is never handed to the render engine.
 *
 * @param source - the FSL source text
 * @param format - one of `'svg' | 'dot' | 'png' | 'jpeg' | 'gif'`; default `'svg'`
 * @param options - raster tuning knobs; ignored for text formats
 * @param engine - render engine, injectable for tests; defaults to jssm/cli's
 * @returns a text result, an image result, a degraded result, or a failure
 * @throws never - all failures are returned as values
 *
 * @example
 *   await fslRender('a -> b;')                          // => { valid: true, format: 'svg', svg: '<svg ...' }
 * @example
 *   await fslRender('a -> b;', 'png', { width: 640 })   // => { valid: true, format: 'png', mimeType: 'image/png', bytes: Uint8Array }
 */
export async function fslRender(
  source: string,
  format: RenderFormat = 'svg',
  options: RenderRasterOptions = {},
  engine: RenderEngine = jssmRender as unknown as RenderEngine,
): Promise<RenderSvg | RenderDot | RenderImage | RenderUnsupported | RenderFailure | RenderError> {
  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) { return { valid: false, diagnostics }; }

  try {
    const result = await engine(source, { target: format, ...definedOptions(options) });

    if (result.kind === 'text') {
      if (format === 'dot') { return { valid: true, format: 'dot', dot: result.content }; }
      return { valid: true, format: 'svg', svg: result.content };
    }

    const raster = format as 'png' | 'jpeg' | 'gif';
    return { valid: true, format: raster, mimeType: MIME[raster], bytes: result.buffer };
  } catch (err: unknown) {
    if (err instanceof RasterizationUnsupportedError && (format === 'png' || format === 'jpeg' || format === 'gif')) {
      try {
        const fallback = await engine(source, { target: 'svg' });
        if (fallback.kind === 'text') {
          return {
            valid : true,
            format,
            svg   : fallback.content,
            note  : 'no raster backend available in this runtime; returning the svg instead.',
          };
        }
      } catch { /* fall through to failure below */ }
    }
    return { valid: false, error: err instanceof Error ? err.message : JSON.stringify(err) };
  }
}
