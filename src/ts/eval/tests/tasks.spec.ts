import { describe, it, expect } from 'vitest';
import { TASKS } from '../tasks.js';
import { scoreValidity, scoreCorrectness } from '../score.js';

describe('TASKS corpus', () => {
  it('has a spread of difficulties and unique ids', () => {
    expect(TASKS.length).toBeGreaterThanOrEqual(8);
    const ids = new Set(TASKS.map(t => t.id));
    expect(ids.size).toBe(TASKS.length);
    for (const d of ['easy', 'medium', 'harder'] as const) {
      expect(TASKS.some(t => t.difficulty === d)).toBe(true);
    }
  });

  it('every task expectation is internally consistent (a reference solution would pass its own checks)', () => {
    // Each task carries a `_reference` FSL that MUST satisfy its own expectations —
    // this proves the expectations are achievable and correctly specified.
    for (const t of TASKS) {
      expect(scoreValidity(t._reference), `${t.id} reference invalid`).toBe(true);
      expect(scoreCorrectness(t._reference, t.expect), `${t.id} reference fails its own checks`).toBe(true);
    }
  });
});
