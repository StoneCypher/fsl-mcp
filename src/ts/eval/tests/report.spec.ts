import { describe, it, expect } from 'vitest';
import { aggregate, computeDeltas } from '../report.js';
import type { ScoredTrial } from '../types.js';

const trials: ScoredTrial[] = [
  { task: 't1', difficulty: 'easy', condition: 'bare',  valid: true,  correct: false },
  { task: 't1', difficulty: 'easy', condition: 'bare',  valid: false, correct: false },
  { task: 't1', difficulty: 'easy', condition: 'tools', valid: true,  correct: true },
  { task: 't1', difficulty: 'easy', condition: 'tools', valid: true,  correct: true },
];

describe('aggregate', () => {
  it('computes per-condition validity and correctness rates', () => {
    const s = aggregate(trials);
    const bare = s.find(x => x.condition === 'bare')!;
    const tools = s.find(x => x.condition === 'tools')!;
    expect(bare.n).toBe(2);
    expect(bare.validityRate).toBeCloseTo(0.5);
    expect(bare.correctnessRate).toBeCloseTo(0);
    expect(tools.validityRate).toBeCloseTo(1);
    expect(tools.correctnessRate).toBeCloseTo(1);
  });
  it('omits conditions with no trials', () => {
    expect(aggregate(trials).some(s => s.condition === 'reference')).toBe(false);
  });
});

describe('computeDeltas', () => {
  it('reports tools-minus-bare for both metrics', () => {
    const d = computeDeltas(aggregate(trials));
    const corr = d.find(x => x.metric === 'correctness' && x.vs === 'tools' && x.base === 'bare')!;
    expect(corr.diff).toBeCloseTo(1);
  });
});
