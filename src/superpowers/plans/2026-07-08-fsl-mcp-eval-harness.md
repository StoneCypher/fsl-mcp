# fsl-mcp eval harness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A subscription-based, repeatable regression harness that measures whether fsl-mcp (and a shipped FSL reference) improves an agent's FSL authoring versus authoring blind — scored by jssm as the ground-truth oracle.

**Architecture:** A CLI (`npm run eval`) runs each `(task × condition × trial)` by shelling out to Claude Code headless mode (`claude -p --output-format json`) on the user's subscription — no API key. Four conditions (bare / reference / tools / reference+tools) isolate the value of the MCP tools and of a version-locked FSL reference primer. The model's fenced ```` ```fsl ```` output is extracted and scored (validity via `fslDiagnostics`; correctness via the already-built `fslExplain`/`fslSimulate`). Results aggregate to a per-condition rate with deltas.

**Tech Stack:** TypeScript (strict, same config as the main project), `jssm` (scoring oracle, via the existing `analyze`/tool functions), Node `child_process` (spawn `claude`), vitest, `jiti` (run the CLI as TS).

## Global Constraints

- **Location:** all code under `src/ts/eval/`; tests under `src/ts/eval/tests/`. This reuses the main tsconfig (`include: ["./src/ts/**/*.ts"]`), eslint, vitest, and coverage. Do NOT create a top-level `src/eval/`.
- **Must not ship in dist:** rollup only bundles `index.ts` and `bin.ts`; do NOT export anything from `src/ts/eval/` via `src/ts/index.ts`.
- **No API:** the harness authenticates only through the user's Claude Code login via `claude -p`. Never read `ANTHROPIC_API_KEY`, never call the Anthropic SDK.
- **Strict TS:** `isolatedDeclarations` (explicit return types on every export), `exactOptionalPropertyTypes` (set optional keys conditionally, never `= undefined`), `noUncheckedIndexedAccess`. nodenext → `.js` extensions on relative imports.
- **Strict eslint** (`strictTypeChecked` + `stylisticTypeChecked`): no `!` non-null assertions; no redundant `String()` on already-string values; wrap numbers in `String()` only inside template literals. Test files are eslint-ignored.
- **DocBlock** with a one-line-summary first line on every exported entity.
- **Coverage:** the 80% gate (`coverage.thresholds`) applies. Add `'src/ts/eval/eval.ts'` (the CLI orchestrator, which shells to `claude`) to the coverage `exclude` in `vitest.config.ts`, alongside `src/ts/bin.ts`. Every other eval unit must be real-tested to clear the gate.
- **No fake tests.** Scoring tests assert against independently-known FSL semantics, not values the code produced.
- **Commits:** Conventional Commits. No `Claude-Session` trailer and no "Generated with Claude Code" line (user has attribution disabled).

## File Structure

- `src/ts/eval/types.ts` — shared types: `Difficulty`, `Walk`, `Expect`, `Task`, `Condition`, `Invocation`, `TrialResult`, `ScoredTrial`, `ConditionSummary`. One responsibility: the vocabulary every eval unit speaks.
- `src/ts/eval/tasks.ts` — `TASKS: Task[]`, the curated corpus.
- `src/ts/eval/score.ts` — `extractFsl`, `scoreValidity`, `scoreCorrectness`. Pure; the scoring oracle.
- `src/ts/eval/reference.ts` — `captureReference`: get the version-locked FSL primer from jssm's `fsl-export-system-prompt` (injectable spawn; skip-safe).
- `src/ts/eval/conditions.ts` — `CONDITIONS`, `buildInvocation`, `mcpConfigJson`. Pure invocation builder.
- `src/ts/eval/runner.ts` — `runTrial`: spawn `claude -p`, parse the JSON envelope, extract FSL (injectable spawn).
- `src/ts/eval/report.ts` — `aggregate`, `computeDeltas`, `renderReport`.
- `src/ts/eval/eval.ts` — CLI entry; orchestrates tasks × conditions × trials. (Coverage-excluded.)

---

## Task 1: Shared types

Define the vocabulary the whole harness uses. No runtime logic beyond the types + the `CONDITIONS` constant.

**Files:**
- Create: `src/ts/eval/types.ts`
- Test: `src/ts/eval/tests/types.spec.ts`

**Interfaces:**
- Produces:
  - `type Difficulty = 'easy' | 'medium' | 'harder'`
  - `interface Walk { actions: string[]; endState: string; rejectedAt?: number }`
  - `interface Expect { states?: string[]; transitions?: [string, string][]; start?: string[]; terminals?: string[]; walks?: Walk[] }`
  - `interface Task { id: string; difficulty: Difficulty; prompt: string; expect: Expect }`
  - `type Condition = 'bare' | 'reference' | 'tools' | 'reference+tools'`
  - `const CONDITIONS: readonly Condition[]`
  - `interface Invocation { args: string[]; prompt: string }`
  - `interface TrialResult { fsl: string | null; error?: string }`
  - `interface ScoredTrial { task: string; difficulty: Difficulty; condition: Condition; valid: boolean; correct: boolean }`
  - `interface ConditionSummary { condition: Condition; n: number; validityRate: number; correctnessRate: number }`

- [ ] **Step 1: Write the failing test**

Create `src/ts/eval/tests/types.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CONDITIONS } from '../types.js';

describe('eval types', () => {
  it('CONDITIONS lists the four conditions', () => {
    expect([...CONDITIONS]).toEqual(['bare', 'reference', 'tools', 'reference+tools']);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/eval/tests/types.spec.ts`
Expected: FAIL — `../types.js` does not exist.

- [ ] **Step 3: Implement**

Create `src/ts/eval/types.ts`:

```ts
/** Task difficulty tier; the tool/reference value is expected to grow with difficulty. */
export type Difficulty = 'easy' | 'medium' | 'harder';

/** A behavioral expectation: applying `actions` in order must end on `endState`;
 *  if `rejectedAt` is set, the move at that index must be rejected (walk stops there). */
export interface Walk {
  actions    : string[];
  endState   : string;
  rejectedAt?: number;
}

/** Machine-checkable expectations for a task's produced FSL. All present checks must pass. */
export interface Expect {
  states?      : string[];
  transitions? : [string, string][];
  start?       : string[];
  terminals?   : string[];
  walks?       : Walk[];
}

/** One eval task: a natural-language spec plus how to check the result. */
export interface Task {
  id         : string;
  difficulty : Difficulty;
  prompt     : string;
  expect     : Expect;
}

/** The four experimental conditions. */
export type Condition = 'bare' | 'reference' | 'tools' | 'reference+tools';

/** The conditions evaluated, in report order. */
export const CONDITIONS: readonly Condition[] = ['bare', 'reference', 'tools', 'reference+tools'];

/** A fully-built `claude -p` invocation: CLI args plus the prompt fed on stdin. */
export interface Invocation {
  args   : string[];
  prompt : string;
}

/** The outcome of one trial's model call: the extracted FSL, or null with an error note. */
export interface TrialResult {
  fsl    : string | null;
  error? : string;
}

/** One scored trial. */
export interface ScoredTrial {
  task       : string;
  difficulty : Difficulty;
  condition  : Condition;
  valid      : boolean;
  correct    : boolean;
}

/** Aggregate rates for one condition across all its trials. */
export interface ConditionSummary {
  condition       : Condition;
  n               : number;
  validityRate    : number;
  correctnessRate : number;
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/eval/tests/types.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/eval/types.ts src/ts/eval/tests/types.spec.ts
git commit -m "feat(eval): shared types for the eval harness"
```

---

## Task 2: Scoring core

The oracle: extract FSL from model output, check validity, check correctness against a task's expectations. Pure, heavily tested. Reuses the project's `analyze`/`hasErrors` and the already-built `fslExplain`/`fslSimulate` tools.

**Files:**
- Create: `src/ts/eval/score.ts`
- Test: `src/ts/eval/tests/score.spec.ts`

**Interfaces:**
- Consumes: `analyze`, `hasErrors` from `../../analyze.js`; `fslExplain` from `../../tools/explain.js`; `fslSimulate` from `../../tools/simulate.js`; `Expect` from `./types.js` (note: score.ts is in `src/ts/eval/`, so the path to `analyze.ts` is `../../analyze.js` and to types is `./types.js`).
- Produces:
  - `function extractFsl(text: string): string | null`
  - `function scoreValidity(source: string): boolean`
  - `function scoreCorrectness(source: string, expect: Expect): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/ts/eval/tests/score.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractFsl, scoreValidity, scoreCorrectness } from '../score.js';

describe('extractFsl', () => {
  it('pulls the fenced fsl block out of surrounding prose', () => {
    const text = 'Here is the machine:\n\n```fsl\na -> b -> c;\n```\n\nDone.';
    expect(extractFsl(text)).toBe('a -> b -> c;');
  });
  it('returns null when there is no fsl block', () => {
    expect(extractFsl('no code here')).toBeNull();
  });
  it('accepts a bare ``` fence with no language tag as a fallback', () => {
    expect(extractFsl('```\na -> b;\n```')).toBe('a -> b;');
  });
});

describe('scoreValidity', () => {
  it('is true for valid FSL', () => {
    expect(scoreValidity('a -> b -> c;')).toBe(true);
  });
  it('is false for invalid FSL', () => {
    expect(scoreValidity('a -> ;')).toBe(false);
  });
});

describe('scoreCorrectness', () => {
  it('passes when states and transitions are present', () => {
    expect(scoreCorrectness('a -> b -> c;', {
      states: ['a', 'b', 'c'],
      transitions: [['a', 'b'], ['b', 'c']],
    })).toBe(true);
  });
  it('fails when an expected transition is missing', () => {
    expect(scoreCorrectness('a -> b;', { transitions: [['a', 'c']] })).toBe(false);
  });
  it('checks start and terminal states', () => {
    expect(scoreCorrectness('a -> b -> c;', { start: ['a'], terminals: ['c'] })).toBe(true);
    expect(scoreCorrectness('a -> b -> c;', { terminals: ['a'] })).toBe(false);
  });
  it('checks a behavioral walk end state', () => {
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['b', 'c'], endState: 'c' }] })).toBe(true);
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['b'], endState: 'c' }] })).toBe(false);
  });
  it('checks a walk that must be rejected at an index', () => {
    // 'c' is not reachable from a in one step, so the move at index 0 is rejected
    expect(scoreCorrectness('a -> b -> c;', { walks: [{ actions: ['c'], endState: 'a', rejectedAt: 0 }] })).toBe(true);
  });
  it('an empty expectation set passes for any valid machine', () => {
    expect(scoreCorrectness('a -> b;', {})).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/eval/tests/score.spec.ts`
Expected: FAIL — `../score.js` missing.

- [ ] **Step 3: Implement**

Create `src/ts/eval/score.ts`:

```ts
import { analyze, hasErrors } from '../../analyze.js';
import { fslExplain }         from '../../tools/explain.js';
import { fslSimulate }        from '../../tools/simulate.js';
import type { Expect }        from './types.js';

/**
 * Extract the FSL source from a model's response. Prefers a fenced ```fsl block;
 * falls back to a bare ``` fence. Returns null when no fenced block is present.
 *
 * @param text - the model's full text response
 * @returns the FSL inside the first matching fence, trimmed, or null
 *
 * @example
 *   extractFsl('```fsl\na -> b;\n```')  // => 'a -> b;'
 */
export function extractFsl(text: string): string | null {
  const fenced = /```fsl\s*\n([\s\S]*?)```/i.exec(text) ?? /```\s*\n([\s\S]*?)```/.exec(text);
  if (fenced === null) { return null; }
  const body = fenced[1];
  if (body === undefined) { return null; }
  const trimmed = body.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Whether the FSL source compiles clean (no error-severity diagnostics).
 *
 * @example
 *   scoreValidity('a -> b;')  // => true
 */
export function scoreValidity(source: string): boolean {
  return !hasErrors(analyze(source));
}

/**
 * Whether the FSL source satisfies every present expectation in `expect`.
 * Only meaningful for valid source; an invalid machine returns false. An empty
 * `expect` passes for any valid machine.
 *
 * @param source - the FSL source (assumed already validity-checked by the caller)
 * @param expect - the machine-checkable expectations for this task
 * @returns true iff all present checks (states/transitions/start/terminals/walks) pass
 *
 * @example
 *   scoreCorrectness('a -> b;', { states: ['a','b'], transitions: [['a','b']] })  // => true
 */
export function scoreCorrectness(source: string, expect: Expect): boolean {
  const explained = fslExplain(source);
  if (!explained.valid) { return false; }

  if (expect.states !== undefined) {
    const have = new Set(explained.states);
    if (!expect.states.every(s => have.has(s))) { return false; }
  }

  if (expect.transitions !== undefined) {
    const edges = new Set(explained.transitions.map(t => `${t.from} ${t.to}`));
    if (!expect.transitions.every(([from, to]) => edges.has(`${from} ${to}`))) { return false; }
  }

  if (expect.start !== undefined) {
    const starts = new Set(explained.start);
    if (!expect.start.every(s => starts.has(s))) { return false; }
  }

  if (expect.terminals !== undefined) {
    const terms = new Set(explained.terminals);
    if (!expect.terminals.every(s => terms.has(s))) { return false; }
  }

  if (expect.walks !== undefined) {
    for (const walk of expect.walks) {
      const sim = fslSimulate(source, walk.actions);
      if (!sim.valid) { return false; }
      if (sim.endState !== walk.endState) { return false; }
      if (walk.rejectedAt !== undefined) {
        if (sim.rejected === undefined || sim.rejected.index !== walk.rejectedAt) { return false; }
      } else if (sim.rejected !== undefined) {
        return false;
      }
    }
  }

  return true;
}
```

> Note on the walk semantics: `fslSimulate` is synchronous and returns `{ valid, endState, path, legalNext, rejected? }`. A walk with no `rejectedAt` must complete with no rejection; a walk with `rejectedAt` must have `rejected.index === rejectedAt`.

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/eval/tests/score.spec.ts`
Expected: PASS. If a `scoreCorrectness` case disagrees with jssm's actual behavior for a fixture, fix the FIXTURE/expectation to match real jssm semantics — do not weaken the scorer.

- [ ] **Step 5: Commit**

```bash
git add src/ts/eval/score.ts src/ts/eval/tests/score.spec.ts
git commit -m "feat(eval): jssm-backed scoring (extract, validity, correctness)"
```

---

## Task 3: Reference primer capture

Capture the version-locked FSL primer from jssm's `fsl-export-system-prompt` CLI, so the `reference*` conditions teach the model the *installed* language, not stale training knowledge. Skip-safe if the CLI is unavailable.

**Files:**
- Create: `src/ts/eval/reference.ts`
- Test: `src/ts/eval/tests/reference.spec.ts`

**Interfaces:**
- Produces:
  - `type PrimerSpawn = (cmd: string, args: string[]) => { stdout: string; status: number }`
  - `function captureReference(spawn?: PrimerSpawn): string | null` — returns the primer text, or null if unavailable.

- [ ] **Step 1: Write the failing test**

Create `src/ts/eval/tests/reference.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { captureReference } from '../reference.js';

describe('captureReference', () => {
  it('returns the primer text when the CLI succeeds', () => {
    const fakeSpawn = () => ({ stdout: 'FSL v5 primer text', status: 0 });
    expect(captureReference(fakeSpawn)).toBe('FSL v5 primer text');
  });
  it('returns null when the CLI fails', () => {
    const fakeSpawn = () => ({ stdout: '', status: 1 });
    expect(captureReference(fakeSpawn)).toBeNull();
  });
  it('returns null when the CLI throws (not installed)', () => {
    const fakeSpawn = () => { throw new Error('ENOENT'); };
    expect(captureReference(fakeSpawn)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/eval/tests/reference.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/ts/eval/reference.ts`:

```ts
import { spawnSync } from 'node:child_process';

/** A synchronous spawn returning captured stdout and an exit status. Injectable for tests. */
export type PrimerSpawn = (cmd: string, args: string[]) => { stdout: string; status: number };

/** Default spawn: run the installed jssm `fsl-export-system-prompt` CLI via npx. */
function defaultSpawn(cmd: string, args: string[]): { stdout: string; status: number } {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  return { stdout: r.stdout ?? '', status: r.status ?? 1 };
}

/**
 * Capture the version-locked FSL language primer from jssm's
 * `fsl-export-system-prompt` CLI. Returns the primer text, or null if the CLI
 * is unavailable or fails — callers skip the reference conditions on null.
 *
 * @param spawn - injectable synchronous spawn (defaults to a real npx call)
 * @returns the primer text, or null when unavailable
 *
 * @example
 *   const primer = captureReference();
 *   if (primer === null) { /* skip reference conditions *\/ }
 */
export function captureReference(spawn: PrimerSpawn = defaultSpawn): string | null {
  try {
    const { stdout, status } = spawn('npx', ['fsl-export-system-prompt']);
    if (status !== 0) { return null; }
    const text = stdout.trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/eval/tests/reference.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/eval/reference.ts src/ts/eval/tests/reference.spec.ts
git commit -m "feat(eval): capture version-locked FSL reference primer"
```

---

## Task 4: Condition → invocation builder

Turn a `(task, condition, model, primer)` into a concrete `claude -p` invocation: args + the prompt fed on stdin. Pure. Also produces the MCP-config JSON for the tools conditions.

**Files:**
- Create: `src/ts/eval/conditions.ts`
- Test: `src/ts/eval/tests/conditions.spec.ts`

**Interfaces:**
- Consumes: `Task`, `Condition`, `Invocation` from `./types.js`.
- Produces:
  - `const PROMPT_PREAMBLE: string`
  - `function mcpConfigJson(binPath: string): string` — the `--mcp-config` file contents wiring the fsl-mcp server.
  - `function buildInvocation(task: Task, condition: Condition, opts: { model: string; primer: string; mcpConfigPath: string }): Invocation`

- [ ] **Step 1: Write the failing tests**

Create `src/ts/eval/tests/conditions.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildInvocation, mcpConfigJson, PROMPT_PREAMBLE } from '../conditions.js';
import type { Task } from '../types.js';

const task: Task = { id: 't1', difficulty: 'easy', prompt: 'Make a light switch.', expect: {} };
const opts = { model: 'claude-opus-4-8', primer: 'PRIMER TEXT', mcpConfigPath: '/tmp/fsl.json' };

describe('buildInvocation', () => {
  it('always sets --output-format json, --model, and --strict-mcp-config', () => {
    const inv = buildInvocation(task, 'bare', opts);
    expect(inv.args).toEqual(expect.arrayContaining(['-p', '--output-format', 'json', '--model', 'claude-opus-4-8', '--strict-mcp-config']));
  });
  it('bare: no --mcp-config, no primer in the prompt', () => {
    const inv = buildInvocation(task, 'bare', opts);
    expect(inv.args).not.toContain('--mcp-config');
    expect(inv.prompt).not.toContain('PRIMER TEXT');
    expect(inv.prompt).toContain('Make a light switch.');
    expect(inv.prompt).toContain(PROMPT_PREAMBLE);
  });
  it('reference: primer present, no --mcp-config', () => {
    const inv = buildInvocation(task, 'reference', opts);
    expect(inv.prompt).toContain('PRIMER TEXT');
    expect(inv.args).not.toContain('--mcp-config');
  });
  it('tools: --mcp-config present, no primer', () => {
    const inv = buildInvocation(task, 'tools', opts);
    expect(inv.args).toContain('--mcp-config');
    expect(inv.args).toContain('/tmp/fsl.json');
    expect(inv.prompt).not.toContain('PRIMER TEXT');
  });
  it('reference+tools: both primer and --mcp-config', () => {
    const inv = buildInvocation(task, 'reference+tools', opts);
    expect(inv.prompt).toContain('PRIMER TEXT');
    expect(inv.args).toContain('--mcp-config');
  });
});

describe('mcpConfigJson', () => {
  it('wires the fsl server at the given bin path', () => {
    const cfg = JSON.parse(mcpConfigJson('/repo/dist/bin.mjs'));
    expect(cfg.mcpServers.fsl.command).toBe('node');
    expect(cfg.mcpServers.fsl.args).toEqual(['/repo/dist/bin.mjs']);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/eval/tests/conditions.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/ts/eval/conditions.ts`:

```ts
import type { Task, Condition, Invocation } from './types.js';

/** Instruction appended to every task prompt: emit exactly one fenced fsl block. */
export const PROMPT_PREAMBLE: string =
  'You are authoring an FSL (finite state language) machine. Output your final machine as a single fenced code block tagged fsl, like:\n' +
  '```fsl\na -> b;\n```\n' +
  'Output only that one fsl block as your machine; no other code blocks.';

/**
 * The `--mcp-config` file contents wiring the fsl-mcp stdio server at `binPath`.
 *
 * @example
 *   mcpConfigJson('/repo/dist/bin.mjs')
 *   // => '{"mcpServers":{"fsl":{"command":"node","args":["/repo/dist/bin.mjs"]}}}'
 */
export function mcpConfigJson(binPath: string): string {
  return JSON.stringify({ mcpServers: { fsl: { command: 'node', args: [binPath] } } });
}

/**
 * Build the `claude -p` invocation (args + stdin prompt) for one task under one
 * condition. Reference conditions prepend the primer; tools conditions add
 * `--mcp-config` and auto-allow the fsl_* tools. `--strict-mcp-config` is always
 * set so the user's own MCP servers never leak into a condition.
 *
 * @param task - the task being authored
 * @param condition - which of the four conditions
 * @param opts - the model id, the reference primer text, and the temp mcp-config path
 * @returns the argv (excluding the `claude` program itself) and the stdin prompt
 *
 * @example
 *   buildInvocation(task, 'tools', { model: 'claude-opus-4-8', primer, mcpConfigPath })
 */
export function buildInvocation(
  task: Task,
  condition: Condition,
  opts: { model: string; primer: string; mcpConfigPath: string },
): Invocation {
  const usesReference = condition === 'reference' || condition === 'reference+tools';
  const usesTools     = condition === 'tools'     || condition === 'reference+tools';

  const args: string[] = ['-p', '--output-format', 'json', '--model', opts.model, '--strict-mcp-config'];

  if (usesTools) {
    args.push('--mcp-config', opts.mcpConfigPath);
    // Auto-allow the server's tools so the run never blocks on a permission prompt.
    args.push('--allowedTools', 'mcp__fsl__fsl_validate,mcp__fsl__fsl_render,mcp__fsl__fsl_explain,mcp__fsl__fsl_simulate,mcp__fsl__fsl_lint');
  }

  const prompt = usesReference
    ? `${opts.primer}\n\n---\n\n${PROMPT_PREAMBLE}\n\n${task.prompt}`
    : `${PROMPT_PREAMBLE}\n\n${task.prompt}`;

  return { args, prompt };
}
```

> **Verify at implementation:** confirm the installed `claude` CLI honors `--allowedTools` with the `mcp__<server>__<tool>` naming and `--strict-mcp-config`/`--mcp-config`. Run `claude --help` and adjust the exact flags if the CLI differs; the acceptance gate is Task 7's live smoke run. If tools still prompt, fall back to `--permission-mode bypassPermissions`.

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/eval/tests/conditions.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/eval/conditions.ts src/ts/eval/tests/conditions.spec.ts
git commit -m "feat(eval): condition -> claude -p invocation builder"
```

---

## Task 5: Trial runner

Spawn one `claude -p` call, parse the JSON envelope, extract the FSL. Spawn is injectable so tests never shell out.

**Files:**
- Create: `src/ts/eval/runner.ts`
- Test: `src/ts/eval/tests/runner.spec.ts`

**Interfaces:**
- Consumes: `extractFsl` from `./score.js`; `Invocation`, `TrialResult` from `./types.js`.
- Produces:
  - `type ClaudeSpawn = (args: string[], stdin: string) => Promise<{ stdout: string; code: number }>`
  - `function runTrial(inv: Invocation, spawn?: ClaudeSpawn): Promise<TrialResult>`

- [ ] **Step 1: Write the failing tests**

Create `src/ts/eval/tests/runner.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runTrial } from '../runner.js';
import type { Invocation } from '../types.js';

const inv: Invocation = { args: ['-p', '--output-format', 'json'], prompt: 'make a machine' };

function fakeSpawn(stdout: string, code = 0) {
  return async () => ({ stdout, code });
}

describe('runTrial', () => {
  it('extracts fsl from the claude json result field', async () => {
    const envelope = JSON.stringify({ type: 'result', is_error: false, result: 'sure:\n```fsl\na -> b;\n```' });
    const r = await runTrial(inv, fakeSpawn(envelope));
    expect(r.fsl).toBe('a -> b;');
    expect(r.error).toBeUndefined();
  });
  it('reports an error and null fsl when the envelope has is_error', async () => {
    const envelope = JSON.stringify({ type: 'result', is_error: true, result: 'boom' });
    const r = await runTrial(inv, fakeSpawn(envelope));
    expect(r.fsl).toBeNull();
    expect(r.error).toBeTruthy();
  });
  it('reports an error when claude exits nonzero', async () => {
    const r = await runTrial(inv, fakeSpawn('', 1));
    expect(r.fsl).toBeNull();
    expect(r.error).toBeTruthy();
  });
  it('reports an error when the output is not JSON', async () => {
    const r = await runTrial(inv, fakeSpawn('not json'));
    expect(r.fsl).toBeNull();
    expect(r.error).toBeTruthy();
  });
  it('reports null fsl (no error) when the result has no fsl block', async () => {
    const envelope = JSON.stringify({ type: 'result', is_error: false, result: 'no code' });
    const r = await runTrial(inv, fakeSpawn(envelope));
    expect(r.fsl).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/eval/tests/runner.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/ts/eval/runner.ts`:

```ts
import { spawn as nodeSpawn } from 'node:child_process';
import { extractFsl }         from './score.js';
import type { Invocation, TrialResult } from './types.js';

/** Async spawn of the `claude` CLI: pass argv + stdin, get stdout + exit code. Injectable for tests. */
export type ClaudeSpawn = (args: string[], stdin: string) => Promise<{ stdout: string; code: number }>;

/** Default spawn: run the real `claude` CLI, feeding the prompt on stdin. */
function defaultSpawn(args: string[], stdin: string): Promise<{ stdout: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = nodeSpawn('claude', args, { stdio: ['pipe', 'pipe', 'inherit'] });
    let stdout = '';
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.on('error', reject);
    child.on('close', code => { resolve({ stdout, code: code ?? 1 }); });
    child.stdin.end(stdin);
  });
}

/**
 * Run one trial: spawn `claude -p`, parse the JSON envelope, extract the FSL.
 * Never throws — failures surface as `{ fsl: null, error }` so the sweep continues.
 *
 * @param inv - the built invocation (args + stdin prompt)
 * @param spawn - injectable spawn (defaults to the real `claude` CLI)
 * @returns the extracted FSL (or null) and an error note on failure
 *
 * @example
 *   await runTrial({ args: ['-p','--output-format','json'], prompt: '...' })
 */
export async function runTrial(inv: Invocation, spawn: ClaudeSpawn = defaultSpawn): Promise<TrialResult> {
  let stdout: string;
  let code: number;
  try {
    ({ stdout, code } = await spawn(inv.args, inv.prompt));
  } catch (err) {
    return { fsl: null, error: `spawn failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (code !== 0) { return { fsl: null, error: `claude exited ${code}` }; }

  let envelope: { is_error?: boolean; result?: unknown };
  try {
    envelope = JSON.parse(stdout) as { is_error?: boolean; result?: unknown };
  } catch {
    return { fsl: null, error: 'claude output was not JSON' };
  }

  if (envelope.is_error === true) { return { fsl: null, error: 'claude reported is_error' }; }

  const result = typeof envelope.result === 'string' ? envelope.result : '';
  return { fsl: extractFsl(result) };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/eval/tests/runner.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/eval/runner.ts src/ts/eval/tests/runner.spec.ts
git commit -m "feat(eval): claude -p trial runner (injectable spawn)"
```

---

## Task 6: Aggregation & report

Turn scored trials into per-condition rates + deltas, and render a table.

**Files:**
- Create: `src/ts/eval/report.ts`
- Test: `src/ts/eval/tests/report.spec.ts`

**Interfaces:**
- Consumes: `ScoredTrial`, `ConditionSummary`, `Condition`, `CONDITIONS` from `./types.js`.
- Produces:
  - `function aggregate(trials: ScoredTrial[]): ConditionSummary[]`
  - `interface Delta { metric: 'validity' | 'correctness'; vs: Condition; base: Condition; diff: number }`
  - `function computeDeltas(summaries: ConditionSummary[]): Delta[]`
  - `function renderReport(summaries: ConditionSummary[], deltas: Delta[]): string`

- [ ] **Step 1: Write the failing tests**

Create `src/ts/eval/tests/report.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/eval/tests/report.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/ts/eval/report.ts`:

```ts
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
  lines.push('condition          n   validity   correctness');
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
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/eval/tests/report.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/eval/report.ts src/ts/eval/tests/report.spec.ts
git commit -m "feat(eval): aggregation, deltas, and report rendering"
```

---

## Task 7: Task corpus, CLI orchestrator, and wiring

The curated task set, the CLI that ties everything together, the `npm run eval` script, and the coverage exclusion. Ends with a real (small) smoke run to prove it works end-to-end on the subscription.

**Files:**
- Create: `src/ts/eval/tasks.ts`
- Create: `src/ts/eval/eval.ts`
- Modify: `package.json` (add `eval` script)
- Modify: `vitest.config.ts` (coverage exclude `src/ts/eval/eval.ts`)
- Test: `src/ts/eval/tests/tasks.spec.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: `const TASKS: Task[]`; a runnable CLI.

- [ ] **Step 1: Write the failing corpus test**

Create `src/ts/eval/tests/tasks.spec.ts`:

```ts
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
```

> This test is the guard against a broken corpus: every task ships a private `_reference` machine that must pass the task's own checks. If you can't write a reference that passes, the expectations are wrong — fix them, not the test.

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/eval/tests/tasks.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the corpus**

Create `src/ts/eval/tasks.ts`. Extend `Task` locally with a `_reference` field (the known-good solution used only by the corpus test, never sent to the model). Author ~10 tasks across the gradient; each `_reference` must pass `scoreValidity` + `scoreCorrectness` against its own `expect`. Example shape (author the full set, verifying each `_reference` against real jssm as you go):

```ts
import type { Task } from './types.js';

/** A task plus a private known-good solution used only to self-check the corpus. */
export interface CorpusTask extends Task {
  _reference: string;
}

export const TASKS: CorpusTask[] = [
  {
    id: 'light-switch',
    difficulty: 'easy',
    prompt: 'Author an FSL machine for a light switch with two states, on and off, that can toggle either direction.',
    expect: { states: ['on', 'off'], transitions: [['on', 'off'], ['off', 'on']] },
    _reference: 'on -> off; off -> on;',
  },
  {
    id: 'linear-pipeline',
    difficulty: 'easy',
    prompt: 'Author an FSL machine with three states a, b, c in a one-way pipeline a to b to c.',
    expect: { states: ['a', 'b', 'c'], transitions: [['a', 'b'], ['b', 'c']], start: ['a'], terminals: ['c'] },
    _reference: 'a -> b -> c;',
  },
  // ... author the remaining tasks (traffic light with a walk check; a named-action
  //     machine whose walk uses the action label; a checkout flow with a rejected
  //     illegal move; a forced-edge machine; a structure-only machine; etc.)
  //     Each MUST ship a _reference that passes its own expect. Verify with:
  //       node -e "import('...').then(...)"  or by running the corpus test.
];
```

- [ ] **Step 4: Run the corpus test to green**

Run: `npx vitest run src/ts/eval/tests/tasks.spec.ts`
Expected: PASS once every task's `_reference` satisfies its `expect`. Iterate on the expectations/references (against real jssm) until green. Do NOT relax the test.

- [ ] **Step 5: Implement the CLI orchestrator**

Create `src/ts/eval/eval.ts`. It: parses flags (`--model` default `claude-opus-4-8`; `--trials` default 3; `--tasks` optional count; `--conditions` optional CSV); captures the reference primer once; writes a temp mcp-config pointing at `dist/bin.mjs`; loops `tasks × conditions × trials` calling `runTrial` then scoring; skips `reference*` conditions if the primer is null (with a warning); aggregates; prints `renderReport`; writes a JSON results file.

```ts
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
    if (a !== undefined && a.startsWith('--')) {
      const val = argv[i + 1];
      if (val !== undefined) { flags.set(a.slice(2), val); i++; }
    }
  }
  return flags;
}

async function main(): Promise<void> {
  const flags   = parseFlags(process.argv.slice(2));
  const model   = flags.get('model') ?? 'claude-opus-4-8';
  const trials  = Number(flags.get('trials') ?? '3');
  const taskCap = flags.has('tasks') ? Number(flags.get('tasks')) : TASKS.length;
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
        console.error(`[eval] ${task.id} ${condition} trial ${t + 1}/${trials}: valid=${valid} correct=${correct}${res.error !== undefined ? ` (${res.error})` : ''}`);
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
```

- [ ] **Step 6: Wire package.json and coverage**

In `package.json` scripts add:

```json
"eval": "jiti src/ts/eval/eval.ts",
```

In `vitest.config.ts`, add `'src/ts/eval/eval.ts'` to the coverage `exclude` array (the CLI orchestrator shells to `claude` and can't be unit-covered; every other eval unit is tested).

Add `eval-results.json` to `.gitignore` (a run artifact, not source).

- [ ] **Step 7: Verify unit suite + coverage gate**

Run: `npx vitest run --coverage`
Expected: PASS with the gate green. If an eval unit drags coverage below 80%, add targeted tests (not filler) or confirm `eval.ts` is excluded.

- [ ] **Step 8: Confirm the claude CLI flags, then a real smoke run**

Verify the CLI contract before a full run:
Run: `claude --help`
Confirm `-p`, `--output-format json`, `--model`, `--mcp-config`, `--strict-mcp-config`, and `--allowedTools` (or the current equivalent) exist; adjust `conditions.ts` if the flags differ.

Then a minimal live run (needs the built server — run `npm run rollup` first if `dist/bin.mjs` is stale):
Run: `npm run eval -- --trials 1 --tasks 2 --conditions bare,tools`
Expected: it completes, prints a report table, and writes `eval-results.json`. This is the end-to-end acceptance gate: it proves `claude -p` runs on the subscription, the fsl-mcp server wires in under the `tools` condition, and scoring works. Capture the printed table in the task report.

- [ ] **Step 9: Commit**

```bash
git add src/ts/eval/tasks.ts src/ts/eval/eval.ts src/ts/eval/tests/tasks.spec.ts package.json vitest.config.ts .gitignore
git commit -m "feat(eval): task corpus, CLI orchestrator, and npm run eval"
```

---

## Self-Review

**Spec coverage:**
- Subscription-only via `claude -p`, no API (spec "no API access"): Task 4 builds the invocation, Task 5 spawns it, Task 7 runs it live. No SDK/key anywhere. ✓
- 4-way conditions (spec): `CONDITIONS` (T1), `buildInvocation` (T4). ✓
- `--strict-mcp-config` clean isolation + real server via `--mcp-config dist/bin.mjs` (spec): T4 + T7. ✓
- jssm scoring — validity + structural + behavioral (spec): T2, reusing `analyze`/`fslExplain`/`fslSimulate`. ✓
- Reference primer from `fsl-export-system-prompt`, skip-safe (spec): T3 + the skip logic in T7's orchestrator. ✓
- Configurable model (default opus), tasks, trials (spec): T7 flag parsing. ✓
- Report: rates + deltas + JSON (spec): T6 + T7. ✓
- Not in CI; opt-in `npm run eval` (spec): T7 script; no workflow change. ✓
- Variance handling via N trials (spec): T7 trials loop, default 3. ✓
- Error handling — bad trial never aborts the sweep (spec): `runTrial` never throws (T5); orchestrator records and continues (T7). ✓
- Layout under `src/ts/eval/`, `eval.ts` coverage-excluded (constraints): T7 Step 6. ✓
- Testing: pure units real-tested; spawn injected; corpus self-checks via `_reference` (spec): every task's tests. ✓

**Placeholder scan:** the only deliberately-open item is the exact `claude` permission/allowlist flag, pinned to a concrete default (`--allowedTools mcp__fsl__*`) with a `claude --help` verification step and a live acceptance gate (T7 Step 8) — not left as "TBD". The corpus (T7 Step 3) ships two complete tasks and an explicit, test-enforced rule (`_reference` must pass) for authoring the rest.

**Type consistency:** `Task`/`Expect`/`Condition`/`Invocation`/`TrialResult`/`ScoredTrial`/`ConditionSummary` defined once in `types.ts` (T1) and consumed unchanged everywhere. `extractFsl`/`scoreValidity`/`scoreCorrectness` (T2) match their call sites in runner (T5) and orchestrator (T7). `buildInvocation` opts `{model, primer, mcpConfigPath}` (T4) match the orchestrator's call (T7). `CorpusTask extends Task` adds only the test-only `_reference`; the model is never given it.
