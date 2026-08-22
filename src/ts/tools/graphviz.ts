import { instance } from '@viz-js/viz';
import { RasterizationUnsupportedError } from 'jssm/cli';

/**
 * jssm's error for raster requests in runtimes with no rasterizer backend;
 * re-exported so callers and tests can detect the degrade path.
 */
export { RasterizationUnsupportedError };

/** Graphviz layout engines exposed by this tool. */
export type GraphvizEngine = 'dot' | 'neato' | 'fdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

/** Output formats this tool can produce. */
export type GraphvizFormat = 'svg' | 'png' | 'jpeg';

/** One diagnostic from graphviz, normalized so `level` is always present. */
export interface GraphvizDiagnostic {
  level   : 'error' | 'warning';
  message : string;
}

/** Raster-only tuning knobs; ignored for `svg`. */
export interface GraphvizRasterOptions {
  /** Fit raster output to this pixel width. */
  width?   : number;
  /** Fit raster output to this pixel height. */
  height?  : number;
  /** Raster zoom percentage. */
  scale?   : number;
  /** JPEG quality 1-100; ignored for other formats. Defaults to 85 downstream. */
  quality? : number;
}

/** viz-js's non-throwing render surface, narrowed to what this tool uses. */
export type VizRenderer = (
  dot     : string,
  options : { engine?: string; format?: string },
) =>
  | { status: 'success'; output: string;    errors: { level?: 'error' | 'warning'; message: string }[] }
  | { status: 'failure'; output: undefined; errors: { level?: 'error' | 'warning'; message: string }[] };

/** Produces a viz instance; `@viz-js/viz`'s `instance` by default. */
export type VizFactory = () => Promise<{ render: VizRenderer }>;

/** SVG-to-pixels; jssm/cli's `rasterize` by default. Wired up in Task 3. */
export type Rasterizer = (
  svg    : string,
  target : 'png' | 'jpeg',
  opts   : Record<string, number>,
) => Promise<Uint8Array>;

/** Injectable collaborators, so error paths are reachable without wasm. */
export interface GraphvizDeps {
  viz?    : VizFactory;
  raster? : Rasterizer;
}

/** Successful SVG render. */
export interface GraphvizSvg {
  valid      : true;
  format     : 'svg';
  svg        : string;
  warnings?  : string[];
}

/** Successful raster render; bytes are the encoded image. */
export interface GraphvizImage {
  valid     : true;
  format    : 'png' | 'jpeg';
  mimeType  : 'image/png' | 'image/jpeg';
  bytes     : Uint8Array;
  warnings? : string[];
}

/** Raster requested but no rasterizer backend exists: the SVG plus a note. */
export interface GraphvizUnsupported {
  valid  : true;
  format : 'png' | 'jpeg';
  svg    : string;
  note   : string;
}

/** Returned when the DOT source does not compile. */
export interface GraphvizError {
  valid  : false;
  errors : GraphvizDiagnostic[];
}

/** Returned when rendering itself fails. */
export interface GraphvizFailure {
  valid : false;
  error : string;
}

const MIME = {
  png  : 'image/png',
  jpeg : 'image/jpeg',
} as const;

/** Normalize a viz diagnostic; viz makes `level` optional, we do not. */
function normalize(e: { level?: 'error' | 'warning'; message: string }): GraphvizDiagnostic {
  return { level: e.level ?? 'error', message: e.message };
}

/** Render an unknown thrown value as a string. */
function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : JSON.stringify(err);
}

/** Copy only the defined raster options (exactOptionalPropertyTypes-safe). */
function definedOptions(options: GraphvizRasterOptions): Record<string, number> {
  const out: Record<string, number> = {};
  if (options.width   !== undefined) { out['width']   = options.width; }
  if (options.height  !== undefined) { out['height']  = options.height; }
  if (options.scale   !== undefined) { out['scale']   = options.scale; }
  if (options.quality !== undefined) { out['quality'] = options.quality; }
  return out;
}

/**
 * Render graphviz DOT source to a diagram. Uses viz-js's non-throwing
 * `render()`, so invalid DOT comes back as structured errors rather than an
 * exception, and the rasterizer is only ever handed an SVG graphviz already
 * produced successfully.
 *
 * @param dot - graphviz DOT source text
 * @param engine - layout engine; default `'dot'`
 * @param format - output format; default `'svg'`
 * @param options - raster tuning knobs; ignored for `'svg'`
 * @param deps - injectable collaborators, for tests
 * @returns an SVG result, a diagnostics result, or a failure
 * @throws never - all failures are returned as values
 *
 * @example
 *   await graphvizRender('digraph { a -> b; }')
 *   // => { valid: true, format: 'svg', svg: '<svg ...' }
 * @example
 *   await graphvizRender('digraph { a -> ')
 *   // => { valid: false, errors: [ { level: 'error', message: 'syntax error ...' } ] }
 */
export async function graphvizRender(
  dot     : string,
  engine  : GraphvizEngine        = 'dot',
  format  : GraphvizFormat        = 'svg',
  options : GraphvizRasterOptions = {},
  deps    : GraphvizDeps          = {},
): Promise<GraphvizSvg | GraphvizImage | GraphvizUnsupported | GraphvizError | GraphvizFailure> {

  const makeViz = deps.viz ?? (instance as VizFactory);

  let result: ReturnType<VizRenderer>;

  try {
    const viz = await makeViz();
    result = viz.render(dot, { engine, format: 'svg' });
  } catch (err: unknown) {
    return { valid: false, error: messageOf(err) };
  }

  if (result.status === 'failure') {
    return { valid: false, errors: result.errors.map(normalize) };
  }

  const svg      = result.output;
  const warnings = result.errors.map((e) => e.message);

  if (format === 'svg') {
    const out: GraphvizSvg = { valid: true, format: 'svg', svg };
    if (warnings.length > 0) { out.warnings = warnings; }
    return out;
  }

  const rasterFn = deps.raster;

  if (rasterFn === undefined) {
    return { valid: false, error: 'no rasterizer configured' };
  }

  try {
    const bytes = await rasterFn(svg, format, definedOptions(options));
    const out: GraphvizImage = { valid: true, format, mimeType: MIME[format], bytes };
    if (warnings.length > 0) { out.warnings = warnings; }
    return out;
  } catch (err: unknown) {
    if (err instanceof RasterizationUnsupportedError) {
      return {
        valid  : true,
        format,
        svg,
        note   : 'no raster backend available in this runtime; returning the svg instead.',
      };
    }
    return { valid: false, error: messageOf(err) };
  }

}
