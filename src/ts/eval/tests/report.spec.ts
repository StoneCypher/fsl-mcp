import { describe, it, expect } from 'vitest';
import { aggregate, computeDeltas, renderReport } from '../report.js';
import type { ScoredTrial, ConditionSummary } from '../types.js';
import type { Delta } from '../report.js';

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
  it('returns empty array when there is no bare baseline', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'tools', n: 5, validityRate: 0.8, correctnessRate: 0.6 },
      { condition: 'reference', n: 5, validityRate: 0.7, correctnessRate: 0.5 },
    ];
    const deltas = computeDeltas(summaries);
    expect(deltas).toEqual([]);
  });
});

describe('renderReport', () => {
  it('formats percentages correctly with one decimal place', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 10, validityRate: 0.5, correctnessRate: 0 },
    ];
    const deltas: Delta[] = [];
    const report = renderReport(summaries, deltas);
    expect(report).toContain('50.0%');
    expect(report).toContain('0.0%');
  });

  it('renders header and data rows for multiple conditions', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 2, validityRate: 0.5, correctnessRate: 0 },
      { condition: 'tools', n: 10, validityRate: 1, correctnessRate: 1 },
    ];
    const deltas: Delta[] = [];
    const report = renderReport(summaries, deltas);
    expect(report).toContain('condition');
    expect(report).toContain('validity');
    expect(report).toContain('correctness');
    expect(report).toContain('bare');
    expect(report).toContain('tools');
  });

  it('renders positive deltas with leading plus sign', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 10, validityRate: 0.5, correctnessRate: 0.5 },
      { condition: 'tools', n: 10, validityRate: 1, correctnessRate: 1 },
    ];
    const deltas: Delta[] = [
      { metric: 'validity', vs: 'tools', base: 'bare', diff: 0.5 },
    ];
    const report = renderReport(summaries, deltas);
    expect(report).toContain('+50.0%');
  });

  it('renders negative deltas with minus sign', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 10, validityRate: 1, correctnessRate: 1 },
      { condition: 'tools', n: 10, validityRate: 0.5, correctnessRate: 0.5 },
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
      { condition: 'bare', n: 5, validityRate: 0.5, correctnessRate: 0.5 },
      { condition: 'tools', n: 5, validityRate: 1, correctnessRate: 1 },
    ];
    const deltas: Delta[] = [
      { metric: 'validity', vs: 'tools', base: 'bare', diff: 0.5 },
    ];
    const report = renderReport(summaries, deltas);
    expect(report).toContain('deltas vs bare:');
  });

  it('aligns single-digit n values correctly with header', () => {
    const summaries: ConditionSummary[] = [
      { condition: 'bare', n: 1, validityRate: 0.5, correctnessRate: 0.5 },
      { condition: 'tools', n: 9, validityRate: 1, correctnessRate: 1 },
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
