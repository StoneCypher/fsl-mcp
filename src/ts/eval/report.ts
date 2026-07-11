import { CONDITIONS } from './types.js';
import type { ScoredTrial, ConditionSummary, Condition } from './types.js';

/** A pairwise difference in one metric between a condition and the baseline. */
export interface Delta {
  metric : 'validity' | 'correctness';
  vs     : Condition;
  base   : Condition;
  diff   : number;
}

/**
 * Aggregate scored trials into a per-condition summary (validity + correctness
 * rates), in canonical CONDITIONS order, omitting conditions that had no trials.
 *
 * @example
 *   aggregate(trials)  // => [{ condition: 'bare', n: 2, validityRate: 0.5, correctnessRate: 0 }, ...]
 */
export function aggregate(trials: ScoredTrial[]): ConditionSummary[] {
  const summaries: ConditionSummary[] = [];
  for (const condition of CONDITIONS) {
    const rows = trials.filter(t => t.condition === condition);
    if (rows.length === 0) { continue; }
    const valid   = rows.filter(t => t.valid).length;
    const correct = rows.filter(t => t.correct).length;
    summaries.push({
      condition,
      n              : rows.length,
      validityRate   : valid / rows.length,
      correctnessRate: correct / rows.length,
    });
  }
  return summaries;
}

/**
 * Compute deltas of each non-bare condition against `bare`, for both metrics.
 * Returns [] when there is no bare baseline.
 *
 * @example
 *   computeDeltas(aggregate(trials))  // => [{ metric:'validity', vs:'tools', base:'bare', diff:0.5 }, ...]
 */
export function computeDeltas(summaries: ConditionSummary[]): Delta[] {
  const base = summaries.find(s => s.condition === 'bare');
  if (base === undefined) { return []; }
  const deltas: Delta[] = [];
  for (const s of summaries) {
    if (s.condition === 'bare') { continue; }
    deltas.push({ metric: 'validity',    vs: s.condition, base: 'bare', diff: s.validityRate - base.validityRate });
    deltas.push({ metric: 'correctness', vs: s.condition, base: 'bare', diff: s.correctnessRate - base.correctnessRate });
  }
  return deltas;
}

/**
 * Render a human-readable report: a per-condition rate table plus the deltas.
 *
 * @example
 *   renderReport(aggregate(trials), computeDeltas(aggregate(trials)))
 */
export function renderReport(summaries: ConditionSummary[], deltas: Delta[]): string {
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  const lines: string[] = [];
  lines.push('condition           n   validity   correctness');
  for (const s of summaries) {
    lines.push(`${s.condition.padEnd(18)} ${String(s.n).padStart(2)}   ${pct(s.validityRate).padStart(8)}   ${pct(s.correctnessRate).padStart(8)}`);
  }
  lines.push('');
  lines.push('deltas vs bare:');
  for (const d of deltas) {
    const sign = d.diff >= 0 ? '+' : '';
    lines.push(`  ${d.vs.padEnd(18)} ${d.metric.padEnd(12)} ${sign}${pct(d.diff)}`);
  }
  return lines.join('\n');
}
