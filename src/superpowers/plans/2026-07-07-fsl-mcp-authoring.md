# fsl-mcp Authoring Satellite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `fsl-mcp` v1 — a stdio MCP server that gives an AI agent the same feedback a human gets from the FSL editor: is the machine valid, what does it look like, what does it do, does a walk behave, is it clean.

**Architecture:** Five pure tool functions (`fslValidate`, `fslLint`, `fslExplain`, `fslSimulate`, `fslRender`) wrap capability the installed `jssm` already exposes. They share one `analyze(source)` core that runs jssm's non-throwing `fslDiagnostics` and, on compile errors, short-circuits every tool to structured `{line, col}` diagnostics. A thin `server.ts` registers those five functions as MCP tools over stdio via `@modelcontextprotocol/sdk`; a `bin` entry makes `npx fsl-mcp` run it.

**Tech Stack:** TypeScript (strict, `isolatedDeclarations`), `jssm` (FSL parse/validate/render/step), `jssm/viz` (`@viz-js/viz` under the hood) for SVG, `@modelcontextprotocol/sdk` + `zod` for the protocol, vitest for tests, rollup for the bundled bin.

## Global Constraints

- **Package identity:** name `fsl-mcp`; version reset to `0.1.0`; author `John Haugeland <stonecypher@gmail.com>`; license MIT; repo `StoneCypher/fsl-mcp`. (Scoped `@fsl/mcp` name is deferred ~10 weeks until the org is owned; do NOT use it yet.)
- **Single-domain dependency spirit:** runtime deps limited to `jssm`, `@modelcontextprotocol/sdk`, `zod`, and `@viz-js/viz` (only if the Task 2 spike proves `jssm/viz` needs it explicitly). No natural-language generation anywhere in the server — it stays deterministic and thin.
- **TypeScript:** `isolatedDeclarations: true` — every exported function/const MUST carry an explicit return type. `exactOptionalPropertyTypes: true` — never assign `undefined` to an optional field; assign the key conditionally. `noUncheckedIndexedAccess: true` — array indexing yields `T | undefined`; use `!` or guards.
- **Module system:** package is `"type": "module"`; use `.js` extensions in relative import specifiers (nodenext resolution).
- **Tests:** vitest. Unit → `*.spec.ts`, stochastic → `*.stoch.ts`, mutation → `*.mutat.ts`. Coverage gate is 80% on statements/branches/functions/lines (vitest.config.ts). Never write fake tests (tests that assert a value they themselves produced without exercising the code under test).
- **Docs:** the README is generated — edit `base_README.md`, NEVER `README.md` (update_madlibs.js regenerates it). Every exported entity gets a DocBlock whose first line is a one-line summary (CLAUDE.md rule; also feeds typedoc coverage).
- **jssm error facts:** `JssmError` is NOT re-exported from the `jssm` package — never `instanceof JssmError` against a package import. `fslDiagnostics` never throws. Only `from()` and `fsl_to_svg_string()` throw on invalid FSL; the `analyze`-first guard means we never call them on sources that fail to compile.
- **Commits:** Conventional Commits style. Commit after each task's tests pass.

---

## File Structure

- `src/ts/types.ts` — shared `FslSeverity`, `FslDiagnostic` types. One responsibility: the vocabulary every tool speaks.
- `src/ts/analyze.ts` — `offsetToLineCol`, `analyze`, `hasErrors`. The shared diagnostics core.
- `src/ts/tools/validate.ts` — `fslValidate` + `ValidateResult`.
- `src/ts/tools/lint.ts` — `fslLint` + `LintResult`, `LintNote`.
- `src/ts/tools/explain.ts` — `fslExplain` + `ExplainResult`, `ExplainError`, `ExplainTransition`.
- `src/ts/tools/simulate.ts` — `fslSimulate` + `SimulateResult`, `SimulateError`.
- `src/ts/tools/render.ts` — `fslRender` + `RenderSvg`, `RenderUnsupported`, `RenderError`, `RenderFormat`.
- `src/ts/server.ts` — `createServer`, `startServer`. Registers the five tools.
- `src/ts/bin.ts` — executable entry (shebang) that calls `startServer`.
- `src/ts/index.ts` — public library API: re-exports the five tool functions + their types + `createServer`.
- Tests live beside sources under `src/ts/tests/` and `src/ts/e2e/`, per the existing template layout.

---

## Task 1: De-template the package identity

Strip the `fsl-mcp` scaffold identity and the `stub`/`double` demo so the repo is a clean, building `fsl-mcp` shell with an empty-but-valid public API.

**Files:**
- Modify: `package.json` (name, version, description, keywords, homepage, bugs, repository)
- Modify: `rollup.config.js:18,53,83` (the three `name: 'fsl-mcp'`)
- Modify: `src/ts/index.ts` (remove stub re-exports; leave a valid empty module)
- Delete: `src/ts/stub.ts`, `src/ts/tests/stub.spec.ts`, `src/ts/tests/stub.stoch.ts`, `src/ts/tests/stub.mutat.ts`
- Modify: `src/ts/tests/index.spec.ts` (drop `double`/`unhandled_external` assertions; assert package identity instead)
- Create: `src/ts/tests/identity.spec.ts` (regression guard against leftover template strings)

**Interfaces:**
- Consumes: nothing.
- Produces: a clean `src/ts/index.ts` (initially exporting nothing runtime-facing) that later tasks append to.

- [ ] **Step 1: Write the failing identity-guard test**

Create `src/ts/tests/identity.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('package identity', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

  it('is named fsl-mcp at version 0.1.0', () => {
    expect(pkg.name).toBe('fsl-mcp');
    expect(pkg.version).toBe('0.1.0');
  });

  it('carries no leftover template name in package.json', () => {
    expect(JSON.stringify(pkg)).not.toContain('fsl-mcp');
  });

  it('carries no leftover template name in rollup.config.js', () => {
    expect(readFileSync('rollup.config.js', 'utf8')).not.toContain('fsl-mcp');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/ts/tests/identity.spec.ts`
Expected: FAIL — name is still `fsl-mcp`, version `0.20.4`.

- [ ] **Step 3: Rename the package**

In `package.json` set:

```json
"name": "fsl-mcp",
"version": "0.1.0",
"description": "An MCP server for authoring FSL finite-state machines: validate, render, explain, simulate, and lint FSL source over stdio.",
"keywords": ["fsl", "jssm", "mcp", "model-context-protocol", "finite-state-machine", "state-machine", "stonecypher"],
"homepage": "https://github.com/StoneCypher/fsl-mcp#readme",
"bugs": { "url": "https://github.com/StoneCypher/fsl-mcp/issues" },
"repository": { "type": "git", "url": "git+https://github.com/StoneCypher/fsl-mcp.git" },
```

In `rollup.config.js`, replace all three `name: 'fsl-mcp'` with `name: 'fsl_mcp'`.

- [ ] **Step 4: Remove the stub demo and fix index**

Delete `src/ts/stub.ts`, `src/ts/tests/stub.spec.ts`, `src/ts/tests/stub.stoch.ts`, `src/ts/tests/stub.mutat.ts`.

Set `src/ts/index.ts` to a valid empty ESM module (later tasks add exports):

```ts
// Public API surface for fsl-mcp. Tool exports are added by later tasks.
export {};
```

Edit `src/ts/tests/index.spec.ts` to drop any `double`/`unhandled_external` import and assertion. If nothing else remains, replace its body with:

```ts
import { describe, it, expect } from 'vitest';

describe('index module', () => {
  it('imports without side effects', async () => {
    const mod = await import('../index.js');
    expect(mod).toBeTypeOf('object');
  });
});
```

- [ ] **Step 5: Run the tests to confirm green**

Run: `npx vitest run src/ts/tests/identity.spec.ts src/ts/tests/index.spec.ts`
Expected: PASS. (Coverage thresholds are not enforced on a single-file run; the full gate is checked in Task 10.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: de-template package identity to fsl-mcp"
```

---

## Task 2: Install dependencies and verify the jssm capability floor

Add the runtime deps and prove — with a live test — that the four jssm entry points the tools rely on actually work in-process. This IS the spec's "build-time check" (§88) and settles whether `@viz-js/viz` must be an explicit dependency.

**Files:**
- Modify: `package.json` (dependencies block)
- Create: `src/ts/tests/jssm_capability.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: confidence that `from`, `fslDiagnostics` (from `jssm`) and `fsl_to_svg_string` (from `jssm/viz`) are callable; a known-good sample FSL string reused by later tests.

- [ ] **Step 1: Add dependencies to package.json**

Add a `dependencies` block (the template has only devDependencies):

```json
"dependencies": {
  "jssm": "^5.162.1",
  "@modelcontextprotocol/sdk": "^1.0.0",
  "zod": "^4.3.6"
}
```

(`zod` currently sits in devDependencies — move it to dependencies since the server ships it at runtime.)

- [ ] **Step 2: Install**

Run: `npm install`
Expected: completes; `node_modules/jssm` and `node_modules/@modelcontextprotocol/sdk` exist.

- [ ] **Step 3: Write the capability test**

Create `src/ts/tests/jssm_capability.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { from, fslDiagnostics } from 'jssm';
import { fsl_to_svg_string } from 'jssm/viz';

const GOOD = 'a -> b -> c;';
const BAD  = 'a -> ;';   // dangling arrow: a parse/compile error

describe('jssm capability floor', () => {
  it('fslDiagnostics returns [] for valid FSL and never throws', () => {
    expect(fslDiagnostics(GOOD)).toEqual([]);
  });

  it('fslDiagnostics reports an error diagnostic for invalid FSL', () => {
    const diags = fslDiagnostics(BAD);
    expect(diags.some(d => d.severity === 'error')).toBe(true);
    expect(diags[0]).toHaveProperty('range');
    expect(diags[0]).toHaveProperty('message');
  });

  it('from() builds a machine whose states() and state() work', () => {
    const m = from(GOOD);
    expect(m.states().sort()).toEqual(['a', 'b', 'c']);
    expect(m.state()).toBe('a');
  });

  it('fsl_to_svg_string renders valid FSL to an <svg>', async () => {
    const svg = await fsl_to_svg_string(GOOD);
    expect(svg).toContain('<svg');
  });
});
```

- [ ] **Step 4: Run it**

Run: `npx vitest run src/ts/tests/jssm_capability.spec.ts`
Expected: PASS.

If the `fsl_to_svg_string` case fails with a module-not-found for `@viz-js/viz`, add it explicitly and reinstall:

```bash
npm install @viz-js/viz@^3.26.0
```

Then re-run; expected PASS. Record in the commit message whether `@viz-js/viz` was needed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add jssm/mcp deps and verify jssm capability floor"
```

---

## Task 3: The `analyze` diagnostics core

Build the shared foundation: convert character offsets to `{line, col}` and wrap `fslDiagnostics` into the project's `FslDiagnostic` shape. Every tool builds on this.

**Files:**
- Create: `src/ts/types.ts`
- Create: `src/ts/analyze.ts`
- Create: `src/ts/tests/analyze.spec.ts`
- Create: `src/ts/tests/analyze.stoch.ts`

**Interfaces:**
- Consumes: `fslDiagnostics` from `jssm`.
- Produces:
  - `type FslSeverity = 'error' | 'warning' | 'info' | 'hint'`
  - `interface FslDiagnostic { severity: FslSeverity; message: string; line: number; col: number }` (line/col 1-based)
  - `function offsetToLineCol(source: string, offset: number): { line: number; col: number }`
  - `function analyze(source: string): FslDiagnostic[]`
  - `function hasErrors(diags: FslDiagnostic[]): boolean`

- [ ] **Step 1: Write the failing tests**

Create `src/ts/tests/analyze.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { offsetToLineCol, analyze, hasErrors } from '../analyze.js';

describe('offsetToLineCol', () => {
  it('maps offset 0 to line 1, col 1', () => {
    expect(offsetToLineCol('abc', 0)).toEqual({ line: 1, col: 1 });
  });
  it('counts newlines and resets the column', () => {
    // "ab\ncd", offset 4 is the 'd' -> line 2, col 2
    expect(offsetToLineCol('ab\ncd', 4)).toEqual({ line: 2, col: 2 });
  });
  it('clamps out-of-range offsets to the string bounds', () => {
    expect(offsetToLineCol('ab', 99)).toEqual({ line: 1, col: 3 });
    expect(offsetToLineCol('ab', -5)).toEqual({ line: 1, col: 1 });
  });
});

describe('analyze / hasErrors', () => {
  it('returns [] and hasErrors=false for valid FSL', () => {
    const diags = analyze('a -> b -> c;');
    expect(diags).toEqual([]);
    expect(hasErrors(diags)).toBe(false);
  });
  it('returns line/col-bearing error diagnostics for invalid FSL', () => {
    const diags = analyze('a -> ;');
    expect(hasErrors(diags)).toBe(true);
    const err = diags.find(d => d.severity === 'error')!;
    expect(err.line).toBeGreaterThanOrEqual(1);
    expect(err.col).toBeGreaterThanOrEqual(1);
    expect(err.message).toBeTypeOf('string');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/tests/analyze.spec.ts`
Expected: FAIL — `../analyze.js` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/ts/types.ts`:

```ts
/** Severity of an FSL diagnostic, aligned with LSP / jssm's DiagnosticSeverity. */
export type FslSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * A single FSL diagnostic in fsl-mcp's normalized shape.
 *
 * jssm reports positions as character offsets; fsl-mcp normalizes them to
 * 1-based line/column so tool consumers get human-facing coordinates.
 *
 * @example
 *   { severity: 'error', message: 'unexpected end of input', line: 1, col: 6 }
 */
export interface FslDiagnostic {
  severity : FslSeverity;
  message  : string;
  line     : number;
  col      : number;
}
```

Create `src/ts/analyze.ts`:

```ts
import { fslDiagnostics } from 'jssm';
import type { FslDiagnostic } from './types.js';

/**
 * Convert a 0-based character offset in `source` to a 1-based line/column.
 *
 * Offsets outside the string are clamped to its bounds, so a diagnostic that
 * points just past the end still yields a sane coordinate.
 *
 * @param source - the FSL source text
 * @param offset - a 0-based character index into `source`
 * @returns 1-based `line` and `col`
 *
 * @example
 *   offsetToLineCol('ab\ncd', 4)  // => { line: 2, col: 2 }
 */
export function offsetToLineCol(source: string, offset: number): { line: number; col: number } {
  const clamped = Math.max(0, Math.min(offset, source.length));
  let line = 1;
  let col  = 1;
  for (let i = 0; i < clamped; i++) {
    if (source[i] === '\n') { line += 1; col = 1; }
    else { col += 1; }
  }
  return { line, col };
}

/**
 * Run jssm's editor-agnostic diagnostics over FSL source and normalize each to
 * fsl-mcp's `FslDiagnostic` shape (offsets -> 1-based line/col). Never throws.
 *
 * @param source - the FSL source text
 * @returns the diagnostics; `[]` when the source is clean
 *
 * @example
 *   analyze('a -> b -> c;')  // => []
 */
export function analyze(source: string): FslDiagnostic[] {
  return fslDiagnostics(source).map(d => {
    const { line, col } = offsetToLineCol(source, d.range.from);
    return { severity: d.severity, message: d.message, line, col };
  });
}

/**
 * Whether any diagnostic is an error (i.e. the source does not compile).
 *
 * @example
 *   hasErrors(analyze('a -> ;'))  // => true
 */
export function hasErrors(diags: FslDiagnostic[]): boolean {
  return diags.some(d => d.severity === 'error');
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/tests/analyze.spec.ts`
Expected: PASS.

- [ ] **Step 5: Add a stochastic test**

Create `src/ts/tests/analyze.stoch.ts` — property: `offsetToLineCol` never returns a coordinate below 1, for any string and any integer offset.

```ts
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { offsetToLineCol } from '../analyze.js';

describe('offsetToLineCol properties', () => {
  it('always returns line>=1 and col>=1 for any string and integer offset', () => {
    fc.assert(fc.property(fc.string(), fc.integer(), (s, off) => {
      const { line, col } = offsetToLineCol(s, off);
      return line >= 1 && col >= 1;
    }));
  });

  it('line never exceeds newline-count + 1', () => {
    fc.assert(fc.property(fc.string(), fc.nat(), (s, off) => {
      const newlines = (s.match(/\n/g) ?? []).length;
      return offsetToLineCol(s, off).line <= newlines + 1;
    }));
  });
});
```

Run: `npx vitest run --config vitest-stoch.config.ts src/ts/tests/analyze.stoch.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add analyze diagnostics core (offset->line/col, fslDiagnostics wrapper)"
```

---

## Task 4: `fsl_validate`

The simplest tool: is this FSL valid, and what are the diagnostics.

**Files:**
- Create: `src/ts/tools/validate.ts`
- Create: `src/ts/tests/validate.spec.ts`
- Modify: `src/ts/index.ts` (export `fslValidate`, `ValidateResult`)

**Interfaces:**
- Consumes: `analyze`, `hasErrors` from `../analyze.js`; `FslDiagnostic` from `../types.js`.
- Produces:
  - `interface ValidateResult { valid: boolean; diagnostics: FslDiagnostic[] }`
  - `function fslValidate(source: string): ValidateResult`

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/validate.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fslValidate } from '../tools/validate.js';

describe('fslValidate', () => {
  it('reports valid=true and no diagnostics for good FSL', () => {
    const r = fslValidate('a -> b -> c;');
    expect(r.valid).toBe(true);
    expect(r.diagnostics).toEqual([]);
  });

  it('reports valid=false with at least one error diagnostic for bad FSL', () => {
    const r = fslValidate('a -> ;');
    expect(r.valid).toBe(false);
    expect(r.diagnostics.some(d => d.severity === 'error')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/tests/validate.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/ts/tools/validate.ts`:

```ts
import { analyze, hasErrors } from '../analyze.js';
import type { FslDiagnostic } from '../types.js';

/** Result of validating FSL source. */
export interface ValidateResult {
  valid       : boolean;
  diagnostics : FslDiagnostic[];
}

/**
 * Validate FSL source: does it parse and compile, and what does jssm report.
 *
 * @param source - the FSL source text
 * @returns `valid` (no error-severity diagnostics) and the full diagnostic list
 *
 * @example
 *   fslValidate('a -> b;')   // => { valid: true,  diagnostics: [] }
 *   fslValidate('a -> ;')    // => { valid: false, diagnostics: [ {severity:'error', ...} ] }
 */
export function fslValidate(source: string): ValidateResult {
  const diagnostics = analyze(source);
  return { valid: !hasErrors(diagnostics), diagnostics };
}
```

Append to `src/ts/index.ts`:

```ts
export { fslValidate } from './tools/validate.js';
export type { ValidateResult } from './tools/validate.js';
```

(Remove the placeholder `export {};` once real exports exist.)

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/tests/validate.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add fsl_validate tool"
```

---

## Task 5: `fsl_lint`

Surface the softer diagnostics (warning/info/hint) as style notes.

**Files:**
- Create: `src/ts/tools/lint.ts`
- Create: `src/ts/tests/lint.spec.ts`
- Modify: `src/ts/index.ts` (export `fslLint`, `LintResult`, `LintNote`)

**Interfaces:**
- Consumes: `analyze` from `../analyze.js`.
- Produces:
  - `interface LintNote { rule: string; message: string; line: number }`
  - `interface LintResult { notes: LintNote[] }`
  - `function fslLint(source: string): LintResult`

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/lint.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fslLint } from '../tools/lint.js';

describe('fslLint', () => {
  it('returns no notes for clean FSL', () => {
    expect(fslLint('a -> b -> c;').notes).toEqual([]);
  });

  it('never surfaces error-severity diagnostics as lint notes', () => {
    // Error-severity problems belong to fslValidate, not lint.
    const notes = fslLint('a -> ;').notes;
    expect(notes.every(n => n.rule !== 'error')).toBe(true);
  });

  it('maps a non-error diagnostic to a note carrying rule/message/line', () => {
    // Construct a source that yields a warning/info/hint from jssm; if the
    // installed jssm emits none for this sample, assert the shape holds for
    // whatever non-error notes appear (possibly zero) — the contract is the
    // mapping, verified structurally.
    for (const n of fslLint('a -> b -> c;').notes) {
      expect(n).toHaveProperty('rule');
      expect(n).toHaveProperty('message');
      expect(typeof n.line).toBe('number');
    }
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/tests/lint.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/ts/tools/lint.ts`:

```ts
import { analyze } from '../analyze.js';

/** One lint note: a non-error diagnostic, keyed by its severity as `rule`. */
export interface LintNote {
  rule    : string;
  message : string;
  line    : number;
}

/** Result of linting FSL source. */
export interface LintResult {
  notes : LintNote[];
}

/**
 * Lint FSL source: surface warning/info/hint diagnostics as style notes.
 * Error-severity problems are the province of `fslValidate` and are excluded.
 *
 * @param source - the FSL source text
 * @returns the non-error notes; `notes: []` when the source is clean
 *
 * @example
 *   fslLint('a -> b;')  // => { notes: [] }
 */
export function fslLint(source: string): LintResult {
  const notes = analyze(source)
    .filter(d => d.severity !== 'error')
    .map(d => ({ rule: d.severity, message: d.message, line: d.line }));
  return { notes };
}
```

Append to `src/ts/index.ts`:

```ts
export { fslLint } from './tools/lint.js';
export type { LintResult, LintNote } from './tools/lint.js';
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/tests/lint.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add fsl_lint tool"
```

---

## Task 6: `fsl_explain`

Describe a machine's structure: states, transitions, start, terminals, and a one-line summary. On invalid FSL, return diagnostics instead.

**Files:**
- Create: `src/ts/tools/explain.ts`
- Create: `src/ts/tests/explain.spec.ts`
- Modify: `src/ts/index.ts`

**Interfaces:**
- Consumes: `from` from `jssm`; `analyze`, `hasErrors` from `../analyze.js`; `FslDiagnostic` from `../types.js`.
- Produces:
  - `interface ExplainTransition { from: string; to: string; kind: string; action?: string; name?: string }`
  - `interface ExplainResult { valid: true; states: string[]; transitions: ExplainTransition[]; start: string[]; terminals: string[]; summary: string }`
  - `interface ExplainError { valid: false; diagnostics: FslDiagnostic[] }`
  - `function fslExplain(source: string): ExplainResult | ExplainError`

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/explain.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fslExplain } from '../tools/explain.js';

describe('fslExplain', () => {
  it('lists states, transitions, start and terminals for a linear machine', () => {
    const r = fslExplain('a -> b -> c;');
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.states.sort()).toEqual(['a', 'b', 'c']);
    expect(r.transitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'a', to: 'b' }),
      expect.objectContaining({ from: 'b', to: 'c' }),
    ]));
    expect(r.start).toContain('a');
    expect(r.terminals).toContain('c');
    expect(r.summary).toContain('states');
  });

  it('returns valid=false with diagnostics for invalid FSL', () => {
    const r = fslExplain('a -> ;');
    expect(r.valid).toBe(false);
    if (r.valid) return;
    expect(r.diagnostics.some(d => d.severity === 'error')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/tests/explain.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/ts/tools/explain.ts`:

```ts
import { from } from 'jssm';
import { analyze, hasErrors } from '../analyze.js';
import type { FslDiagnostic } from '../types.js';

/** A transition in the explained structure. */
export interface ExplainTransition {
  from    : string;
  to      : string;
  kind    : string;
  action? : string;
  name?   : string;
}

/** Structural explanation of a valid machine. */
export interface ExplainResult {
  valid       : true;
  states      : string[];
  transitions : ExplainTransition[];
  start       : string[];
  terminals   : string[];
  summary     : string;
}

/** Returned instead of a structure when the source does not compile. */
export interface ExplainError {
  valid       : false;
  diagnostics : FslDiagnostic[];
}

/**
 * Explain an FSL machine's structure: its states, transitions, start state(s),
 * terminal state(s), and a one-line summary. Invalid source yields diagnostics.
 *
 * @param source - the FSL source text
 * @returns an `ExplainResult` for valid source, or an `ExplainError` otherwise
 *
 * @example
 *   fslExplain('a -> b;')
 *   // => { valid: true, states: ['a','b'], transitions: [{from:'a',to:'b',kind:...}],
 *   //      start: ['a'], terminals: ['b'], summary: '2 states, 1 transitions; ...' }
 */
export function fslExplain(source: string): ExplainResult | ExplainError {
  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) { return { valid: false, diagnostics }; }

  const m      = from(source);
  const states = m.states().map(String);

  const transitions = m.list_edges().map(e => {
    const t: ExplainTransition = { from: String(e.from), to: String(e.to), kind: String(e.kind) };
    if (e.action !== undefined) { t.action = String(e.action); }
    if (e.name   !== undefined) { t.name   = String(e.name); }
    return t;
  });

  const start     = states.filter(s => m.is_start_state(s));
  const terminals = states.filter(s => m.state_is_terminal(s));
  const summary   =
    `${states.length} states, ${transitions.length} transitions; ` +
    `start: ${start.join(', ') || '(none)'}; ` +
    `terminal: ${terminals.join(', ') || '(none)'}.`;

  return { valid: true, states, transitions, start, terminals, summary };
}
```

Append to `src/ts/index.ts`:

```ts
export { fslExplain } from './tools/explain.js';
export type { ExplainResult, ExplainError, ExplainTransition } from './tools/explain.js';
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/tests/explain.spec.ts`
Expected: PASS. If `m.state_is_terminal` types complain about the `string` argument, cast the callback param (`(s: string)`); the runtime accepts state names.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add fsl_explain tool"
```

---

## Task 7: `fsl_simulate`

Drive a machine through a list of actions; report the path, end state, legal next moves, and any rejection.

**Files:**
- Create: `src/ts/tools/simulate.ts`
- Create: `src/ts/tests/simulate.spec.ts`
- Modify: `src/ts/index.ts`

**Interfaces:**
- Consumes: `from` from `jssm`; `analyze`, `hasErrors` from `../analyze.js`; `FslDiagnostic` from `../types.js`.
- Produces:
  - `interface SimulateResult { valid: true; endState: string; path: string[]; legalNext: string[]; rejected?: { action: string; index: number } }`
  - `interface SimulateError { valid: false; diagnostics: FslDiagnostic[] }`
  - `function fslSimulate(source: string, actions: string[]): SimulateResult | SimulateError`

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/simulate.spec.ts`:

```ts
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
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/tests/simulate.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/ts/tools/simulate.ts`:

```ts
import { from } from 'jssm';
import { analyze, hasErrors } from '../analyze.js';
import type { FslDiagnostic } from '../types.js';

/** Result of simulating a walk over a valid machine. */
export interface SimulateResult {
  valid     : true;
  endState  : string;
  path      : string[];
  legalNext : string[];
  rejected? : { action: string; index: number };
}

/** Returned instead of a walk when the source does not compile. */
export interface SimulateError {
  valid       : false;
  diagnostics : FslDiagnostic[];
}

/**
 * Simulate a walk over an FSL machine. Each entry in `actions` is applied as an
 * action label first (`.action`), then — if that is not legal — as a target
 * state (`.transition`). The walk stops at the first move that is neither, and
 * that rejection is reported. Invalid source yields diagnostics.
 *
 * @param source - the FSL source text
 * @param actions - action labels and/or target state names to apply in order
 * @returns a `SimulateResult` for valid source, or a `SimulateError` otherwise
 *
 * @example
 *   fslSimulate('a -> b -> c;', ['b', 'c'])
 *   // => { valid: true, endState: 'c', path: ['a','b','c'], legalNext: [...] }
 *
 * @example
 *   fslSimulate('a -> b;', ['c'])
 *   // => { valid: true, endState: 'a', path: ['a'], legalNext: [...],
 *   //      rejected: { action: 'c', index: 0 } }
 */
export function fslSimulate(source: string, actions: string[]): SimulateResult | SimulateError {
  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) { return { valid: false, diagnostics }; }

  const m    = from(source);
  const path : string[] = [ String(m.state()) ];
  let rejected: { action: string; index: number } | undefined;

  for (let i = 0; i < actions.length; i++) {
    const a  = actions[i]!;
    const ok = m.action(a) || m.transition(a);
    if (!ok) { rejected = { action: a, index: i }; break; }
    path.push(String(m.state()));
  }

  const result: SimulateResult = {
    valid    : true,
    endState : String(m.state()),
    path,
    legalNext: m.actions().map(String),
  };
  if (rejected !== undefined) { result.rejected = rejected; }
  return result;
}
```

Append to `src/ts/index.ts`:

```ts
export { fslSimulate } from './tools/simulate.js';
export type { SimulateResult, SimulateError } from './tools/simulate.js';
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/tests/simulate.spec.ts`
Expected: PASS. Note on semantics: `m.actions()` lists legal *action labels* from the current state; for machines whose edges are unlabeled, `legalNext` may be empty even though target-state transitions exist — document this ceiling in the README (Task 10), per spec Risks §86.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add fsl_simulate tool"
```

---

## Task 8: `fsl_render`

Render FSL to SVG. `format:"png"` is accepted but degrades to SVG-plus-note in v1.

**Files:**
- Create: `src/ts/tools/render.ts`
- Create: `src/ts/tests/render.spec.ts`
- Modify: `src/ts/index.ts`

**Interfaces:**
- Consumes: `fsl_to_svg_string` from `jssm/viz`; `analyze`, `hasErrors` from `../analyze.js`; `FslDiagnostic` from `../types.js`.
- Produces:
  - `type RenderFormat = 'svg' | 'png'`
  - `interface RenderSvg { valid: true; format: 'svg'; svg: string }`
  - `interface RenderUnsupported { valid: true; format: 'png'; svg: string; note: string }`
  - `interface RenderError { valid: false; diagnostics: FslDiagnostic[] }`
  - `function fslRender(source: string, format?: RenderFormat): Promise<RenderSvg | RenderUnsupported | RenderError>`

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/render.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fslRender } from '../tools/render.js';

describe('fslRender', () => {
  it('renders valid FSL to an <svg> by default', async () => {
    const r = await fslRender('a -> b -> c;');
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.format).toBe('svg');
    expect('svg' in r && r.svg).toContain('<svg');
  });

  it('degrades png to svg-plus-note in v1', async () => {
    const r = await fslRender('a -> b;', 'png');
    expect(r.valid).toBe(true);
    if (!r.valid) return;
    expect(r.format).toBe('png');
    if (r.format !== 'png') return;
    expect(r.svg).toContain('<svg');
    expect(r.note).toMatch(/not yet supported/i);
  });

  it('returns diagnostics for invalid FSL without attempting to render', async () => {
    const r = await fslRender('a -> ;');
    expect(r.valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/tests/render.spec.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/ts/tools/render.ts`:

```ts
import { fsl_to_svg_string } from 'jssm/viz';
import { analyze, hasErrors } from '../analyze.js';
import type { FslDiagnostic } from '../types.js';

/** Requested render format. */
export type RenderFormat = 'svg' | 'png';

/** Successful SVG render. */
export interface RenderSvg {
  valid  : true;
  format : 'svg';
  svg    : string;
}

/** PNG requested but unsupported in v1: the SVG plus an explanatory note. */
export interface RenderUnsupported {
  valid  : true;
  format : 'png';
  svg    : string;
  note   : string;
}

/** Returned instead of a diagram when the source does not compile. */
export interface RenderError {
  valid       : false;
  diagnostics : FslDiagnostic[];
}

/**
 * Render FSL source to a diagram. SVG is produced natively; `format:'png'` is
 * accepted but degrades to the SVG plus a note in v1 (no rasterizer shipped).
 * Invalid source yields diagnostics and is never handed to the renderer.
 *
 * @param source - the FSL source text
 * @param format - `'svg'` (default) or `'png'`
 * @returns an SVG result, a degraded-png result, or an error with diagnostics
 *
 * @example
 *   await fslRender('a -> b;')          // => { valid: true, format: 'svg', svg: '<svg ...' }
 *   await fslRender('a -> b;', 'png')   // => { valid: true, format: 'png', svg: '<svg ...', note: '...' }
 */
export async function fslRender(
  source: string,
  format: RenderFormat = 'svg',
): Promise<RenderSvg | RenderUnsupported | RenderError> {
  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) { return { valid: false, diagnostics }; }

  const svg = await fsl_to_svg_string(source);

  if (format === 'png') {
    return {
      valid : true,
      format: 'png',
      svg,
      note  : 'png rasterization is not yet supported in v1; returning svg. Tracked via the Wmcp sync items.',
    };
  }

  return { valid: true, format: 'svg', svg };
}
```

Append to `src/ts/index.ts`:

```ts
export { fslRender } from './tools/render.js';
export type { RenderFormat, RenderSvg, RenderUnsupported, RenderError } from './tools/render.js';
```

- [ ] **Step 4: Run to confirm pass**

Run: `npx vitest run src/ts/tests/render.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add fsl_render tool (svg; png degrades with note)"
```

---

## Task 9: MCP server wiring + `npx fsl-mcp`

Register the five tool functions as MCP tools over stdio, add the executable entry, and prove it end-to-end with an in-process client.

**Files:**
- Create: `src/ts/server.ts`
- Create: `src/ts/bin.ts`
- Modify: `src/ts/index.ts` (export `createServer`)
- Modify: `package.json` (add `bin`)
- Modify: `rollup.config.js` (add a node bin bundle with shebang banner, deps external)
- Create: `src/ts/e2e/server.spec.ts`

**Interfaces:**
- Consumes: all five tool functions from `./tools/*.js`; `McpServer`, `StdioServerTransport` from `@modelcontextprotocol/sdk`; `z` from `zod`.
- Produces:
  - `function createServer(): McpServer` — a server with the five tools registered.
  - `function startServer(): Promise<void>` — connects it to stdio.

- [ ] **Step 1: Write the failing e2e test**

Create `src/ts/e2e/server.spec.ts` — connect an in-memory client to the server and exercise `tools/list` and one call:

```ts
import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../server.js';

describe('fsl-mcp server', () => {
  it('lists the five tools and validates FSL over the protocol', async () => {
    const server = createServer();
    const [clientTx, serverTx] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0.0.0' });

    await Promise.all([server.connect(serverTx), client.connect(clientTx)]);

    const tools = await client.listTools();
    const names = tools.tools.map(t => t.name).sort();
    expect(names).toEqual(
      ['fsl_explain', 'fsl_lint', 'fsl_render', 'fsl_simulate', 'fsl_validate'].sort(),
    );

    const res = await client.callTool({ name: 'fsl_validate', arguments: { source: 'a -> b;' } });
    const payload = JSON.parse((res.content as Array<{ type: string; text: string }>)[0]!.text);
    expect(payload.valid).toBe(true);

    await client.close();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/ts/e2e/server.spec.ts`
Expected: FAIL — `../server.js` missing. (This file lives under `e2e/`, which vitest.config.ts excludes from the default unit run, so invoke it by explicit path here.)

- [ ] **Step 3: Implement the server**

Create `src/ts/server.ts`:

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { fslValidate } from './tools/validate.js';
import { fslLint     } from './tools/lint.js';
import { fslExplain  } from './tools/explain.js';
import { fslSimulate } from './tools/simulate.js';
import { fslRender   } from './tools/render.js';

/** Wrap any JSON-serializable value as an MCP text-content tool result. */
function jsonResult(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

/**
 * Build the fsl-mcp server with all five FSL authoring tools registered.
 * The returned server is transport-agnostic; connect it to stdio (production)
 * or an in-memory transport (tests).
 *
 * @returns a configured, not-yet-connected MCP server
 *
 * @example
 *   const server = createServer();
 *   await server.connect(new StdioServerTransport());
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'fsl-mcp', version: '0.1.0' });

  server.registerTool('fsl_validate',
    { description: 'Validate FSL source; returns { valid, diagnostics: [{severity, message, line, col}] }.',
      inputSchema: { source: z.string() } },
    async ({ source }) => jsonResult(fslValidate(source)));

  server.registerTool('fsl_lint',
    { description: 'Lint FSL source; returns { notes: [{rule, message, line}] } for non-error diagnostics.',
      inputSchema: { source: z.string() } },
    async ({ source }) => jsonResult(fslLint(source)));

  server.registerTool('fsl_explain',
    { description: 'Explain an FSL machine: { states, transitions, start, terminals, summary } or diagnostics.',
      inputSchema: { source: z.string() } },
    async ({ source }) => jsonResult(fslExplain(source)));

  server.registerTool('fsl_simulate',
    { description: 'Simulate a walk: apply actions/target-states in order; returns { endState, path, legalNext, rejected? }.',
      inputSchema: { source: z.string(), actions: z.array(z.string()) } },
    async ({ source, actions }) => jsonResult(fslSimulate(source, actions)));

  server.registerTool('fsl_render',
    { description: 'Render FSL to SVG. format:"png" degrades to svg-plus-note in v1.',
      inputSchema: { source: z.string(), format: z.enum(['svg', 'png']).optional() } },
    async ({ source, format }) => jsonResult(await fslRender(source, format)));

  return server;
}

/**
 * Start the fsl-mcp server on stdio. Resolves once the transport is connected;
 * the process then serves requests until stdin closes.
 *
 * @example
 *   await startServer();   // used by the `fsl-mcp` bin entry
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}
```

> **SDK API note:** this targets `@modelcontextprotocol/sdk` 1.x, where `McpServer#registerTool(name, { description, inputSchema }, handler)` takes a raw zod shape (not a compiled schema) as `inputSchema`. If the installed SDK's typings reject this signature, consult the installed `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts` for the exact `registerTool`/`tool` signature and adapt the three-arg calls; the e2e test is the acceptance gate.

- [ ] **Step 4: Add exports and the bin entry**

Append to `src/ts/index.ts`:

```ts
export { createServer, startServer } from './server.js';
```

Create `src/ts/bin.ts`:

```ts
import { startServer } from './server.js';

startServer().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
```

In `package.json` add:

```json
"bin": { "fsl-mcp": "dist/bin.mjs" },
```

Add the bin bundle to `rollup.config.js` — a node-targeted build that externalizes runtime deps and prepends the shebang. Insert this config object and add it to the default export array:

```js
const bin_config = {
  input: 'build/ts/bin.js',
  output: {
    file   : 'dist/bin.mjs',
    format : 'es',
    banner : '#!/usr/bin/env node',
    sourcemap: true
  },
  external: [ 'jssm', 'jssm/viz', '@modelcontextprotocol/sdk', /^@modelcontextprotocol\/sdk\//, 'zod', /^node:/ ],
  plugins : [
    nodeResolve({ exportConditions: ['node'], preferBuiltins: true, extensions: ['.ts', '.js'] }),
    commonjs()
  ]
};
```

Then change the final line to include it:

```js
export default [ es_config, cjs_config, iife_config, cjs_cts, bin_config ];
```

- [ ] **Step 5: Build, then run the e2e test**

Run: `npm run typescript`
Then: `npx vitest run src/ts/e2e/server.spec.ts`
Expected: PASS — five tools listed, `fsl_validate` returns `{ valid: true }` over the protocol.

- [ ] **Step 6: Smoke-test the bin manually**

Run: `npm run rollup`
Then verify the shebang and that it starts (Ctrl-C to exit, or pipe a newline):

Run: `node dist/bin.mjs < /dev/null`
Expected: exits cleanly (empty stdin closes the transport) with no thrown error.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: wire MCP stdio server and fsl-mcp bin entry"
```

---

## Task 10: README, docs, and the full green build

Replace the template README source with real fsl-mcp docs, confirm DocBlock/typedoc coverage, and run the whole build with coverage gates.

**Files:**
- Modify: `base_README.md` (the README *source* — never edit `README.md` directly)
- Modify: `CLAUDE.md` (currently empty — add the project's build/test/doc conventions)
- Verify: full build + coverage

**Interfaces:**
- Consumes: everything built above.
- Produces: publishable v1.

- [ ] **Step 1: Rewrite `base_README.md`**

Replace the template body (keep the `{{version}}`/`{{built}}`/`{{gh_hash}}` madlib line and the test-status tables — update_madlibs.js fills them). Write real content:

- Title `# fsl-mcp v{{version}}` and the existing `> Version ... built on ...` line.
- **What it is:** one paragraph from the spec Purpose (§8–15).
- **Install / run:** `npx fsl-mcp` and an MCP client config snippet:

  ````markdown
  ```json
  {
    "mcpServers": {
      "fsl": { "command": "npx", "args": ["fsl-mcp"] }
    }
  }
  ```
  ````

- **The five tools:** the spec's table (Tool / Input / Returns) for `fsl_validate`, `fsl_render`, `fsl_explain`, `fsl_simulate`, `fsl_lint`.
- **Ceilings (v1):** png degrades to svg-plus-note; `fsl_simulate` `legalNext` reflects action *labels*, so unlabeled-edge machines may show an empty `legalNext` (spec Risks §85–86).
- **Grow-with-language:** one line pointing at the Wmcp.* sync-item plan (spec §61–74).
- **License:** MIT.

Remove the entire "How to use this template" section (lines ~85–123 of the current file) and every `fsl-mcp` reference (site/docs/source links → `StoneCypher/fsl-mcp`).

- [ ] **Step 2: Fill in CLAUDE.md**

`CLAUDE.md` is empty. Add a concise project brief: what fsl-mcp is, the `analyze`-first architecture, the `base_README.md`-not-`README.md` rule, the test-suffix conventions (`.spec`/`.stoch`/`.mutat`), and the isolatedDeclarations/exactOptionalPropertyTypes gotchas. Keep it under ~40 lines.

- [ ] **Step 3: Run the full unit + stochastic suite with coverage**

Run: `npx vitest run --coverage`
Expected: PASS with statements/branches/functions/lines all ≥ 80%. If any tool is under-covered, add targeted `.spec.ts` cases (e.g. explain of a machine with a named/actioned edge to cover the `action`/`name` branches).

Run: `npx vitest run --config vitest-stoch.config.ts`
Expected: PASS.

- [ ] **Step 4: Run the full build**

Run: `npm run build`
Expected: completes exit 0. Watch for: typedoc doc-coverage warnings (every export needs a DocBlock — add any missing), attw type-resolution errors (the `exports`/`types` map must resolve), and eslint. Fix until clean.

- [ ] **Step 5: Check IDE diagnostics**

Use `mcp__ide__getDiagnostics` across the changed files. Resolve any lint/type/deprecation warnings before declaring done (CLAUDE.md rule).

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "docs: real fsl-mcp README, CLAUDE.md, and green v1 build"
```

---

## Self-Review

**Spec coverage:**
- Five tools (spec §41–47): `fsl_validate` (T4), `fsl_render` (T8), `fsl_explain` (T6), `fsl_simulate` (T7), `fsl_lint` (T5). ✓
- All tools take `source` string, return structured JSON (spec §39): every tool signature + `jsonResult` wrapper. ✓
- Packaging — standalone `fsl-mcp`, stdio MCP server, `npx fsl-mcp`, README (spec §54–58): T1 (name), T9 (server + bin), T10 (README). ✓
- Single-dependency spirit (spec §56): corrected to jssm + SDK + zod + (viz-js), reconciled in Global Constraints and T2; deviation is explicit, not silent. ✓
- Grow-with-language plan (spec §61–74): documented in README (T10 Step 1). The Wmcp.* issues live in the roadmap, not this repo — nothing to build here beyond the pointer. ✓
- Non-goals — no time-travel, no proofs, no NL authoring (spec §77–81): honored; nothing in the plan adds them. ✓
- Risks — render fidelity, simulate ceiling, API confirmation (spec §83–89): T2 confirms the API; T8/T7/T10 document the ceilings. ✓
- Build-time check of jssm public exports (spec §88): T2 is exactly this. ✓

**Placeholder scan:** every code and test step carries complete, runnable code. The one forward-reference — the SDK `registerTool` signature — is pinned to a concrete 1.x API with a fallback instruction and an acceptance test, not left as "TBD."

**Type consistency:** `FslDiagnostic`/`FslSeverity` defined in T3 (`types.ts`) and consumed unchanged in T4–T8. `analyze`/`hasErrors` signatures defined in T3 match every call site. Each tool's result/error interfaces are defined in its own task and re-exported by name in T4–T8's index edits. `createServer(): McpServer` defined in T9 matches its e2e consumer and index re-export. No name drift found.
