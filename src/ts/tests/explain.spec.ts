import { describe, it, expect } from 'vitest';
import { fslExplain } from '../tools/explain.js';

describe('fslExplain', () => {
  it('lists states, transitions, start and terminals for a linear machine', () => {
    const r = fslExplain('a -> b -> c;');
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.states.sort()).toEqual(['a', 'b', 'c']);
    expect(r.transitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'a', to: 'b' }),
      expect.objectContaining({ from: 'b', to: 'c' }),
    ]));
    expect(r.start).toContain('a');
    expect(r.terminals).toContain('c');
    expect(r.summary).toContain('states');
  });

  it('carries the action label on a named-action edge', () => {
    const r = fslExplain("a 'go' -> b;");
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    const edge = r.transitions.find(t => t.from === 'a' && t.to === 'b');
    expect(edge).toEqual(expect.objectContaining({ action: 'go' }));
  });

  it('returns valid=false with diagnostics for invalid FSL', () => {
    const r = fslExplain('a -> ;');
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.diagnostics.some(d => d.severity === 'error')).toBe(true);
  });
});
