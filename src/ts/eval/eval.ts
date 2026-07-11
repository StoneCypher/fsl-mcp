import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir }                      from 'node:os';
import { join }                        from 'node:path';
import { fileURLToPath }               from 'node:url';
import { CONDITIONS }                  from './types.js';
import type { Condition, ScoredTrial } from './types.js';
import { TASKS }                       from './tasks.js';
import { captureReference }            from './reference.js';
import { buildInvocation, mcpConfigJson } from './conditions.js';
import { runTrial }                    from './runner.js';
import { scoreValidity, scoreCorrectness } from './score.js';
import { aggregate, computeDeltas, renderReport } from './report.js';

/** Parse a `--flag value` style arg list into a lookup. */
function parseFlags(argv: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a?.startsWith('--') === true) {
      const val = argv[i + 1];
      if (val !== undefined) { flags.set(a.slice(2), val); i++; }
    }
  }
  return flags;
}

/**
 * Read a `--flag` as a finite positive integer, or `fallback` when the flag is
 * absent. Guards against a mistyped value (e.g. `--trials abc`) silently
 * becoming `NaN` and cascading into a zero/infinite trial sweep: prints a
 * clear message to stderr and exits(1) instead.
 *
 * @param flags - the parsed flag lookup
 * @param name - the flag name, without the leading `--`
 * @param fallback - the value to use when the flag was not supplied
 * @returns the flag's positive-integer value, or `fallback`
 */
function parsePositiveIntFlag(flags: Map<string, string>, name: string, fallback: number): number {
  const raw = flags.get(name);
  if (raw === undefined) { return fallback; }
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    console.error(`[eval] --${name} must be a positive integer, got ${JSON.stringify(raw)}`);
    process.exit(1);
  }
  return n;
}

/**
 * CLI entry point for the fsl-mcp eval harness. Parses `--model` / `--trials` /
 * `--tasks` / `--conditions` flags, captures the FSL reference primer once,
 * writes a temp `--mcp-config` pointing at the built `dist/bin.mjs` server,
 * then runs every `task x condition x trial` combination through `claude -p`,
 * scores each result, prints an aggregate report, and writes `eval-results.json`.
 * Never throws on an individual trial failure — a bad trial is recorded and the
 * sweep continues; only a fatal setup error (e.g. no `claude` on PATH) aborts.
 *
 * @example
 *   // npm run eval -- --trials 1 --tasks 2 --conditions bare,tools
 */
async function main(): Promise<void> {
  const flags   = parseFlags(process.argv.slice(2));
  const model   = flags.get('model') ?? 'claude-opus-4-8';
  const trials  = parsePositiveIntFlag(flags, 'trials', 3);
  const taskCap = parsePositiveIntFlag(flags, 'tasks', TASKS.length);
  const tasks   = TASKS.slice(0, taskCap);

  const primer = captureReference();
  let conditions: Condition[] = flags.has('conditions')
    ? (flags.get('conditions') ?? '').split(',').filter((c): c is Condition => (CONDITIONS as readonly string[]).includes(c))
    : [...CONDITIONS];
  if (primer === null) {
    conditions = conditions.filter(c => c === 'bare' || c === 'tools');
    console.warn('[eval] FSL reference primer unavailable (fsl-export-system-prompt) — skipping reference conditions.');
  }

  const repoRoot   = join(fileURLToPath(import.meta.url), '..', '..', '..', '..');
  const binPath    = join(repoRoot, 'dist', 'bin.mjs');
  const tmp        = mkdtempSync(join(tmpdir(), 'fsl-eval-'));
  const mcpCfgPath = join(tmp, 'fsl.mcp.json');
  writeFileSync(mcpCfgPath, mcpConfigJson(binPath), 'utf8');

  const scored: ScoredTrial[] = [];
  for (const task of tasks) {
    for (const condition of conditions) {
      for (let t = 0; t < trials; t++) {
        const inv = buildInvocation(task, condition, { model, primer: primer ?? '', mcpConfigPath: mcpCfgPath });
        const res = await runTrial(inv);
        const valid   = res.fsl !== null && scoreValidity(res.fsl);
        const correct = valid && res.fsl !== null && scoreCorrectness(res.fsl, task.expect);
        scored.push({ task: task.id, difficulty: task.difficulty, condition, valid, correct });
        console.error(`[eval] ${task.id} ${condition} trial ${String(t + 1)}/${String(trials)}: valid=${String(valid)} correct=${String(correct)}${res.error !== undefined ? ` (${res.error})` : ''}`);
      }
    }
  }

  const summaries = aggregate(scored);
  const deltas    = computeDeltas(summaries);
  console.log('\n' + renderReport(summaries, deltas) + '\n');

  const outPath = join(repoRoot, 'eval-results.json');
  writeFileSync(outPath, JSON.stringify({ model, trials, summaries, deltas, scored }, null, 2), 'utf8');
  console.log(`[eval] wrote ${outPath}`);
}

main().catch((err: unknown) => { console.error(err); process.exit(1); });
