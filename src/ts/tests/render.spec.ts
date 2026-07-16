import { describe, it, expect } from 'vitest';
import { fslRender, RasterizationUnsupportedError } from '../tools/render.js';

const SRC = 'a -> b;';

describe('fslRender', () => {
  it('renders svg by default (unchanged contract)', async () => {
    const r = await fslRender(SRC);
    expect(r.valid).toBe(true);
    if (r.valid && r.format === 'svg') { expect(r.svg).toContain('<svg'); } else { expect.unreachable(); }
  });

  it('renders dot as text', async () => {
    const r = await fslRender(SRC, 'dot');
    if (r.valid && r.format === 'dot') { expect(r.dot).toContain('digraph'); } else { expect.unreachable(); }
  });

  it('renders a real png with correct magic bytes and mime', async () => {
    const r = await fslRender(SRC, 'png');
    if (r.valid && r.format === 'png' && 'bytes' in r) {
      expect(r.mimeType).toBe('image/png');
      expect(r.bytes[0]).toBe(0x89);
      expect(r.bytes[1]).toBe(0x50);
      expect(r.bytes.length).toBeGreaterThan(100);
    } else { expect.unreachable(); }
  });

  it('honors width for png (IHDR width field)', async () => {
    const r = await fslRender(SRC, 'png', { width: 320 });
    if (r.valid && r.format === 'png' && 'bytes' in r) {
      // PNG IHDR: width is the big-endian uint32 at bytes 16..19
      const w = ((r.bytes[16] ?? 0) << 24) | ((r.bytes[17] ?? 0) << 16) | ((r.bytes[18] ?? 0) << 8) | (r.bytes[19] ?? 0);
      expect(w).toBe(320);
    } else { expect.unreachable(); }
  });

  // NOTE: jssm throws RasterizationUnsupportedError for jpeg in non-Canvas
  // runtimes - resvg-wasm covers png/gif only. So jpeg's byte mapping is
  // tested through the stub engine, and the real engine is held to the
  // degrade contract.
  it('maps jpeg raster results to image/jpeg (stub engine)', async () => {
    const engine = async () => ({ kind: 'raster' as const, buffer: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) });
    const r = await fslRender(SRC, 'jpeg', {}, engine);
    if (r.valid && r.format === 'jpeg' && 'bytes' in r) {
      expect(r.mimeType).toBe('image/jpeg');
      expect(r.bytes[0]).toBe(0xff);
      expect(r.bytes[1]).toBe(0xd8);
    } else { expect.unreachable(); }
  });

  it('jpeg with the real engine never hard-fails: real bytes or svg degrade', async () => {
    const r = await fslRender(SRC, 'jpeg');
    expect(r.valid).toBe(true);
    if (r.valid && 'bytes' in r) {
      expect(r.mimeType).toBe('image/jpeg');
    } else if (r.valid && 'note' in r) {
      expect(r.svg).toContain('<svg');
      expect(r.note).toContain('raster');
    } else { expect.unreachable(); }
  });

  it('renders a real gif (GIF8 header), bounded frames', async () => {
    const r = await fslRender(SRC, 'gif', { maxFrames: 2 });
    if (r.valid && r.format === 'gif' && 'bytes' in r) {
      expect(r.mimeType).toBe('image/gif');
      const head = String.fromCharCode(r.bytes[0] ?? 0, r.bytes[1] ?? 0, r.bytes[2] ?? 0, r.bytes[3] ?? 0);
      expect(head).toBe('GIF8');
    } else { expect.unreachable(); }
  });

  it('short-circuits invalid source with diagnostics for every format', async () => {
    for (const format of ['svg', 'dot', 'png', 'jpeg', 'gif'] as const) {
      const r = await fslRender('a -> ;', format);
      expect(r.valid).toBe(false);
      if (!r.valid && 'diagnostics' in r) { expect(r.diagnostics.length).toBeGreaterThan(0); } else { expect.unreachable(); }
    }
  });

  it('degrades to svg-plus-note when the raster backend is unavailable', async () => {
    let calls = 0;
    const engine = async (fsl: string, opts: Record<string, unknown>) => {
      calls++;
      if (opts.target === 'png') { throw new RasterizationUnsupportedError('no backend'); }
      return { kind: 'text' as const, content: '<svg>stub</svg>' };
    };
    const r = await fslRender(SRC, 'png', {}, engine);
    if (r.valid && 'note' in r) {
      expect(r.format).toBe('png');
      expect(r.svg).toContain('<svg');
      expect(r.note).toContain('raster');
      expect(calls).toBe(2);
    } else { expect.unreachable(); }
  });

  it('returns RenderFailure on any other engine throw', async () => {
    const engine = async () => { throw new Error('viz exploded'); };
    const r = await fslRender(SRC, 'svg', {}, engine);
    if (!r.valid && 'error' in r) { expect(r.error).toContain('viz exploded'); } else { expect.unreachable(); }
  });
});
