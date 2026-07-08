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

  it('walks a named action label via m.action(), not just target-state transitions', () => {
    // Fixture has no bare "a -> b;" edge — 'go' only works as an action label.
    // If simulate.ts ever regressed to `m.transition(a) || m.action(a)`, this
    // fixture would fail outright: 'go' is not a state name, so the walk would
    // reject at index 0 instead of reaching b.
    const r = fslSimulate("a 'go' -> b;", ['go']);
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.path).toEqual(['a', 'b']);
    expect(r.endState).toBe('b');
    expect(r.rejected).toBeUndefined();
  });

  it('prefers the action label over a same-named target state (action-first precedence)', () => {
    // 'x' is legal two ways from state a: as the action label on `a 'x' -> b;`,
    // and as a bare target-state name via `a -> x;`. jssm resolves each token
    // independently: m.action('x') succeeds and moves to b; m.transition('x')
    // also succeeds (on its own) and moves to x. Because simulate.ts tries
    // m.action(a) first, the walk must land on b. If the operands of the `||`
    // were ever swapped to `m.transition(a) || m.action(a)`, this assertion
    // would fail with endState 'x' instead of 'b' — this is what actually
    // pins down the operand order, not just that *a* branch fires.
    const r = fslSimulate("a 'x' -> b; a -> x;", ['x']);
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.path).toEqual(['a', 'b']);
    expect(r.endState).toBe('b');
    expect(r.rejected).toBeUndefined();
  });
});
