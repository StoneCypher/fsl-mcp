import { describe, it, expect } from 'vitest';
import { fslValidate } from '../tools/validate.js';

describe('fslValidate', () => {
  it('reports valid=true and no diagnostics for good FSL', () => {
    const r = fslValidate('a -> b -> c;');
    expect(r.valid).toBe(true);
    expect(r.diagnostics).toEqual([]);
  });

  it('reports valid=false with at least one error diagnostic for bad FSL', () => {
    const r = fslValidate('a -> ;');
    expect(r.valid).toBe(false);
    expect(r.diagnostics.some(d => d.severity === 'error')).toBe(true);
  });
});
