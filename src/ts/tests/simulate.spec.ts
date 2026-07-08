import { describe, it, expect } from 'vitest';
import { fslSimulate } from '../tools/simulate.js';

describe('fslSimulate', () => {
  it('walks target-state transitions and reports the path and end state', () => {
    const r = fslSimulate('a -> b -> c;', ['b', 'c']);
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.path).toEqual(['a', 'b', 'c']);
    expect(r.endState).toBe('c');
    expect(r.rejected).toBeUndefined();
  });

  it('records a rejection at the first illegal move and stops', () => {
    const r = fslSimulate('a -> b -> c;', ['c']); // cannot jump a->c directly
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.rejected).toEqual({ action: 'c', index: 0 });
    expect(r.endState).toBe('a');
  });

  it('returns diagnostics for invalid FSL', () => {
    const r = fslSimulate('a -> ;', ['b']);
    expect(r.valid).toBe(false);
  });
});
