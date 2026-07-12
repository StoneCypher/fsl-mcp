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
 * Standard error of a Bernoulli-rate estimate: `sqrt(p*(1-p)/n)`. This is the
 * honest spread figure for a rate that is itself a mean of 0/1 outcomes over
 * `n` trials — distinct from (and smaller than) a sample standard deviation,
 * which describes spread of individual draws rather than of the mean.
 *
 * @param p - the observed rate (validity or correctness), between 0 and 1
 * @param n - the number of trials the rate was computed over
 * @returns the standard error, or `0` when `n` is not positive
 *
 * @example
 *   stderr(0.5, 4)  // => 0.25
 */
export function stderr(p: number, n: number): number {
  if (n <= 0) { return 0; }
  return Math.sqrt((p * (1 - p)) / n);
}

/**
 * Aggregate scored trials into a per-condition summary (validity + correctness
 * rates, each with its standard error), in canonical CONDITIONS order, omitting
 * conditions that had no trials.
 *
 * @example
 *   aggregate(trials)
 *   // => [{ condition: 'bare', n: 2, validityRate: 0.5, correctnessRate: 0,
 *   //       validityStderr: 0.354, correctnessStderr: 0 }, ...]
 */
export function aggregate(trials: ScoredTrial[]): ConditionSummary[] {
  const summaries: ConditionSummary[] = [];
  for (const condition of CONDITIONS) {
    const rows = trials.filter(t => t.condition === condition);
    if (rows.length === 0) { continue; }
    const valid          = rows.filter(t => t.valid).length;
    const correct        = rows.filter(t => t.correct).length;
    const validityRate    = valid / rows.length;
    const correctnessRate = correct / rows.length;
    summaries.push({
      condition,
      n                 : rows.length,
      validityRate,
      correctnessRate,
      validityStderr    : stderr(validityRate, rows.length),
      correctnessStderr : stderr(correctnessRate, rows.length),
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
 * Render a human-readable report: a per-condition rate table (each rate
 * annotated with its `±stderr` spread, e.g. `50.0% ±15.8%`) plus the deltas.
 *
 * @example
 *   renderReport(aggregate(trials), computeDeltas(aggregate(trials)))
 */
export function renderReport(summaries: ConditionSummary[], deltas: Delta[]): string {
  const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
  const withSpread = (rate: number, se: number): string => `${pct(rate)} ±${pct(se)}`;
  const lines: string[] = [];
  lines.push('condition           n   validity           correctness');
  for (const s of summaries) {
    lines.push(`${s.condition.padEnd(18)} ${String(s.n).padStart(2)}   ${withSpread(s.validityRate, s.validityStderr).padStart(15)}   ${withSpread(s.correctnessRate, s.correctnessStderr).padStart(15)}`);
  }
  lines.push('');
  lines.push('deltas vs bare:');
  for (const d of deltas) {
    const sign = d.diff >= 0 ? '+' : '';
    lines.push(`  ${d.vs.padEnd(18)} ${d.metric.padEnd(12)} ${sign}${pct(d.diff)}`);
  }
  return lines.join('\n');
}
