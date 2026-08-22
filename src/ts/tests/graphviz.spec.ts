import { describe, it, expect } from 'vitest';
import { graphvizRender, RasterizationUnsupportedError } from '../tools/graphviz.js';
import type { Rasterizer } from '../tools/graphviz.js';

describe('graphvizRender, svg', () => {

  it('renders a trivial digraph', async () => {
    const r = await graphvizRender('digraph { a -> b; }');
    expect(r.valid).toBe(true);
    if (r.valid && 'svg' in r) {
      expect(r.svg).toContain('<svg');
      expect(r.svg).toContain('</svg>');
    }
  });

  it('lays out with the requested engine', async () => {
    const dotEngine   = await graphvizRender('graph { a -- b; b -- c; c -- a; }', 'dot');
    const neatoEngine = await graphvizRender('graph { a -- b; b -- c; c -- a; }', 'neato');
    expect(dotEngine.valid).toBe(true);
    expect(neatoEngine.valid).toBe(true);
    if (dotEngine.valid && 'svg' in dotEngine && neatoEngine.valid && 'svg' in neatoEngine) {
      // different layout engines produce different geometry for the same graph
      expect(dotEngine.svg).not.toEqual(neatoEngine.svg);
    }
  });

  it('returns structured errors for invalid dot rather than throwing', async () => {
    const r = await graphvizRender('digraph { a -> ');
    expect(r.valid).toBe(false);
    if (!r.valid && 'errors' in r) {
      expect(r.errors.length).toBeGreaterThan(0);
      expect(r.errors[0]?.message).toBeTypeOf('string');
      expect(r.errors[0]?.level).toBe('error');
    }
  });

  it('surfaces graphviz warnings on an otherwise successful render', async () => {
    const stubViz = () => Promise.resolve({
      render: () => ({
        status : 'success' as const,
        output : '<svg></svg>',
        errors : [{ level: 'warning' as const, message: 'unknown attribute' }],
      }),
    });
    const r = await graphvizRender('digraph { a }', 'dot', 'svg', {}, { viz: stubViz });
    expect(r.valid).toBe(true);
    if (r.valid && 'warnings' in r) { expect(r.warnings).toEqual(['unknown attribute']); }
  });

  it('omits the warnings key entirely when there are none', async () => {
    const r = await graphvizRender('digraph { a -> b; }');
    expect(r.valid).toBe(true);
    expect('warnings' in r).toBe(false);
  });

  it('returns a failure result when the viz factory throws', async () => {
    const boom = () => Promise.reject(new Error('wasm failed to load'));
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'svg', {}, { viz: boom });
    expect(r.valid).toBe(false);
    if (!r.valid && 'error' in r) { expect(r.error).toBe('wasm failed to load'); }
  });

});

describe('graphvizRender, raster via an injected rasterizer', () => {

  it('returns image bytes and the matching mime type', async () => {
    const fake: Rasterizer = () => Promise.resolve(new Uint8Array([1, 2, 3]));
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'png', {}, { raster: fake });
    expect(r.valid).toBe(true);
    if (r.valid && 'bytes' in r) {
      expect(r.mimeType).toBe('image/png');
      expect(Array.from(r.bytes)).toEqual([1, 2, 3]);
    }
  });

  it('uses the jpeg mime type for jpeg', async () => {
    const fake: Rasterizer = () => Promise.resolve(new Uint8Array([9]));
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'jpeg', {}, { raster: fake });
    expect(r.valid).toBe(true);
    if (r.valid && 'bytes' in r) { expect(r.mimeType).toBe('image/jpeg'); }
  });

  it('hands the rasterizer the real svg, not the dot source', async () => {
    let seenSvg = '';
    const spy: Rasterizer = (svg) => { seenSvg = svg; return Promise.resolve(new Uint8Array([1])); };
    await graphvizRender('digraph { a -> b; }', 'dot', 'png', {}, { raster: spy });
    expect(seenSvg).toContain('<svg');
  });

  it('forwards only the defined raster options', async () => {
    let seen: Record<string, number> | undefined;
    const spy: Rasterizer = (_svg, _target, opts) => {
      seen = opts;
      return Promise.resolve(new Uint8Array([1]));
    };
    await graphvizRender('digraph { a -> b; }', 'dot', 'png', { width: 640 }, { raster: spy });
    expect(seen).toEqual({ width: 640 });
  });

  it('forwards every defined raster option when all are given', async () => {
    let seen: Record<string, number> | undefined;
    const spy: Rasterizer = (_svg, _target, opts) => {
      seen = opts;
      return Promise.resolve(new Uint8Array([1]));
    };
    await graphvizRender(
      'digraph { a -> b; }', 'dot', 'jpeg',
      { width: 1, height: 2, scale: 3, quality: 4 },
      { raster: spy },
    );
    expect(seen).toEqual({ width: 1, height: 2, scale: 3, quality: 4 });
  });

  it('degrades to svg when the rasterizer reports no backend', async () => {
    const noBackend: Rasterizer = () => Promise.reject(new RasterizationUnsupportedError('nope'));
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'png', {}, { raster: noBackend });
    expect(r.valid).toBe(true);
    if (r.valid && 'note' in r) {
      expect(r.svg).toContain('<svg');
      expect(r.note).toContain('no raster backend');
    }
  });

  it('returns a failure when the rasterizer throws anything else', async () => {
    const boom: Rasterizer = () => Promise.reject(new Error('canvas exploded'));
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'png', {}, { raster: boom });
    expect(r.valid).toBe(false);
    if (!r.valid && 'error' in r) { expect(r.error).toBe('canvas exploded'); }
  });

  it('reports no rasterizer when raster is requested with none injected', async () => {
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'png');
    expect(r.valid).toBe(false);
    if (!r.valid && 'error' in r) { expect(r.error).toBe('no rasterizer configured'); }
  });

  it('never reaches the rasterizer when the dot is invalid', async () => {
    let called = false;
    const spy: Rasterizer = () => { called = true; return Promise.resolve(new Uint8Array()); };
    const r = await graphvizRender('digraph { a -> ', 'dot', 'png', {}, { raster: spy });
    expect(r.valid).toBe(false);
    expect(called).toBe(false);
  });

});

// The brief's suite above exercises every named requirement; these three
// close coverage gaps the project's 100%-on-all-four-metrics gate (enforced
// in vitest.config.ts) surfaced once the suite ran against real code:
// normalize()'s `level ?? 'error'` fallback, messageOf()'s non-Error branch,
// and the raster-path warnings assignment. Each drives real behavior through
// injected collaborators, not output the test generated itself.
describe('graphvizRender, coverage gaps left by the brief suite', () => {

  it('defaults a diagnostic level when viz omits it', async () => {
    const stubViz = () => Promise.resolve({
      render: () => ({
        status : 'failure' as const,
        output : undefined,
        errors : [{ message: 'something went wrong' }],
      }),
    });
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'svg', {}, { viz: stubViz });
    expect(r.valid).toBe(false);
    if (!r.valid && 'errors' in r) {
      expect(r.errors[0]?.level).toBe('error');
      expect(r.errors[0]?.message).toBe('something went wrong');
    }
  });

  it('stringifies a non-Error thrown by the rasterizer', async () => {
    const weird: Rasterizer = () => Promise.reject({ code: 'ENOENT' });
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'png', {}, { raster: weird });
    expect(r.valid).toBe(false);
    if (!r.valid && 'error' in r) { expect(r.error).toBe(JSON.stringify({ code: 'ENOENT' })); }
  });

  it('surfaces warnings alongside raster bytes', async () => {
    const stubViz = () => Promise.resolve({
      render: () => ({
        status : 'success' as const,
        output : '<svg></svg>',
        errors : [{ level: 'warning' as const, message: 'unknown attribute' }],
      }),
    });
    const fake: Rasterizer = () => Promise.resolve(new Uint8Array([1]));
    const r = await graphvizRender('digraph { a }', 'dot', 'png', {}, { viz: stubViz, raster: fake });
    expect(r.valid).toBe(true);
    if (r.valid && 'warnings' in r) { expect(r.warnings).toEqual(['unknown attribute']); }
  });

});
