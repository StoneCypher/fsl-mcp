# fsl_scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A seventh MCP tool, `fsl_scaffold`, returning complete compiling FSL starting documents for eight presets across five families, with caller names renamed in via role slots.

**Architecture:** Presets are real compiling `.fsl` files in `src/prompts/scaffolds/`; a build-step generator embeds them into a committed constants module keyed by filename. A hand-written registry declares family, role manifests (state / action / stateList kinds with canonical names), and notes per preset. `scaffold.ts` validates roles generically, renames canonical tokens, and analyze-gates the output before returning jsonResult.

**Tech Stack:** TypeScript (strict), zod, vitest, fast-check (stoch), plain-ESM build script.

## Global Constraints

- Spec: `src/superpowers/spec/2026-07-18-fsl-scaffold-design.md` (commits a1f5dd9, 25fc554, dd4a394). Branch `feat_26-07-18_fsl-scaffold` is already checked out - never switch branches.
- The working tree carries ~94 dirty files from an unrelated eval run. NEVER `git add -A` / `git add .`; stage ONLY the files this plan names. Never commit build/, README.md, or eval churn.
- Every preset `.fsl` file must pass `analyze()` raw AND after any valid substitution; never weaken these tests. If a construct fails to compile during authoring, minimally adjust the FSL and record the deviation.
- Generated `src/ts/tools/scaffold-content.ts` is committed; regeneration wired into the `typescript` npm script. Drift test pins bytes to sources.
- Zero new dependencies (fast-check already present). Strict TS: isolatedDeclarations (explicit export types), exactOptionalPropertyTypes (set optional keys conditionally), nodenext `.js` relative imports, no `!`, no redundant `String()` on strings. Test files eslint-ignored.
- Coverage gate 95 on all four metrics stays green.
- base_README.md only (README.md is generated).
- Version bump to 0.5.0 happens in Task 4 (standing user rule: PRs carry a bump; do not bump elsewhere).
- Commits: Conventional Commits; NO Claude-Session trailer; NO "Generated with Claude Code" line.
- Shell discipline for all executors, verbatim: Do not use compound commands, which can't be matched against allow rules, so they prompt - and every prompt halts the session until I respond, stranding all work if I am away. Compound commands are commands joined by &&, ||, ;, a pipe, or a newline - and any other form that bundles multiple commands into one tool call (subshell chaining, wrapper scripts written only to combine commands) is the same violation. Do not search for forms the hook doesn't catch; the rule is one command per call, in letter and in spirit. This rule must be restated verbatim in every subagent dispatch prompt, including reviewers and read-only agents. (package.json script STRINGS may contain `&&`; the rule governs tool calls.) Bash tool only, never PowerShell; never `node -e`; nothing between git/npm and their subcommand.

## File Structure

- `src/prompts/scaffolds/*.fsl` - eight authored presets (Task 1).
- `.gitattributes` - LF pin for scaffolds (Task 1).
- `src/build_js/generate_scaffold_content.js` - directory-scanning embedder (Task 2).
- `src/ts/tools/scaffold-content.ts` - GENERATED, committed (Task 2).
- `src/ts/tools/scaffold-registry.ts` - hand-written registry: families, role manifests, notes (Task 2).
- `src/ts/tools/scaffold.ts` - pure logic: validation, quoting, rename, analyze gate (Task 3).
- `src/ts/tests/scaffold.spec.ts`, `src/ts/tests/scaffold.stoch.ts` (Tasks 2-3).
- `src/ts/server.ts`, `src/ts/e2e/server.spec.ts`, `base_README.md`, `src/prompts/fsl-flowcharts.md`, `package.json` (Task 4).

---

### Task 1: Author the eight presets + LF pin + raw-compile test

**Files:**
- Create: `src/prompts/scaffolds/decision.fsl`, `pipeline.fsl`, `review-loop.fsl`, `flowchart.fsl`, `handshake.fsl`, `job-lifecycle.fsl`, `org-chart.fsl`, `network-topology.fsl`
- Modify: `.gitattributes` (append one line)
- Test: `src/ts/tests/scaffold.spec.ts` (first describe block only)

**Interfaces:**
- Produces: the eight `.fsl` files, filenames = preset ids. Canonical state/action names below are load-bearing - Task 2's registry and Task 3's rename logic reference them exactly.

- [ ] **Step 1: Write the files.** Exact content (LF endings; the `//` teaching comments are part of the deliverable):

`decision.fsl`
```fsl
machine_name: "Decision";
flow: down;

// Labels bind BEFORE the arrow; after the arrow they are silently ignored.
Validate 'ok'  -> Ship;
Validate 'bad' -> Reject;

state Validate: { shape: diamond; };
state Ship:     { shape: doublecircle; background-color: palegreen; };
state Reject:   { shape: doublecircle; background-color: mistyrose; };
```

`pipeline.fsl`
```fsl
machine_name: "Pipeline";
flow: right;

// Happy path rides ->; involuntary failure rides ~>.
Fetch -> Parse -> Save;
Fetch ~> Failed;
Parse ~> Failed;

state Fetch:  { background-color: palegreen; };
state Failed: { background-color: mistyrose; };
```

`review-loop.fsl`
```fsl
machine_name: "Review Loop";
flow: down;

Draft 'submit'   -> Review;
Review 'approve' -> Publish;
Review 'revise'  -> Draft;

state Publish: { shape: doublecircle; background-color: palegreen; };
```

`flowchart.fsl`
```fsl
machine_name: "Expense Approval";
flow: down;

// Full flowchart idiom: terminals, diamonds, forced escalation, rework loop.
Submitted -> Validating;
Validating 'complete'   -> ManagerReview;
Validating 'incomplete' -> Returned;
Returned 'resubmit' -> Submitted;
ManagerReview 'approve' -> Paid;
ManagerReview 'reject'  -> Returned;
ManagerReview ~> Escalated;
Escalated 'resolve' -> ManagerReview;

state Submitted:     { background-color: palegreen; };
state Validating:    { shape: diamond; };
state ManagerReview: { shape: diamond; };
state Paid:          { shape: doublecircle; background-color: palegreen; };
state Returned:      { line-style: dotted; };
state Escalated:     { background-color: mistyrose; };
```

`handshake.fsl`
```fsl
machine_name: "Handshake";
flow: right;

Idle 'connect'          -> Connecting;
Connecting 'acknowledge' -> Established;
Established 'close'      -> Idle;
// A timeout is involuntary: it rides ~>.
Connecting ~> TimedOut;
TimedOut 'connect' -> Connecting;

state Established: { background-color: palegreen; };
state TimedOut:    { background-color: mistyrose; };
```

`job-lifecycle.fsl`
```fsl
machine_name: "Job Lifecycle";
flow: right;

Queued 'start'   -> Running;
Running 'finish' -> Done;
// Jobs do not choose to fail.
Running ~> Failed;
Failed 'retry' -> Retrying;
Retrying -> Running;

state Done:   { shape: doublecircle; background-color: palegreen; };
state Failed: { background-color: mistyrose; };
```

`org-chart.fsl`
```fsl
machine_name: "Org Chart";
flow: down;

// A drawing, not a process: edges are reporting lines. Render it; never simulate it.
CEO -> [VP_Eng VP_Sales];
VP_Eng -> [Eng_One Eng_Two];
VP_Sales -> [Sales_One Sales_Two];

state CEO: { background-color: lightgoldenrodyellow; };
```

`network-topology.fsl`
```fsl
machine_name: "Network";
graph_layout: neato;

// A drawing, not a machine: <-> draws linked pairs.
Hub <-> Switch_A;
Hub <-> Switch_B;
Switch_A <-> Host_One;
Switch_A <-> Host_Two;
Switch_B <-> Host_Three;
// Islands are allowed by default; a self-loop registers an isolated node.
Standby -> Standby;

state Hub:     { shape: hexagon; };
state Standby: { line-style: dashed; };
```

- [ ] **Step 2: LF pin.** Append to `.gitattributes`:
```
src/prompts/scaffolds/*.fsl text eol=lf
```

- [ ] **Step 3: Authoring verification.** Write `build/verify-scaffolds.mjs`:
```js
import { readdirSync, readFileSync } from 'fs';
import { fslDiagnostics } from 'jssm';
const dir = 'src/prompts/scaffolds';
for (const f of readdirSync(dir)) {
  const d = fslDiagnostics(readFileSync(`${dir}/${f}`, 'utf8'));
  console.log(f, JSON.stringify(d.diagnostics ?? d));
}
```
Run: `node build/verify-scaffolds.mjs`
Expected: every file lists no error-severity diagnostics. If any construct fails (candidates: `//` comments, `graph_layout: neato`, self-loop, `<->`), minimally fix that file (e.g. drop the failing directive, convert comment style) and record the deviation. Do NOT commit build/.

- [ ] **Step 4: Failing test.** Create `src/ts/tests/scaffold.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { analyze, hasErrors } from '../analyze.js';

const SCAFFOLD_DIR = 'src/prompts/scaffolds';

describe('scaffold preset sources', () => {
  it('all eight presets exist and compile raw', () => {
    const files = readdirSync(SCAFFOLD_DIR).filter((f) => f.endsWith('.fsl')).sort();
    expect(files).toEqual(['decision.fsl', 'flowchart.fsl', 'handshake.fsl',
      'job-lifecycle.fsl', 'network-topology.fsl', 'org-chart.fsl',
      'pipeline.fsl', 'review-loop.fsl']);
    for (const f of files) {
      const source = readFileSync(`${SCAFFOLD_DIR}/${f}`, 'utf8');
      expect(hasErrors(analyze(source)), f).toBe(false);
    }
  });
});
```

- [ ] **Step 5: Run it.** `npx vitest run src/ts/tests/scaffold.spec.ts` - the compile assertions must PASS (the earlier authoring step proved them; if this run exits 1 only because the global coverage threshold fires on a single-spec run, that is a known artifact - the test itself must show passed).

- [ ] **Step 6: Commit.**
```bash
git add src/prompts/scaffolds .gitattributes src/ts/tests/scaffold.spec.ts
git commit -m "feat(scaffold): eight preset sources across five families with raw-compile test"
```

---

### Task 2: Generator, generated module, registry, drift test

**Files:**
- Create: `src/build_js/generate_scaffold_content.js`, `src/ts/tools/scaffold-registry.ts`
- Create (by running the generator, never by hand): `src/ts/tools/scaffold-content.ts`
- Modify: `package.json` (`scripts.typescript` only)
- Test: `src/ts/tests/scaffold.spec.ts` (append)

**Interfaces:**
- Consumes: Task 1's files and canonical names.
- Produces: `SCAFFOLD_SOURCES: Record<string, string>` from `./scaffold-content.js`; from `./scaffold-registry.js`: `PRESET_IDS: readonly string[]`, `SCAFFOLD_REGISTRY: Record<string, PresetDef>` with
  `type RoleSlot = { role: string; kind: 'state' | 'action'; canonical: string } | { role: string; kind: 'stateList'; canonical: readonly string[] }` and
  `type PresetDef = { family: string; machineName: string; slots: readonly RoleSlot[]; notes: readonly string[] }`.

- [ ] **Step 1: Generator.** Create `src/build_js/generate_scaffold_content.js`:
```js
/**
 * Embeds every src/prompts/scaffolds/*.fsl into src/ts/tools/scaffold-content.ts
 * so presets ship inside the bundle. Scans the directory - adding a preset
 * file requires no generator change. Runs before tsc via the `typescript`
 * npm script.
 *
 * @example
 *   node src/build_js/generate_scaffold_content.js
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';

const DIR = 'src/prompts/scaffolds';
const OUT = 'src/ts/tools/scaffold-content.ts';

const escapeTemplate = (s) =>
  s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const files = readdirSync(DIR).filter((f) => f.endsWith('.fsl')).sort();
const entries = files.map((f) => {
  const id = f.replace(/\.fsl$/, '');
  return `  '${id}': \`${escapeTemplate(readFileSync(`${DIR}/${f}`, 'utf8'))}\`,`;
});

const body = `// GENERATED FILE - DO NOT EDIT.
// Source: ${DIR}/*.fsl
// Regenerate: node src/build_js/generate_scaffold_content.js (runs automatically before tsc)

/** Raw preset FSL sources, keyed by preset id (scaffold filename sans .fsl). */
export const SCAFFOLD_SOURCES: Record<string, string> = {
${entries.join('\n')}
};
`;
writeFileSync(OUT, body);
console.log(`[scaffold] wrote ${OUT} (${String(files.length)} presets)`);
```

- [ ] **Step 2: Run it.** `node src/build_js/generate_scaffold_content.js` - expect `[scaffold] wrote src/ts/tools/scaffold-content.ts (8 presets)`.

- [ ] **Step 3: Wire the build.** In `package.json`, the `typescript` script currently starts with the guide generator; insert the scaffold generator after it, so the value reads:
```json
"typescript": "node src/build_js/generate_guide_content.js && node src/build_js/generate_scaffold_content.js && tsc --build tsconfig.json",
```
(`&&` inside a package.json string is allowed; the one-command rule governs shell tool calls.)

- [ ] **Step 4: Registry.** Create `src/ts/tools/scaffold-registry.ts`:
```ts
/**
 * The scaffold preset registry: which presets exist, their family, their
 * renamable role slots (with canonical names as authored in the .fsl
 * sources), and the teaching notes returned alongside each scaffold.
 * Adding a chart family later = a new .fsl file + one entry here.
 *
 * @see ./scaffold.js for the substitution logic that consumes this.
 */

/** One renamable slot in a preset: a state, an action label, or a fixed-arity state list. */
export type RoleSlot =
  | { role: string; kind: 'state' | 'action'; canonical: string }
  | { role: string; kind: 'stateList'; canonical: readonly string[] };

/** A registry entry: family grouping, canonical machine name, slots, notes. */
export type PresetDef = {
  family: string;
  machineName: string;
  slots: readonly RoleSlot[];
  notes: readonly string[];
};

const NOTE_BEFORE = 'Action labels and decorations bind only BEFORE the arrow; misplacement compiles clean with zero diagnostics.';
const NOTE_FORCED = 'Involuntary flow (failures, timeouts) rides ~>, never ->.';
const NOTE_EDGES  = 'Only edges register states; a state declaration alone styles and never creates.';
const NOTE_DRAWING = 'This preset is a drawing, not a process: simulate is meaningless; render it (fsl_render, format png).';

/** All preset definitions, keyed by preset id. */
export const SCAFFOLD_REGISTRY: Record<string, PresetDef> = {
  'decision': { family: 'flowchart', machineName: 'Decision',
    slots: [ { role: 'decision', kind: 'state', canonical: 'Validate' },
             { role: 'outcomes', kind: 'stateList', canonical: ['Ship', 'Reject'] } ],
    notes: [NOTE_BEFORE, NOTE_EDGES] },
  'pipeline': { family: 'flowchart', machineName: 'Pipeline',
    slots: [ { role: 'stages', kind: 'stateList', canonical: ['Fetch', 'Parse', 'Save'] },
             { role: 'failed', kind: 'state', canonical: 'Failed' } ],
    notes: [NOTE_FORCED, NOTE_BEFORE] },
  'review-loop': { family: 'flowchart', machineName: 'Review Loop',
    slots: [ { role: 'draft', kind: 'state', canonical: 'Draft' },
             { role: 'review', kind: 'state', canonical: 'Review' },
             { role: 'publish', kind: 'state', canonical: 'Publish' },
             { role: 'approve', kind: 'action', canonical: 'approve' },
             { role: 'revise', kind: 'action', canonical: 'revise' } ],
    notes: [NOTE_BEFORE] },
  'flowchart': { family: 'flowchart', machineName: 'Expense Approval',
    slots: [ { role: 'submitted', kind: 'state', canonical: 'Submitted' },
             { role: 'validating', kind: 'state', canonical: 'Validating' },
             { role: 'managerReview', kind: 'state', canonical: 'ManagerReview' },
             { role: 'paid', kind: 'state', canonical: 'Paid' },
             { role: 'returned', kind: 'state', canonical: 'Returned' },
             { role: 'escalated', kind: 'state', canonical: 'Escalated' } ],
    notes: [NOTE_BEFORE, NOTE_FORCED, NOTE_EDGES] },
  'handshake': { family: 'protocol', machineName: 'Handshake',
    slots: [ { role: 'idle', kind: 'state', canonical: 'Idle' },
             { role: 'connecting', kind: 'state', canonical: 'Connecting' },
             { role: 'established', kind: 'state', canonical: 'Established' },
             { role: 'failed', kind: 'state', canonical: 'TimedOut' },
             { role: 'connect', kind: 'action', canonical: 'connect' },
             { role: 'acknowledge', kind: 'action', canonical: 'acknowledge' } ],
    notes: [NOTE_FORCED] },
  'job-lifecycle': { family: 'process', machineName: 'Job Lifecycle',
    slots: [ { role: 'queued', kind: 'state', canonical: 'Queued' },
             { role: 'running', kind: 'state', canonical: 'Running' },
             { role: 'done', kind: 'state', canonical: 'Done' },
             { role: 'failed', kind: 'state', canonical: 'Failed' },
             { role: 'retrying', kind: 'state', canonical: 'Retrying' },
             { role: 'start', kind: 'action', canonical: 'start' },
             { role: 'finish', kind: 'action', canonical: 'finish' },
             { role: 'retry', kind: 'action', canonical: 'retry' } ],
    notes: [NOTE_FORCED, NOTE_BEFORE] },
  'org-chart': { family: 'orgchart', machineName: 'Org Chart',
    slots: [ { role: 'root', kind: 'state', canonical: 'CEO' },
             { role: 'branches', kind: 'stateList', canonical: ['VP_Eng', 'VP_Sales'] },
             { role: 'leaves', kind: 'stateList', canonical: ['Eng_One', 'Eng_Two', 'Sales_One', 'Sales_Two'] } ],
    notes: [NOTE_DRAWING, NOTE_EDGES] },
  'network-topology': { family: 'network', machineName: 'Network',
    slots: [ { role: 'hub', kind: 'state', canonical: 'Hub' },
             { role: 'switches', kind: 'stateList', canonical: ['Switch_A', 'Switch_B'] },
             { role: 'hosts', kind: 'stateList', canonical: ['Host_One', 'Host_Two', 'Host_Three'] },
             { role: 'isolated', kind: 'state', canonical: 'Standby' } ],
    notes: [NOTE_DRAWING, NOTE_EDGES] },
};

/** Preset ids in stable sorted order; the tool's input enum derives from this. */
export const PRESET_IDS: readonly string[] = Object.keys(SCAFFOLD_REGISTRY).sort();
```

- [ ] **Step 5: Append tests** to `src/ts/tests/scaffold.spec.ts`:
```ts
import { SCAFFOLD_SOURCES } from '../tools/scaffold-content.js';
import { SCAFFOLD_REGISTRY, PRESET_IDS } from '../tools/scaffold-registry.js';

describe('scaffold registry and embedding', () => {
  it('generated module matches the authored files exactly (drift guard)', () => {
    const files = readdirSync(SCAFFOLD_DIR).filter((f) => f.endsWith('.fsl')).sort();
    expect(Object.keys(SCAFFOLD_SOURCES).sort()).toEqual(files.map((f) => f.replace(/\.fsl$/, '')));
    for (const f of files) {
      expect(SCAFFOLD_SOURCES[f.replace(/\.fsl$/, '')]).toBe(readFileSync(`${SCAFFOLD_DIR}/${f}`, 'utf8'));
    }
  });

  it('registry covers exactly the embedded presets, and every canonical token appears in its source', () => {
    expect(PRESET_IDS).toEqual(Object.keys(SCAFFOLD_SOURCES).sort());
    for (const id of PRESET_IDS) {
      const def = SCAFFOLD_REGISTRY[id];
      const src = SCAFFOLD_SOURCES[id] ?? '';
      expect(def).toBeDefined();
      if (def === undefined) continue;
      expect(src).toContain(`machine_name: "${def.machineName}"`);
      for (const slot of def.slots) {
        const names = slot.kind === 'stateList' ? slot.canonical : [slot.canonical];
        for (const n of names) {
          expect(src, `${id}:${slot.role}:${n}`).toMatch(
            slot.kind === 'action' ? new RegExp(`'${n}'`) : new RegExp(`\\b${n}\\b`));
        }
      }
    }
  });
});
```

- [ ] **Step 6: Run.** `npx vitest run src/ts/tests/scaffold.spec.ts` - all tests in the file PASS (coverage-threshold exit-1 artifact acceptable). Then `npx tsc --noEmit` clean; `npx eslint src/ts/tools/scaffold-content.ts src/ts/tools/scaffold-registry.ts src/build_js/generate_scaffold_content.js` clean.

- [ ] **Step 7: Commit.**
```bash
git add src/build_js/generate_scaffold_content.js src/ts/tools/scaffold-content.ts src/ts/tools/scaffold-registry.ts src/ts/tests/scaffold.spec.ts package.json
git commit -m "feat(scaffold): directory-scanning embedder, preset registry, drift guard"
```

---

### Task 3: Substitution engine with analyze gate + unit and stochastic tests

**Files:**
- Create: `src/ts/tools/scaffold.ts`
- Test: `src/ts/tests/scaffold.spec.ts` (append), `src/ts/tests/scaffold.stoch.ts` (create)

**Interfaces:**
- Consumes: `SCAFFOLD_SOURCES`, `SCAFFOLD_REGISTRY`, `PRESET_IDS` (Task 2); `analyze`, `hasErrors` from `../analyze.js`.
- Produces: from `./scaffold.js`:
  `type ScaffoldRoles = Record<string, string | readonly string[]>`,
  `type ScaffoldSuccess = { valid: true; preset: string; family: string; source: string; roles: Record<string, string | readonly string[]>; notes: readonly string[] }`,
  `type ScaffoldFailure = { valid: false; errors: readonly string[] }`,
  `type ScaffoldResult = ScaffoldSuccess | ScaffoldFailure`,
  `fslScaffold(preset: string, machineName?: string, roles?: ScaffoldRoles): ScaffoldResult`.

- [ ] **Step 1: Failing tests first.** Append to `scaffold.spec.ts`:
```ts
import { fslScaffold } from '../tools/scaffold.js';

describe('fslScaffold', () => {
  it('returns the canonical source with defaults resolved when no params given', () => {
    const r = fslScaffold('decision');
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.family).toBe('flowchart');
    expect(r.source).toBe(SCAFFOLD_SOURCES['decision']);
    expect(r.roles['decision']).toBe('Validate');
    expect(r.notes.length).toBeGreaterThan(0);
  });

  it('renames states, auto-quoting multi-word names, and output compiles', () => {
    const r = fslScaffold('decision', 'Fraud Check',
      { decision: 'Screen Payment', outcomes: ['Approve', 'Deny'] });
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.source).toContain('machine_name: "Fraud Check";');
    expect(r.source).toContain('"Screen Payment"');
    expect(r.source).toContain('Approve');
    expect(r.source).not.toContain('Validate');
    expect(hasErrors(analyze(r.source))).toBe(false);
  });

  it('renames action labels with apostrophe escaping', () => {
    const r = fslScaffold('review-loop', undefined, { approve: "it's fine" });
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.source).toContain("'it\\'s fine'");
    expect(hasErrors(analyze(r.source))).toBe(false);
  });

  it('rejects wrong list arity, unknown roles, duplicates, and illegal characters', () => {
    expect(fslScaffold('pipeline', undefined, { stages: ['A', 'B'] }).valid).toBe(false);
    expect(fslScaffold('decision', undefined, { nonsense: 'X' }).valid).toBe(false);
    expect(fslScaffold('decision', undefined, { outcomes: ['Same', 'Same'] }).valid).toBe(false);
    expect(fslScaffold('decision', undefined, { decision: 'has"quote' }).valid).toBe(false);
    expect(fslScaffold('decision', undefined, { decision: '' }).valid).toBe(false);
    expect(fslScaffold('no-such-preset').valid).toBe(false);
  });

  it('every preset compiles under a full rename of every slot', () => {
    for (const id of PRESET_IDS) {
      const def = SCAFFOLD_REGISTRY[id];
      if (def === undefined) continue;
      const roles: Record<string, string | string[]> = {};
      def.slots.forEach((slot, i) => {
        roles[slot.role] = slot.kind === 'stateList'
          ? slot.canonical.map((_, j) => `Zz_${String(i)}_${String(j)}`)
          : `Zz_${String(i)}`;
      });
      const r = fslScaffold(id, 'Renamed', roles);
      expect(r.valid, id).toBe(true);
      if (r.valid) expect(hasErrors(analyze(r.source)), id).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run to see them fail.** `npx vitest run src/ts/tests/scaffold.spec.ts` - FAIL: cannot resolve `../tools/scaffold.js`.

- [ ] **Step 3: Implement** `src/ts/tools/scaffold.ts`:
```ts
/**
 * fsl_scaffold's engine: resolves a preset id plus optional machine name and
 * role renames into a complete, analyze-verified FSL document. Substitution
 * is a token-boundary rename of the canonical names authored in the preset
 * sources - it never changes structure, which is why list slots are
 * fixed-arity.
 *
 * @example
 *   const r = fslScaffold('decision', 'Fraud Check', { outcomes: ['Approve', 'Deny'] });
 *   if (r.valid) console.log(r.source);
 *
 * @see ./scaffold-registry.js for the preset catalog
 */
import { analyze, hasErrors } from '../analyze.js';
import { SCAFFOLD_SOURCES } from './scaffold-content.js';
import { SCAFFOLD_REGISTRY } from './scaffold-registry.js';
import type { PresetDef, RoleSlot } from './scaffold-registry.js';

/** Caller-supplied renames, keyed by role name. */
export type ScaffoldRoles = Record<string, string | readonly string[]>;

/** A successful scaffold: substituted source plus the fully-resolved role map. */
export type ScaffoldSuccess = {
  valid: true; preset: string; family: string; source: string;
  roles: Record<string, string | readonly string[]>; notes: readonly string[];
};

/** A rejected scaffold: named validation (or, defensively, compile) errors. */
export type ScaffoldFailure = { valid: false; errors: readonly string[] };

export type ScaffoldResult = ScaffoldSuccess | ScaffoldFailure;

const BARE = /^[A-Za-z][A-Za-z0-9_]*$/;

const isBadName = (s: string): boolean =>
  s.length === 0 || s.includes('\n') || s.includes('\r');

/** Renders a state name as FSL: bare when safe, double-quoted otherwise. */
const stateToken = (name: string): string => (BARE.test(name) ? name : `"${name}"`);

/** Renders an action label body with apostrophes escaped for single quotes. */
const actionBody = (name: string): string => name.replace(/'/g, "\\'");

const replaceAll = (src: string, find: RegExp, repl: string): string => src.replace(find, repl);

/**
 * Builds a scaffold from a preset with optional renames; never throws.
 *
 * @param preset - a preset id from the registry (the tool's enum enforces this at the boundary)
 * @param machineName - replacement for the preset's machine_name (always quoted)
 * @param roles - renames keyed by role; list slots need exactly their canonical count
 */
export function fslScaffold(preset: string, machineName?: string, roles?: ScaffoldRoles): ScaffoldResult {
  const def: PresetDef | undefined = SCAFFOLD_REGISTRY[preset];
  const raw = SCAFFOLD_SOURCES[preset];
  if (def === undefined || raw === undefined) {
    return { valid: false, errors: [`unknown preset: ${preset}`] };
  }

  const errors: string[] = [];
  const known = new Set(def.slots.map((s) => s.role));
  for (const key of Object.keys(roles ?? {})) {
    if (!known.has(key)) errors.push(`unknown role: ${key}`);
  }
  if (machineName !== undefined && (isBadName(machineName) || machineName.includes('"'))) {
    errors.push('machine_name must be non-empty with no quotes or newlines');
  }

  const resolved: Record<string, string | readonly string[]> = {};
  const finalNames: string[] = [];
  for (const slot of def.slots) {
    const given = roles?.[slot.role];
    if (slot.kind === 'stateList') {
      const value = given ?? slot.canonical;
      if (typeof value === 'string' || value.length !== slot.canonical.length) {
        errors.push(`role ${slot.role} needs exactly ${String(slot.canonical.length)} names`);
        continue;
      }
      value.forEach((n) => {
        if (isBadName(n) || n.includes('"')) errors.push(`role ${slot.role}: bad name ${JSON.stringify(n)}`);
      });
      resolved[slot.role] = value;
      finalNames.push(...value);
    } else {
      const value = given ?? slot.canonical;
      if (typeof value !== 'string') { errors.push(`role ${slot.role} takes a single name`); continue; }
      if (isBadName(value) || (slot.kind === 'state' && value.includes('"'))) {
        errors.push(`role ${slot.role}: bad name ${JSON.stringify(value)}`);
        continue;
      }
      resolved[slot.role] = value;
      if (slot.kind === 'state') finalNames.push(value);
    }
  }
  if (new Set(finalNames).size !== finalNames.length) {
    errors.push('resolved state names must be unique');
  }
  if (errors.length > 0) return { valid: false, errors };

  let source = raw;
  if (machineName !== undefined) {
    source = source.replace(`machine_name: "${def.machineName}";`, `machine_name: "${machineName}";`);
  }
  for (const slot of def.slots) {
    const value = resolved[slot.role];
    if (value === undefined) continue;
    if (slot.kind === 'stateList' && typeof value !== 'string') {
      slot.canonical.forEach((from, i) => {
        const to = value[i];
        if (to !== undefined && to !== from) {
          source = replaceAll(source, new RegExp(`\\b${from}\\b`, 'g'), stateToken(to));
        }
      });
    } else if (slot.kind === 'state' && typeof value === 'string' && value !== slot.canonical) {
      source = replaceAll(source, new RegExp(`\\b${slot.canonical}\\b`, 'g'), stateToken(value));
    } else if (slot.kind === 'action' && typeof value === 'string' && value !== slot.canonical) {
      source = replaceAll(source, new RegExp(`'${slot.canonical}'`, 'g'), `'${actionBody(value)}'`);
    }
  }

  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) {
    return { valid: false, errors: ['substituted scaffold failed to compile (tool defect - please report)'] };
  }
  return { valid: true, preset, family: def.family, source, roles: resolved, notes: def.notes };
}
```
Adjust only as strict TS/eslint demand, preserving behavior; a `RoleSlot` import that ends up unused may be dropped.

- [ ] **Step 4: Run unit tests.** `npx vitest run src/ts/tests/scaffold.spec.ts` - all PASS.

- [ ] **Step 5: Stochastic test.** Create `src/ts/tests/scaffold.stoch.ts`:
```ts
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { fslScaffold } from '../tools/scaffold.js';
import { SCAFFOLD_REGISTRY, PRESET_IDS } from '../tools/scaffold-registry.js';
import { analyze, hasErrors } from '../analyze.js';

describe('fslScaffold stochastic', () => {
  it('any printable role names either compile cleanly or are rejected - never a throw, never a broken success', () => {
    fc.assert(fc.property(
      fc.constantFrom(...PRESET_IDS),
      fc.string({ minLength: 0, maxLength: 24 }),
      fc.nat({ max: 999 }),
      (preset, name, seed) => {
        const def = SCAFFOLD_REGISTRY[preset];
        if (def === undefined) return;
        const roles: Record<string, string | string[]> = {};
        for (const [i, slot] of def.slots.entries()) {
          if (i % 3 !== seed % 3) continue;
          roles[slot.role] = slot.kind === 'stateList'
            ? slot.canonical.map((_, j) => `${name}${String(j)}`)
            : name;
        }
        const r = fslScaffold(preset, undefined, roles);
        if (r.valid) expect(hasErrors(analyze(r.source))).toBe(false);
        else expect(r.errors.length).toBeGreaterThan(0);
      }), { numRuns: 200 });
  });
});
```
Run: `npx vitest run --config vitest-stoch.config.ts` - PASS. Shrunk counterexamples mean a real quoting/uniqueness bug: fix `scaffold.ts`, not the test. (Known legitimate rejections: duplicate resolved names when the same `name` fills multiple slots - the property accepts rejection as an outcome.)

- [ ] **Step 6: Static checks.** `npx tsc --noEmit` clean; `npx eslint src/ts/tools/scaffold.ts` clean.

- [ ] **Step 7: Commit.**
```bash
git add src/ts/tools/scaffold.ts src/ts/tests/scaffold.spec.ts src/ts/tests/scaffold.stoch.ts
git commit -m "feat(scaffold): rename engine with analyze gate, unit and stochastic coverage"
```

---

### Task 4: Tool registration, e2e, README, guide pointer, version bump

**Files:**
- Modify: `src/ts/server.ts`, `src/ts/e2e/server.spec.ts`, `base_README.md`, `src/prompts/fsl-flowcharts.md`, `package.json` (version only)
- Regenerate: `src/ts/tools/guide-content.ts` (via guide generator, after the md edit), `README.md` + build artifacts (via `npm run build`)

**Interfaces:**
- Consumes: `fslScaffold`, types (Task 3); `PRESET_IDS`, `SCAFFOLD_REGISTRY` (Task 2).

- [ ] **Step 1: Register the tool.** In `src/ts/server.ts` add imports:
```ts
import { fslScaffold } from './tools/scaffold.js';
import { PRESET_IDS, SCAFFOLD_REGISTRY } from './tools/scaffold-registry.js';
```
and after the fsl_guide registration, matching the authoring tools' jsonResult style exactly (use the same result-wrapping helper the sibling registrations use; the zod enum derives from the registry):
```ts
  server.registerTool('fsl_scaffold',
    { description: `Returns a complete, compiling FSL starting document for a preset chart shape, with your names substituted in. Presets by family: ${PRESET_IDS.map((p) => { const d = SCAFFOLD_REGISTRY[p]; return d === undefined ? p : `${p} (${d.family})`; }).join(', ')}. Pass roles to rename states/actions; list roles need their exact canonical count. See fsl_guide topic "flowcharts" for the idioms.`,
      inputSchema: {
        preset: z.enum(PRESET_IDS as [string, ...string[]]),
        machine_name: z.string().optional(),
        roles: z.record(z.union([z.string(), z.array(z.string())])).optional(),
      } },
    async ({ preset, machine_name, roles }) => jsonResult(fslScaffold(preset, machine_name, roles)));
```
If the sibling tools inline `{ content: [{ type: 'text' as const, text: JSON.stringify(...) }] }` instead of a `jsonResult` helper, mirror that form verbatim. Update the `createServer` DocBlock's tool count to seven.

- [ ] **Step 2: e2e.** Append inside the existing describe of `src/ts/e2e/server.spec.ts`, following its client/callTool pattern:
```ts
  it('scaffolds a renamed decision preset through fsl_scaffold', async () => {
    const result = await client.callTool({ name: 'fsl_scaffold',
      arguments: { preset: 'decision', machine_name: 'Fraud Check', roles: { outcomes: ['Approve', 'Deny'] } } });
    const content = result.content as { type: string; text?: string }[];
    const text = content.find((c) => c.type === 'text');
    expect(text?.text).toBeDefined();
    const parsed = JSON.parse(text?.text ?? '{}') as { valid: boolean; family: string; source: string };
    expect(parsed.valid).toBe(true);
    expect(parsed.family).toBe('flowchart');
    expect(parsed.source).toContain('Approve');
  });
```
Update every tool-count assertion in the e2e/unit suites from six to seven (grep for `6` near tool-list assertions and for the guide-era phrase "six tools").

- [ ] **Step 3: Docs.** In `base_README.md`: add the tool-table row `fsl_scaffold - complete compiling starter FSL from presets (8 presets, 5 families) with your names substituted`; add a section near the other per-tool sections:
```markdown
### fsl_scaffold

Returns a complete, compiling FSL starting document - pick a preset, pass
your names, get source ready for fsl_validate / fsl_render.

- Eight presets across five families: flowchart, pipeline, decision,
  review-loop (flowchart); handshake (protocol); job-lifecycle (process);
  org-chart (orgchart); network-topology (network).
- Role slots rename states and action labels; multi-word names are quoted
  automatically. List slots are fixed-arity - a scaffold is a starting
  point, and adding a stage is a one-line edit.
- Every result is analyze-verified before it is returned; diagram-family
  presets (org-chart, network-topology) say so when simulation is
  meaningless.
```
Update the intro's "six tools" phrasing to seven (six authoring/guide + scaffold - match the existing sentence shape). In `src/prompts/fsl-flowcharts.md`, add one line at the end of the intro paragraph: `The fsl_scaffold tool returns ready-to-edit starting documents for these idioms.` Then regenerate: `node src/build_js/generate_guide_content.js`.

- [ ] **Step 4: Version bump.** In `package.json` set `"version": "0.5.0"` (from 0.4.0). Then run `npm run build` and stage ONLY the build-owned files it changes that are tracked (expected: README.md and any committed build artifacts the repo already tracks - check `git status --porcelain` and stage the regenerated tracked files ONLY; never the eval churn already dirty before your run - `git stash list`-style caution does not apply, just compare against the pre-existing dirty set you observed at start).

- [ ] **Step 5: Full gate.** `npx vitest run --coverage` all green, >= 95 on all four metrics; `npx vitest run --config vitest-stoch.config.ts` green; `npx tsc --noEmit` clean; `npx eslint src/ts/server.ts` clean.

- [ ] **Step 6: Contributor brief.** In `CLAUDE.md`, update the tool inventory sentence (six -> seven, mention fsl_scaffold takes no FSL source but analyze-gates its OUTPUT).

- [ ] **Step 7: Commit.**
```bash
git add src/ts/server.ts src/ts/e2e/server.spec.ts base_README.md src/prompts/fsl-flowcharts.md src/ts/tools/guide-content.ts CLAUDE.md package.json README.md
git commit -m "feat(server): fsl_scaffold tool - eight presets, five families; v0.5.0"
```
If `npm run build` regenerated other tracked artifact files (e.g. dist manifests the repo commits), add them explicitly by name in the same commit.
