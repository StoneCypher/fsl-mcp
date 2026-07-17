# fsl_guide + Flowchart Idiom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach flowchart authorship through a new "Flowcharts in FSL" guide, served both as primer content and through a new `fsl_guide` MCP tool.

**Architecture:** Markdown stays the authored source in `src/prompts/`; a build step generates a committed `src/ts/tools/guide-content.ts` constants module (README-madlibs precedent) that rollup bundles into dist - zero runtime file reads. `fsl_guide` is a pure lookup over those constants, returning raw markdown text blocks. Tests hold the docs to the compiler: every ```fsl fence must pass `analyze()`, and a drift guard fails the suite when md and generated module diverge.

**Tech Stack:** TypeScript (strict: isolatedDeclarations, exactOptionalPropertyTypes, nodenext `.js` imports), zod, vitest, plain-ESM build script.

## Global Constraints

- Spec: `src/superpowers/spec/2026-07-17-fsl-guide-flowcharts-design.md`.
- The main primer `src/prompts/fsl-llms-draft.md` is NOT edited. 'language' = primer + `'\n\n'` + flowcharts doc, by concatenation.
- `fsl_guide` takes no FSL source; analyze-first is explicitly N/A for this one tool. Output is ONE text content block of markdown verbatim - never the jsonResult JSON wrapper.
- Every ```fsl fence in the flowchart doc must be a COMPLETE standalone document that compiles (the fence test enforces it). If a fence fails `analyze()` during implementation, minimally fix the FSL and record the deviation in your report - never weaken the test.
- The generated module is committed; regeneration is wired into the `typescript` npm script so every build refreshes it.
- Zero new dependencies; no package.json version change.
- Strict TS + strictTypeChecked eslint (no `!`; explicit types on exports); test files are eslint-ignored; relative imports need `.js`.
- Coverage gate 95 on all four metrics stays green.
- Never edit README.md (generated); base_README.md only.
- Commits: Conventional Commits; NO Claude-Session trailer; NO "Generated with Claude Code" line.
- Shell discipline for all executors: one command per Bash call - nothing joined by `&&`, `||`, `;`, a pipe, or a newline (package.json script STRINGS may contain `&&`; that rule governs tool calls, not file contents); nothing between git/npm and their subcommand; no `node -e`; Bash tool only, never the PowerShell tool.

## File Structure

- `src/prompts/fsl-flowcharts.md` - the authored guide (new).
- `src/build_js/generate_guide_content.js` - md -> TS constants generator (new).
- `src/ts/tools/guide-content.ts` - GENERATED, committed (new).
- `src/ts/tests/guide.spec.ts` - sentinels, composition, drift guard, fsl-fence compile test (new).
- `package.json` - `typescript` script gains the generator prefix (modify).
- `src/ts/server.ts` - fsl_guide registration (modify, Task 2).
- `src/ts/e2e/server.spec.ts` - one guide round-trip (modify, Task 2).
- `base_README.md` - tool row + section (modify, Task 2).

---

### Task 1: Content, generator, generated module, unit tests

**Files:**
- Create: `src/prompts/fsl-flowcharts.md`
- Create: `src/build_js/generate_guide_content.js`
- Create: `src/ts/tools/guide-content.ts` (by running the generator - never by hand)
- Modify: `package.json` (`scripts.typescript` only)
- Test: `src/ts/tests/guide.spec.ts`

**Interfaces:**
- Consumes: `analyze`, `hasErrors` from `src/ts/analyze.ts` (existing).
- Produces (Task 2 relies on these exact names): `GUIDE_FLOWCHARTS: string` and `GUIDE_LANGUAGE: string` exported from `src/ts/tools/guide-content.ts`.

- [ ] **Step 1: Author the guide**

Create `src/prompts/fsl-flowcharts.md` with exactly this content:

````markdown
# Flowcharts in FSL

Flowcharts map cleanly onto state machines: every box is a state, every arrow
is a transition, and every decision is a state whose outgoing edges carry the
answers. This section shows the idiom. Every fenced example below is a
complete FSL document that compiles on its own.

## The mapping

| Flowchart element | FSL |
|---|---|
| Process box | a plain state (default box shape) |
| Decision diamond | a state declared `shape: diamond;` with one labeled edge per outcome |
| Start terminal | your first state, styled so it reads as an entry point |
| End terminal | a state with no outgoing edges, declared `shape: doublecircle;` |
| Arrow label | an action label in single quotes BEFORE the arrow: `'yes' ->` |
| Failure/exception arrow | a forced transition `~>` |

## Decisions

One labeled edge per outcome, and the label goes **before** the arrow.
Decorations placed after the arrow silently do not bind - this is the single
most common flowchart-authoring mistake in FSL.

```fsl
Validate 'ok' -> Ship;
Validate 'bad' -> Reject;

state Validate: { shape: diamond; };
```

## Terminals

An end terminal is just a state with no outgoing edges; give it
`doublecircle` so it reads as terminal. Style the start state so the eye
finds the entry point. Note: a bare declaration `state X : {};` with no
properties is silently dropped - always set at least one property.

```fsl
Start -> Working;
Working -> Done;

state Start: { shape: circle; background-color: palegreen; };
state Done:  { shape: doublecircle; };
```

## Failure paths

Keep the happy path on `->` and exceptional flow on `~>` (forced
transitions); they render distinctly, so main flow and failure flow separate
visually for free. Transitions chain: `a -> b -> c;` is three states and two
edges in one statement.

```fsl
Fetch -> Parse -> Save;
Fetch ~> Failed;
Parse ~> Failed;
```

## Loops

Rework cycles are ordinary edges pointing back; the labels keep the diagram
readable.

```fsl
Draft -> Review;
Review 'approve' -> Publish;
Review 'revise'  -> Draft;
```

## Layout and themes

`flow: down;` gives the classic top-to-bottom flowchart read; `flow: right;`
suits pipelines. Name the machine so renders are titled. Themes available:
`default ocean modern plain bold`.

```fsl
machine_name: "Signup";
flow: down;

Landing -> Form -> Submitted;
```

## Gotchas (all empirically verified)

- Action labels and decorations bind only BEFORE the arrow; after the arrow
  they are silently ignored.
- `state X : {};` with an empty body is silently dropped - set at least one
  property.
- Two unlabeled edges with the same source and target collide, even across
  different arrow kinds - label at least one of them.
- Apostrophes inside single-quoted labels need escaping: `'it\'s done'`.
- Numeric cycle targets like `+1` parse but do not compile - spell states
  out in flowcharts.

## Rendering flowcharts

Request `format: "png"` with `width` 640 or more for chat legibility;
`format: "gif"` (keep `maxFrames` at or under 20) animates a random walk
through the flow, which makes a good quick demo. If no raster backend is
available the render degrades to SVG plus a note.

## Worked example: an approval flowchart

```fsl
machine_name: "Expense Approval";
flow: down;

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

Submitted is the start terminal; Paid is the end terminal; both diamonds
carry one labeled edge per outcome; the escalation path rides `~>`; the
rework loop returns to Submitted. Render it with `flow: down` and it reads
exactly like the whiteboard version.
````

- [ ] **Step 2: Write the generator**

Create `src/build_js/generate_guide_content.js`:

```js
/**
 * Generates src/ts/tools/guide-content.ts from the authored markdown in
 * src/prompts, so guidance ships inside the bundle with no runtime file
 * reads. Runs automatically before tsc via the `typescript` npm script.
 *
 * @example
 *   node src/build_js/generate_guide_content.js
 */
import { readFileSync, writeFileSync } from 'fs';

const PRIMER     = 'src/prompts/fsl-llms-draft.md';
const FLOWCHARTS = 'src/prompts/fsl-flowcharts.md';
const OUT        = 'src/ts/tools/guide-content.ts';

/**
 * Escape a string for safe embedding inside a TS template literal.
 *
 * @param {string} s - raw markdown
 * @returns {string} template-literal-safe text
 */
const escapeTemplate = (s) =>
  s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const primer     = readFileSync(PRIMER, 'utf8');
const flowcharts = readFileSync(FLOWCHARTS, 'utf8');
const language   = primer + '\n\n' + flowcharts;

const body = `// GENERATED FILE - DO NOT EDIT.
// Source: ${PRIMER} + ${FLOWCHARTS}
// Regenerate: node src/build_js/generate_guide_content.js (runs automatically before tsc)
/* eslint-disable @typescript-eslint/no-inferrable-types */

/** The "Flowcharts in FSL" idiom guide, verbatim from src/prompts/fsl-flowcharts.md. */
export const GUIDE_FLOWCHARTS: string = \`${escapeTemplate(flowcharts)}\`;

/** The full FSL primer plus the flowchart guide, for agents new to FSL. */
export const GUIDE_LANGUAGE: string = \`${escapeTemplate(language)}\`;
`;

writeFileSync(OUT, body);
console.log(`[guide] wrote ${OUT} (${String(flowcharts.length)} + ${String(primer.length)} chars)`);
```

- [ ] **Step 3: Wire it into the build**

In `package.json`, change ONLY the `typescript` script line from:

```json
    "typescript": "tsc --build tsconfig.json",
```

to:

```json
    "typescript": "node src/build_js/generate_guide_content.js && tsc --build tsconfig.json",
```

(The `&&` lives inside a package.json script string, which is allowed; the one-command rule governs shell tool calls.)

- [ ] **Step 4: Run the generator once**

Run: `node src/build_js/generate_guide_content.js`
Expected: `[guide] wrote src/ts/tools/guide-content.ts (...)` and the file exists with both exports.

- [ ] **Step 5: Write the failing tests**

Create `src/ts/tests/guide.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GUIDE_FLOWCHARTS, GUIDE_LANGUAGE } from '../tools/guide-content.js';
import { analyze, hasErrors } from '../analyze.js';

describe('guide content', () => {
  it('flowcharts guide carries its heading and core idiom vocabulary', () => {
    expect(GUIDE_FLOWCHARTS).toContain('# Flowcharts in FSL');
    expect(GUIDE_FLOWCHARTS).toContain('shape: diamond');
    expect(GUIDE_FLOWCHARTS).toContain('flow: down;');
    expect(GUIDE_FLOWCHARTS).toContain('~>');
  });

  it('language guide is the primer plus the flowchart guide, in that order', () => {
    expect(GUIDE_LANGUAGE).toContain('Finite State Language (authoring guide for LLMs)');
    expect(GUIDE_LANGUAGE).toContain('# Flowcharts in FSL');
    expect(GUIDE_LANGUAGE.indexOf('# Flowcharts in FSL'))
      .toBeGreaterThan(GUIDE_LANGUAGE.indexOf('Finite State Language'));
  });

  it('generated module matches the authored markdown exactly (drift guard)', () => {
    const primer = readFileSync('src/prompts/fsl-llms-draft.md', 'utf8');
    const flow   = readFileSync('src/prompts/fsl-flowcharts.md', 'utf8');
    expect(GUIDE_FLOWCHARTS).toBe(flow);
    expect(GUIDE_LANGUAGE).toBe(primer + '\n\n' + flow);
  });

  it('every fsl fence in the flowchart guide compiles', () => {
    const fences = [...GUIDE_FLOWCHARTS.matchAll(/```fsl\n([\s\S]*?)```/g)].map((m) => m[1] ?? '');
    expect(fences.length).toBeGreaterThanOrEqual(6);
    for (const fsl of fences) {
      const diagnostics = analyze(fsl);
      expect(hasErrors(diagnostics)).toBe(false);
    }
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/ts/tests/guide.spec.ts`
Expected: PASS 4/4. (They fail only if the generator or content is wrong - fix content per the fence-test rule in Global Constraints, rerun the generator, retest.)

- [ ] **Step 7: Static checks**

Run: `npx tsc --noEmit`
Expected: clean.
Run: `npx eslint src/ts/tools/guide-content.ts src/build_js/generate_guide_content.js`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/prompts/fsl-flowcharts.md src/build_js/generate_guide_content.js src/ts/tools/guide-content.ts src/ts/tests/guide.spec.ts package.json
git commit -m "feat(guide): flowchart idiom doc and build-time guide content embedding"
```

---

### Task 2: fsl_guide tool, e2e, README

**Files:**
- Modify: `src/ts/server.ts`
- Modify: `src/ts/e2e/server.spec.ts`
- Modify: `base_README.md`

**Interfaces:**
- Consumes: `GUIDE_FLOWCHARTS`, `GUIDE_LANGUAGE` from `./tools/guide-content.js` (Task 1).
- Produces: the `fsl_guide` tool, input `{ topic: 'flowcharts' | 'language' }`, returning one text content block of markdown.

- [ ] **Step 1: Register the tool**

In `src/ts/server.ts`, add to the imports:

```ts
import { GUIDE_FLOWCHARTS, GUIDE_LANGUAGE } from './tools/guide-content.js';
```

and add this registration after the existing five (matching their style):

```ts
  server.registerTool('fsl_guide',
    { description: 'Returns FSL authoring guidance as markdown. topic "language": the full FSL primer - call before writing FSL for the first time. topic "flowcharts": how to express flowcharts in FSL (decision diamonds, labeled branches, terminals, failure paths). Takes no FSL source.',
      inputSchema: { topic: z.enum(['flowcharts', 'language']) } },
    async ({ topic }) => ({
      content: [{ type: 'text' as const, text: topic === 'flowcharts' ? GUIDE_FLOWCHARTS : GUIDE_LANGUAGE }],
    }));
```

Note: raw markdown text block by design - do NOT wrap in jsonResult.

- [ ] **Step 2: e2e round-trip**

Append inside the existing describe block of `src/ts/e2e/server.spec.ts`, following its established client/callTool pattern (adapt the client variable name to the file's actual one):

```ts
  it('serves the flowchart guide through fsl_guide', async () => {
    const result = await client.callTool({ name: 'fsl_guide', arguments: { topic: 'flowcharts' } });
    const content = result.content as { type: string; text?: string }[];
    const text = content.find((c) => c.type === 'text');
    expect(text?.text).toContain('# Flowcharts in FSL');
    expect(text?.text).toContain('shape: diamond');
  });
```

- [ ] **Step 3: Full suite and gate**

Run: `npx vitest run --coverage`
Expected: all green, coverage >= 95 on all four metrics.
Run: `npx tsc --noEmit`
Expected: clean.
Run: `npx eslint src/ts/server.ts`
Expected: clean.

- [ ] **Step 4: Update base_README.md**

Add `fsl_guide` to the tool table (match the table's existing row format; one-line description: "FSL authoring guidance as markdown - topics: language, flowcharts"). Then add this section near the other per-tool sections:

```markdown
### fsl_guide

Returns authoring guidance as markdown, straight from the server - no
out-of-band primer pasting needed.

- `topic: "language"` - the full FSL primer. Call it before writing FSL for
  the first time; in our evals this guidance moved weak models from 60% to
  100% correctness.
- `topic: "flowcharts"` - the flowchart idiom: decision diamonds with labeled
  branches, terminals, failure paths on `~>`, layout, and a worked example.

This is the one tool that takes no FSL source; it cannot fail and does not
touch the parser.
```

- [ ] **Step 5: Commit**

```bash
git add src/ts/server.ts src/ts/e2e/server.spec.ts base_README.md
git commit -m "feat(server): fsl_guide tool serves language and flowchart guidance"
```
