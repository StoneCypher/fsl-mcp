import { describe, it, expect } from 'vitest';
import { fslRender } from '../tools/render.js';

describe('fslRender', () => {
  it('renders valid FSL to an <svg> by default', async () => {
    const r = await fslRender('a -> b -> c;');
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.format).toBe('svg');
    expect('svg' in r && r.svg).toContain('<svg');
  });

  it('degrades png to svg-plus-note in v1', async () => {
    const r = await fslRender('a -> b;', 'png');
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.format).toBe('png');
    if (r.format !== 'png') return;
    expect(r.svg).toContain('<svg');
    expect(r.note).toMatch(/not yet supported/i);
  });

  it('returns diagnostics for invalid FSL without attempting to render', async () => {
    const r = await fslRender('a -> ;');
    expect(r.valid).toBe(false);
  });
});
