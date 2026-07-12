import { describe, it, expect } from 'vitest';
import { aggregate, computeDeltas, renderReport, stderr } from '../report.js';
import type { ScoredTrial, ConditionSummary } from '../types.js';
import type { Delta } from '../report.js';

const trials: ScoredTrial[] = [
  { task: 't1', difficulty: 'easy', condition: 'bare',  valid: true,  correct: false },
  { task: 't1', difficulty: 'easy', condition: 'bare',  valid: false, correct: false },
  { task: 't1', difficulty: 'easy', condition: 'tools', valid: true,  correct: true },
  { task: 't1', difficulty: 'easy', condition: 'tools', valid: true,  correct: true },
];

describe('stderr', () => {
  // All expected values below are hand-derived from sqrt(p*(1-p)/n), not
  // taken from running the implementation.
  it('computes the standard error of a 50% rate over 4 trials', () => {
    // sqrt(0.5*0.5/4) = sqrt(0.0625) = 0.25 exactly
    expect(stderr(0.5, 4)).toBeCloseTo(0.25, 10);
  });
  it('computes the standard error of a 50% rate over 1 trial', () => {
    // sqrt(0.5*0.5/1) = sqrt(0.25) = 0.5 exactly
    expect(stderr(0.5, 1)).toBeCloseTo(0.5, 10);
  });
  it('is zero when the rate is 0 (no variance possible)', () => {
    expect(stderr(0, 7)).toBe(0);
  });
  it('is zero when the rate is 1 (no variance possible)', () => {
    expect(stderr(1, 10)).toBe(0);
  });
  it('is zero when n is not positive, guarding against division by zero', () => {
    expect(stderr(0.5, 0)).toBe(0);
  });
});

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
  it('computes per-condition standard errors alongside the rates', () => {
    const s = aggregate(trials);
    const bare = s.find(x => x.condition === 'bare')!;
    const tools = s.find(x => x.condition === 'tools')!;
    // bare: validityRate 0.5 over n=2 -> sqrt(0.25/2) = sqrt(0.125) = sqrt(2)/4 = 0.35355339...
    expect(bare.validityStderr).toBeCloseTo(0.35355339, 7);
    // bare: correctnessRate 0 over n=2 -> 0 (no variance at a 0 rate)
    expect(bare.correctnessStderr).toBe(0);
    // tools: both rates are 1 over n=2 -> 0 (no variance at a 1 rate)
    expect(tools.validityStderr).toBe(0);
    expect(tools.correctnessStderr).toBe(0);
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
  it('returns empty array when there is no bare baseline', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'tools', n: 5, validityRate: 0.8, correctnessRate: 0.6, validityStderr: 0.178885438, correctnessStderr: 0.219089023 },
      { condition: 'reference', n: 5, validityRate: 0.7, correctnessRate: 0.5, validityStderr: 0.204939015, correctnessStderr: 0.223606798 },
    ];
    const deltas = computeDeltas(summaries);
    expect(deltas).toEqual([]);
  });
});

describe('renderReport', () => {
  it('formats percentages correctly with one decimal place', () => {
    const summaries: ConditionSummary[] = [
      // n=10, validityRate=0.5 -> stderr = sqrt(0.25/10) = sqrt(0.025) = 5/sqrt(1000) = 0.15811388...
      { condition: 'bare', n: 10, validityRate: 0.5, correctnessRate: 0, validityStderr: 0.15811388, correctnessStderr: 0 },
    ];
    const deltas: Delta[] = [];
    const report = renderReport(summaries, deltas);
    expect(report).toContain('50.0% ±15.8%');
    expect(report).toContain('0.0% ±0.0%');
  });

  it('renders header and data rows for multiple conditions', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 2, validityRate: 0.5, correctnessRate: 0, validityStderr: 0.35355339, correctnessStderr: 0 },
      { condition: 'tools', n: 10, validityRate: 1, correctnessRate: 1, validityStderr: 0, correctnessStderr: 0 },
    ];
    const deltas: Delta[] = [];
    const report = renderReport(summaries, deltas);
    expect(report).toContain('condition');
    expect(report).toContain('validity');
    expect(report).toContain('correctness');
    expect(report).toContain('bare');
    expect(report).toContain('tools');
  });

  it('renders each rate with its ±stderr spread', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 2, validityRate: 0.5, correctnessRate: 0, validityStderr: 0.35355339, correctnessStderr: 0 },
    ];
    const deltas: Delta[] = [];
    const report = renderReport(summaries, deltas);
    expect(report).toContain('50.0% ±35.4%');
    expect(report).toContain('0.0% ±0.0%');
  });

  it('renders positive deltas with leading plus sign', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 10, validityRate: 0.5, correctnessRate: 0.5, validityStderr: 0.15811388, correctnessStderr: 0.15811388 },
      { condition: 'tools', n: 10, validityRate: 1, correctnessRate: 1, validityStderr: 0, correctnessStderr: 0 },
    ];
    const deltas: Delta[] = [
      { metric: 'validity', vs: 'tools', base: 'bare', diff: 0.5 },
    ];
    const report = renderReport(summaries, deltas);
    expect(report).toContain('+50.0%');
  });

  it('renders negative deltas with minus sign', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 10, validityRate: 1, correctnessRate: 1, validityStderr: 0, correctnessStderr: 0 },
      { condition: 'tools', n: 10, validityRate: 0.5, correctnessRate: 0.5, validityStderr: 0.15811388, correctnessStderr: 0.15811388 },
    ];
    const deltas: Delta[] = [
      { metric: 'validity', vs: 'tools', base: 'bare', diff: -0.5 },
    ];
    const report = renderReport(summaries, deltas);
    expect(report).toContain('-50.0%');
    expect(report).not.toContain('--');
  });

  it('renders deltas section header', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 5, validityRate: 0.5, correctnessRate: 0.5, validityStderr: 0.22360680, correctnessStderr: 0.22360680 },
      { condition: 'tools', n: 5, validityRate: 1, correctnessRate: 1, validityStderr: 0, correctnessStderr: 0 },
    ];
    const deltas: Delta[] = [
      { metric: 'validity', vs: 'tools', base: 'bare', diff: 0.5 },
    ];
    const report = renderReport(summaries, deltas);
    expect(report).toContain('deltas vs bare:');
  });

  it('aligns single-digit n values correctly with header', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 1, validityRate: 0.5, correctnessRate: 0.5, validityStderr: 0.5, correctnessStderr: 0.5 },
      { condition: 'tools', n: 9, validityRate: 1, correctnessRate: 1, validityStderr: 0, correctnessStderr: 0 },
    ];
    const deltas: Delta[] = [];
    const report = renderReport(summaries, deltas);
    const lines = report.split('\n');
    const headerLine = lines[0];
    const bareDataLine = lines[1];
    const toolsDataLine = lines[2];

    // Find the column position of 'n' label in header by finding "n   v" pattern
    // (the standalone 'n' followed by spacing before 'validity')
    const nLabelMatch = headerLine.match(/\bn\s+v/);
    expect(nLabelMatch).toBeTruthy();
    const nHeaderPos = headerLine.indexOf(nLabelMatch![0]);

    // Find the position of single-digit n values (the actual digits)
    // For "bare" with n=1, it should be right-padded in a 2-char field
    // For "tools" with n=9, same thing
    const bareMatch = bareDataLine.match(/\s+1\s+/);
    const toolsMatch = toolsDataLine.match(/\s+9\s+/);
    expect(bareMatch).toBeTruthy();
    expect(toolsMatch).toBeTruthy();
    const bareNDigitPos = bareDataLine.indexOf(bareMatch![0]) + bareMatch![0].lastIndexOf('1');
    const toolsNDigitPos = toolsDataLine.indexOf(toolsMatch![0]) + toolsMatch![0].lastIndexOf('9');

    // The header 'n' should align exactly with the data column n values
    expect(Math.abs(nHeaderPos - bareNDigitPos)).toBe(0);
    expect(Math.abs(nHeaderPos - toolsNDigitPos)).toBe(0);
  });
});
