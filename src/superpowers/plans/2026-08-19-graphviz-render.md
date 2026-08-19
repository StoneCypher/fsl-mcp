# graphviz_render Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `graphviz_render`, an eighth MCP tool that renders arbitrary graphviz DOT to SVG, PNG, or JPEG, plus a `graphviz` topic for `fsl_guide`.

**Architecture:** A standalone `src/ts/tools/graphviz.ts` calls viz-js's non-throwing `render()` to get an SVG, short-circuiting on failure with structured errors, then hands the known-good SVG to jssm's `rasterize` for raster formats. It never imports `analyze`, and never calls a throwing viz API.

**Tech Stack:** TypeScript (strict, `isolatedDeclarations`, `exactOptionalPropertyTypes`), `@viz-js/viz`, `jssm/cli`, zod, vitest, fast-check, rollup.

## Global Constraints

- Spec: `src/superpowers/spec/2026-08-19-graphviz-render-design.md`.
- `isolatedDeclarations`: every export needs an explicit return type.
- `exactOptionalPropertyTypes`: set optional keys conditionally (`if (x !== undefined) obj.k = x;`). Never assign `undefined`.
- `noUncheckedIndexedAccess` + nodenext: relative imports need the `.js` extension.
- eslint is `strictTypeChecked` + `stylisticTypeChecked`: no `!` non-null assertions. Test files are eslint-ignored.
- Unit coverage gate is 100% on all four metrics, enforced via `coverage.thresholds` in `vitest.config.ts`. It is real, not decorative.
- No fake tests. A test must exercise real behavior, not assert output it generated itself.
- Never edit `README.md`; edit `base_README.md`. The build overwrites `README.md`.
- Never edit `src/ts/tools/guide-content.ts`; it is generated.
- Every runtime dependency stays EXTERNAL in the rollup bundles, with a bare-name entry AND a subpath regex, both moved together.
- `dist/` is tracked. A source change that alters the bundles must commit the rebuilt `dist/`.
- `dist/bin.mjs` is tens of KB. If it reaches hundreds, a dependency was inlined.
- Tool name is `graphviz_render`. Input parameter is `dot`.
- Defaults: `engine` is `'dot'`, `format` is `'svg'`.
- One command per shell invocation. No `&&`, `||`, `;`, or pipes.

---

### Task 1: Export `rasterize` from jssm/cli

**Repository:** StoneCypher/jssm, NOT fsl-mcp. This task gates Task 3 only. Tasks 2, 5, 6, and 7 do not depend on it.

**Files:**
- Modify: `src/ts/cli/lib.ts` (the export list; exact line found by searching for the existing `export {` block)
- Modify: `rollup.config.cli.js` only if the export list is duplicated there
- Test: jssm's existing cli spec directory

**Interfaces:**
- Produces: `rasterize(svg: string, target: 'png' | 'jpeg' | 'gif', opts: { width?: number; height?: number; scale?: number; quality?: number }): Promise<Uint8Array>`, exported from `jssm/cli`, with its type surfaced in `jssm.cli.d.ts`.

- [ ] **Step 1: Locate the function and the export list**

Run: `grep -n "async function rasterize" src/ts/cli/lib.ts`
Run: `grep -n "^export {" src/ts/cli/lib.ts`

Expected: `rasterize` is defined but absent from the export list.

- [ ] **Step 2: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { rasterize } from '../../dist/cli/lib.mjs';

describe('rasterize is public', () => {
  it('converts an svg string to png bytes', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">'
              + '<rect width="10" height="10" fill="red"/></svg>';
    const bytes = await rasterize(svg, 'png', {});
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    // PNG magic number
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Expected: FAIL with an import error, because `rasterize` is not exported.

- [ ] **Step 4: Add `rasterize` to the export list**

Add the identifier to the existing `export { ... }` statement, alphabetically among its neighbours. Do not change the function body.

- [ ] **Step 5: Rebuild and re-run**

Run: `npm run make_cli`
Run: `npx vitest run <path to the new spec>`

Expected: PASS, and `jssm.cli.d.ts` now declares `rasterize`.

- [ ] **Step 6: Commit**

```bash
git add src/ts/cli/lib.ts
git commit -m "feat(cli): export rasterize so consumers can rasterize their own svg"
```

- [ ] **Step 7: Release**

Open the PR, get it merged, and publish. Note the released version; Task 3 raises fsl-mcp's floor to it.

---

### Task 2: `graphvizRender` SVG path

This task also performs the dependency and bundling work, because this is the first code that imports viz-js and the bundling change is meaningless without it.

**Files:**
- Create: `src/ts/tools/graphviz.ts`
- Modify: `package.json` (dependencies)
- Modify: `rollup.config.js:35-43` (the `external` array)
- Test: `src/ts/tests/graphviz.spec.ts`

**Interfaces:**
- Produces: everything in the type block below, plus `graphvizRender`. Task 3 extends it, Task 4 registers it, Task 5 property-tests it.

- [ ] **Step 1: Add the dependency**

Run: `npm install @viz-js/viz`

- [ ] **Step 2: Add BOTH external entries**

Modify the `external` array in `rollup.config.js`. It currently reads:

```js
const external = [
  'jssm',
  'jssm/viz',
  'jssm/cli',
  '@modelcontextprotocol/server',
  /^@modelcontextprotocol\/server\//,
  'zod',
  /^node:/
];
```

Change it to:

```js
const external = [
  'jssm',
  'jssm/viz',
  'jssm/cli',
  '@modelcontextprotocol/server',
  /^@modelcontextprotocol\/server\//,
  '@viz-js/viz',
  /^@viz-js\//,
  'zod',
  /^node:/
];
```

Both entries, together. The comment above the array already explains why the regex is load-bearing; `@viz-js/viz` was previously safe only because nothing imported it directly.

- [ ] **Step 3: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { graphvizRender } from '../tools/graphviz.js';

describe('graphvizRender, svg', () => {

  it('renders a trivial digraph', async () => {
    const r = await graphvizRender('digraph { a -> b; }');
    expect(r.valid).toBe(true);
    if (r.valid && 'svg' in r) {
      expect(r.svg).toContain('<svg');
      expect(r.svg).toContain('</svg>');
    }
  });

  it('lays out with the requested engine', async () => {
    const dotEngine   = await graphvizRender('graph { a -- b; b -- c; c -- a; }', 'dot');
    const neatoEngine = await graphvizRender('graph { a -- b; b -- c; c -- a; }', 'neato');
    expect(dotEngine.valid).toBe(true);
    expect(neatoEngine.valid).toBe(true);
    if (dotEngine.valid && 'svg' in dotEngine && neatoEngine.valid && 'svg' in neatoEngine) {
      // different layout engines produce different geometry for the same graph
      expect(dotEngine.svg).not.toEqual(neatoEngine.svg);
    }
  });

  it('returns structured errors for invalid dot rather than throwing', async () => {
    const r = await graphvizRender('digraph { a -> ');
    expect(r.valid).toBe(false);
    if (!r.valid && 'errors' in r) {
      expect(r.errors.length).toBeGreaterThan(0);
      expect(r.errors[0]?.message).toBeTypeOf('string');
      expect(r.errors[0]?.level).toBe('error');
    }
  });

  it('surfaces graphviz warnings on an otherwise successful render', async () => {
    const stubViz = () => Promise.resolve({
      render: () => ({
        status : 'success' as const,
        output : '<svg></svg>',
        errors : [{ level: 'warning' as const, message: 'unknown attribute' }],
      }),
    });
    const r = await graphvizRender('digraph { a }', 'dot', 'svg', {}, { viz: stubViz });
    expect(r.valid).toBe(true);
    if (r.valid && 'warnings' in r) { expect(r.warnings).toEqual(['unknown attribute']); }
  });

  it('omits the warnings key entirely when there are none', async () => {
    const r = await graphvizRender('digraph { a -> b; }');
    expect(r.valid).toBe(true);
    expect('warnings' in r).toBe(false);
  });

  it('returns a failure result when the viz factory throws', async () => {
    const boom = () => Promise.reject(new Error('wasm failed to load'));
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'svg', {}, { viz: boom });
    expect(r.valid).toBe(false);
    if (!r.valid && 'error' in r) { expect(r.error).toBe('wasm failed to load'); }
  });

});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx vitest run src/ts/tests/graphviz.spec.ts`
Expected: FAIL, cannot resolve `../tools/graphviz.js`.

- [ ] **Step 5: Write the implementation**

```ts
import { instance } from '@viz-js/viz';

/** Graphviz layout engines exposed by this tool. */
export type GraphvizEngine = 'dot' | 'neato' | 'fdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';

/** Output formats this tool can produce. */
export type GraphvizFormat = 'svg' | 'png' | 'jpeg';

/** One diagnostic from graphviz, normalized so `level` is always present. */
export interface GraphvizDiagnostic {
  level   : 'error' | 'warning';
  message : string;
}

/** Raster-only tuning knobs; ignored for `svg`. */
export interface GraphvizRasterOptions {
  /** Fit raster output to this pixel width. */
  width?   : number;
  /** Fit raster output to this pixel height. */
  height?  : number;
  /** Raster zoom percentage. */
  scale?   : number;
  /** JPEG quality 1-100; ignored for other formats. Defaults to 85 downstream. */
  quality? : number;
}

/** viz-js's non-throwing render surface, narrowed to what this tool uses. */
export type VizRenderer = (
  dot     : string,
  options : { engine?: string; format?: string },
) =>
  | { status: 'success'; output: string;    errors: { level?: 'error' | 'warning'; message: string }[] }
  | { status: 'failure'; output: undefined; errors: { level?: 'error' | 'warning'; message: string }[] };

/** Produces a viz instance; `@viz-js/viz`'s `instance` by default. */
export type VizFactory = () => Promise<{ render: VizRenderer }>;

/** SVG-to-pixels; jssm/cli's `rasterize` by default. Wired up in Task 3. */
export type Rasterizer = (
  svg    : string,
  target : 'png' | 'jpeg',
  opts   : Record<string, number>,
) => Promise<Uint8Array>;

/** Injectable collaborators, so error paths are reachable without wasm. */
export interface GraphvizDeps {
  viz?    : VizFactory;
  raster? : Rasterizer;
}

/** Successful SVG render. */
export interface GraphvizSvg {
  valid      : true;
  format     : 'svg';
  svg        : string;
  warnings?  : string[];
}

/** Returned when the DOT source does not compile. */
export interface GraphvizError {
  valid  : false;
  errors : GraphvizDiagnostic[];
}

/** Returned when rendering itself fails. */
export interface GraphvizFailure {
  valid : false;
  error : string;
}

/** Normalize a viz diagnostic; viz makes `level` optional, we do not. */
function normalize(e: { level?: 'error' | 'warning'; message: string }): GraphvizDiagnostic {
  return { level: e.level ?? 'error', message: e.message };
}

/** Render an unknown thrown value as a string. */
function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : JSON.stringify(err);
}

/**
 * Render graphviz DOT source to a diagram. Uses viz-js's non-throwing
 * `render()`, so invalid DOT comes back as structured errors rather than an
 * exception, and the rasterizer is only ever handed an SVG graphviz already
 * produced successfully.
 *
 * @param dot - graphviz DOT source text
 * @param engine - layout engine; default `'dot'`
 * @param format - output format; default `'svg'`
 * @param options - raster tuning knobs; ignored for `'svg'`
 * @param deps - injectable collaborators, for tests
 * @returns an SVG result, a diagnostics result, or a failure
 * @throws never - all failures are returned as values
 *
 * @example
 *   await graphvizRender('digraph { a -> b; }')
 *   // => { valid: true, format: 'svg', svg: '<svg ...' }
 * @example
 *   await graphvizRender('digraph { a -> ')
 *   // => { valid: false, errors: [ { level: 'error', message: 'syntax error ...' } ] }
 */
export async function graphvizRender(
  dot     : string,
  engine  : GraphvizEngine        = 'dot',
  format  : GraphvizFormat        = 'svg',
  options : GraphvizRasterOptions = {},
  deps    : GraphvizDeps          = {},
): Promise<GraphvizSvg | GraphvizError | GraphvizFailure> {

  const makeViz = deps.viz ?? (instance as VizFactory);

  let result: ReturnType<VizRenderer>;

  try {
    const viz = await makeViz();
    result = viz.render(dot, { engine, format: 'svg' });
  } catch (err: unknown) {
    return { valid: false, error: messageOf(err) };
  }

  if (result.status === 'failure') {
    return { valid: false, errors: result.errors.map(normalize) };
  }

  const warnings = result.errors.map((e) => e.message);
  const out: GraphvizSvg = { valid: true, format: 'svg', svg: result.output };
  if (warnings.length > 0) { out.warnings = warnings; }
  return out;

}
```

Note: `options` and `format` are accepted but unused until Task 3. If eslint objects to the unused parameters before Task 3 lands, complete Tasks 2 and 3 back to back rather than suppressing the warning.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/ts/tests/graphviz.spec.ts`
Expected: PASS, all six.

- [ ] **Step 7: Verify the bundle did not swallow viz-js**

Run: `npm run build`
Run: `ls -l dist/bin.mjs`

Expected: still tens of KB, in the same ballpark as the 63 KB it was at v0.7.0. Hundreds of KB or megabytes means Step 2 did not take, and the wasm build got inlined. Stop and fix before continuing.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json rollup.config.js src/ts/tools/graphviz.ts src/ts/tests/graphviz.spec.ts
git commit -m "feat(graphviz): render DOT to svg via viz-js, non-throwing"
```

---

### Task 3: Raster formats and the unsupported degrade

**Files:**
- Modify: `src/ts/tools/graphviz.ts`
- Modify: `package.json` (raise the jssm floor to the Task 1 release)
- Test: `src/ts/tests/graphviz.spec.ts`

**Interfaces:**
- Consumes: `rasterize` from `jssm/cli` (Task 1), and everything Task 2 produced.
- Produces: `GraphvizImage`, `GraphvizUnsupported`, and a widened `graphvizRender` return union.

- [ ] **Step 1: Raise the jssm floor**

Run: `npm install jssm@^<version released in Task 1>`

- [ ] **Step 2: Write the failing tests**

```ts
describe('graphvizRender, raster', () => {

  it('produces png bytes with the right magic number', async () => {
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'png');
    expect(r.valid).toBe(true);
    if (r.valid && 'bytes' in r) {
      expect(r.mimeType).toBe('image/png');
      expect(Array.from(r.bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    }
  });

  it('produces jpeg bytes with the right magic number', async () => {
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'jpeg');
    expect(r.valid).toBe(true);
    if (r.valid && 'bytes' in r) {
      expect(r.mimeType).toBe('image/jpeg');
      expect(Array.from(r.bytes.slice(0, 3))).toEqual([0xff, 0xd8, 0xff]);
    }
  });

  it('forwards only the defined raster options', async () => {
    let seen: Record<string, number> | undefined;
    const spy: Rasterizer = (_svg, _target, opts) => {
      seen = opts;
      return Promise.resolve(new Uint8Array([1]));
    };
    await graphvizRender('digraph { a -> b; }', 'dot', 'png', { width: 640 }, { raster: spy });
    expect(seen).toEqual({ width: 640 });
  });

  it('degrades to svg when no rasterizer backend exists', async () => {
    const noBackend: Rasterizer = () => Promise.reject(new RasterizationUnsupportedError('nope'));
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'png', {}, { raster: noBackend });
    expect(r.valid).toBe(true);
    if (r.valid && 'note' in r) {
      expect(r.svg).toContain('<svg');
      expect(r.note).toContain('no raster backend');
    }
  });

  it('returns a failure when the rasterizer throws anything else', async () => {
    const boom: Rasterizer = () => Promise.reject(new Error('canvas exploded'));
    const r = await graphvizRender('digraph { a -> b; }', 'dot', 'png', {}, { raster: boom });
    expect(r.valid).toBe(false);
    if (!r.valid && 'error' in r) { expect(r.error).toBe('canvas exploded'); }
  });

  it('never reaches the rasterizer when the dot is invalid', async () => {
    let called = false;
    const spy: Rasterizer = () => { called = true; return Promise.resolve(new Uint8Array()); };
    const r = await graphvizRender('digraph { a -> ', 'dot', 'png', {}, { raster: spy });
    expect(r.valid).toBe(false);
    expect(called).toBe(false);
  });

});
```

The last test is the one that proves the guard. Keep it.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/ts/tests/graphviz.spec.ts`
Expected: the six new tests FAIL; Task 2's six still PASS.

- [ ] **Step 4: Extend the implementation**

Add these imports at the top of `src/ts/tools/graphviz.ts`:

```ts
import { rasterize, RasterizationUnsupportedError } from 'jssm/cli';
```

Re-export the error class so tests and callers can detect the degrade path:

```ts
export { RasterizationUnsupportedError };
```

Add these types:

```ts
/** Successful raster render; bytes are the encoded image. */
export interface GraphvizImage {
  valid     : true;
  format    : 'png' | 'jpeg';
  mimeType  : 'image/png' | 'image/jpeg';
  bytes     : Uint8Array;
  warnings? : string[];
}

/** Raster requested but no rasterizer backend exists: the SVG plus a note. */
export interface GraphvizUnsupported {
  valid  : true;
  format : 'png' | 'jpeg';
  svg    : string;
  note   : string;
}

const MIME = {
  png  : 'image/png',
  jpeg : 'image/jpeg',
} as const;

/** Copy only the defined raster options (exactOptionalPropertyTypes-safe). */
function definedOptions(options: GraphvizRasterOptions): Record<string, number> {
  const out: Record<string, number> = {};
  if (options.width   !== undefined) { out['width']   = options.width; }
  if (options.height  !== undefined) { out['height']  = options.height; }
  if (options.scale   !== undefined) { out['scale']   = options.scale; }
  if (options.quality !== undefined) { out['quality'] = options.quality; }
  return out;
}
```

Widen the return type to:

```ts
Promise<GraphvizSvg | GraphvizImage | GraphvizUnsupported | GraphvizError | GraphvizFailure>
```

And replace the tail of the function, everything after `const warnings = ...`, with:

```ts
  const svg = result.output;

  if (format === 'svg') {
    const out: GraphvizSvg = { valid: true, format: 'svg', svg };
    if (warnings.length > 0) { out.warnings = warnings; }
    return out;
  }

  const rasterFn = deps.raster ?? (rasterize as Rasterizer);

  try {
    const bytes = await rasterFn(svg, format, definedOptions(options));
    const out: GraphvizImage = { valid: true, format, mimeType: MIME[format], bytes };
    if (warnings.length > 0) { out.warnings = warnings; }
    return out;
  } catch (err: unknown) {
    if (err instanceof RasterizationUnsupportedError) {
      return {
        valid  : true,
        format,
        svg,
        note   : 'no raster backend available in this runtime; returning the svg instead.',
      };
    }
    return { valid: false, error: messageOf(err) };
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/ts/tests/graphviz.spec.ts`
Expected: PASS, all twelve.

- [ ] **Step 6: Check coverage on this file**

Run: `npm run test`

Expected: 100% on all four metrics. If a branch is uncovered, add the test rather than an ignore comment.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/ts/tools/graphviz.ts src/ts/tests/graphviz.spec.ts
git commit -m "feat(graphviz): add png and jpeg output with the no-backend degrade"
```

---

### Task 4: Register the tool

**Files:**
- Modify: `src/ts/server.ts` (imports, the `renderResult` helper's type, a new `registerTool` block)
- Modify: `src/ts/index.ts` (re-export the public types)
- Test: `src/ts/e2e/server.spec.ts`

**Interfaces:**
- Consumes: `graphvizRender` and its result types from Task 3.
- Produces: an eighth entry in `tools/list`, named `graphviz_render`.

- [ ] **Step 1: Write the failing e2e test**

Add to `src/ts/e2e/server.spec.ts`, following the shape of the existing tool tests in that file:

```ts
it('lists graphviz_render', async () => {
  const { tools } = await client.listTools();
  expect(tools.map((t) => t.name)).toContain('graphviz_render');
});

it('renders dot through graphviz_render', async () => {
  const res = await client.callTool({
    name      : 'graphviz_render',
    arguments : { dot: 'digraph { a -> b; }' },
  });
  const text = (res.content as { type: string; text: string }[])[0]?.text ?? '';
  const parsed = JSON.parse(text) as { valid: boolean; svg: string };
  expect(parsed.valid).toBe(true);
  expect(parsed.svg).toContain('<svg');
});

it('returns diagnostics for invalid dot through graphviz_render', async () => {
  const res = await client.callTool({
    name      : 'graphviz_render',
    arguments : { dot: 'digraph { a -> ' },
  });
  const text = (res.content as { type: string; text: string }[])[0]?.text ?? '';
  const parsed = JSON.parse(text) as { valid: boolean; errors: unknown[] };
  expect(parsed.valid).toBe(false);
  expect(parsed.errors.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ts/e2e/server.spec.ts`
Expected: FAIL, tool not found.

- [ ] **Step 3: Widen `renderResult`**

`server.ts:45` currently reads:

```ts
function renderResult(r: Awaited<ReturnType<typeof fslRender>>): {
```

Change the parameter type to accept both tools' unions:

```ts
function renderResult(
  r: Awaited<ReturnType<typeof fslRender>> | Awaited<ReturnType<typeof graphvizRender>>,
): {
```

The body needs no change: `r.valid && 'bytes' in r` is structural and already correct for both.

- [ ] **Step 4: Register the tool**

Add the import:

```ts
import { graphvizRender } from './tools/graphviz.js';
```

Add the registration after the `fsl_render` block:

```ts
  server.registerTool('graphviz_render',
    { description: 'Renders graphviz DOT source to a diagram. Takes DOT, not FSL - use fsl_render for FSL. format "svg" (default) returns SVG text; "png" and "jpeg" return image bytes. engine selects the graphviz layout algorithm: "dot" (default, hierarchical), "neato" and "fdp" (force-directed), "circo" (circular), "twopi" (radial), "osage", "patchwork". Invalid DOT returns structured diagnostics rather than failing.',
      inputSchema: z.object({
        dot     : z.string(),
        engine  : z.enum(['dot', 'neato', 'fdp', 'circo', 'twopi', 'osage', 'patchwork']).optional(),
        format  : z.enum(['svg', 'png', 'jpeg']).optional(),
        width   : z.number().optional(),
        height  : z.number().optional(),
        scale   : z.number().optional(),
        quality : z.number().optional(),
      }) },
    async ({ dot, engine, format, width, height, scale, quality }) => {
      const options: GraphvizRasterOptions = {};
      if (width   !== undefined) { options.width   = width; }
      if (height  !== undefined) { options.height  = height; }
      if (scale   !== undefined) { options.scale   = scale; }
      if (quality !== undefined) { options.quality = quality; }
      return renderResult(await graphvizRender(dot, engine, format, options));
    });
```

Import `GraphvizRasterOptions` as a type alongside `graphvizRender`.

- [ ] **Step 5: Re-export the public types**

Add the new types to `src/ts/index.ts` alongside the existing render type exports, so consumers of the library API can name them.

- [ ] **Step 6: Run to verify it passes**

Run: `npx vitest run src/ts/e2e/server.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ts/server.ts src/ts/index.ts src/ts/e2e/server.spec.ts
git commit -m "feat(server): register graphviz_render as the eighth tool"
```

---

### Task 5: Stochastic properties

**Files:**
- Create: `src/ts/tests/graphviz.stoch.ts`

**Interfaces:**
- Consumes: `graphvizRender` from Task 3.

- [ ] **Step 1: Write the property tests**

```ts
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { graphvizRender } from '../tools/graphviz.js';

describe('graphvizRender properties', () => {

  it('never throws, for any input string whatsoever', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (junk) => {
        const r = await graphvizRender(junk);
        expect(typeof r.valid).toBe('boolean');
      }),
      { numRuns: 250 },
    );
  });

  it('renders any well-formed digraph over simple identifiers', async () => {
    const ident = fc.stringMatching(/^[a-z][a-z0-9]{0,7}$/);
    await fc.assert(
      fc.asyncProperty(fc.array(fc.tuple(ident, ident), { minLength: 1, maxLength: 8 }), async (edges) => {
        const body = edges.map(([a, b]) => `${a} -> ${b};`).join(' ');
        const r = await graphvizRender(`digraph { ${body} }`);
        expect(r.valid).toBe(true);
        if (r.valid && 'svg' in r) { expect(r.svg).toContain('</svg>'); }
      }),
      { numRuns: 100 },
    );
  });

  it('every rendered node identifier appears in the svg output', async () => {
    const ident = fc.stringMatching(/^[a-z][a-z0-9]{0,7}$/);
    await fc.assert(
      fc.asyncProperty(ident, ident, async (a, b) => {
        fc.pre(a !== b);
        const r = await graphvizRender(`digraph { ${a} -> ${b}; }`);
        expect(r.valid).toBe(true);
        if (r.valid && 'svg' in r) {
          expect(r.svg).toContain(a);
          expect(r.svg).toContain(b);
        }
      }),
      { numRuns: 100 },
    );
  });

});
```

The first property is the important one. `viz.render` runs a wasm graphviz build, so arbitrary input is a path into compiled C, and this is the shape of test that finds a panic the type system cannot.

- [ ] **Step 2: Run the stochastic suite**

Run: `npx vitest run --config vitest-stoch.config.ts src/ts/tests/graphviz.stoch.ts`
Expected: PASS. If the first property fails, that is a real finding; capture the seed and the counterexample before changing anything.

- [ ] **Step 3: Commit**

```bash
git add src/ts/tests/graphviz.stoch.ts
git commit -m "test(graphviz): property tests, including never-throws over arbitrary input"
```

---

### Task 6: The graphviz guide topic

**Files:**
- Create: `src/prompts/graphviz-primer.md`
- Modify: `src/build_js/generate_guide_content.js`
- Modify: `src/ts/server.ts` (the `fsl_guide` topic enum and dispatch)
- Test: `src/ts/tests/guide.spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `GUIDE_GRAPHVIZ`, a generated export in `src/ts/tools/guide-content.ts`.

- [ ] **Step 1: Write the primer**

Create `src/prompts/graphviz-primer.md`. Use `src/prompts/fsl-llms-draft.md` as the model for tone and rigor: every claim verified against a specific version, no syntax imported from other DSLs, a worked example section where each example is a complete document that renders on its own.

Cover, at minimum: graph vs digraph and the matching edge operators; node and edge attribute syntax; the attributes that actually matter (`label`, `shape`, `color`, `style`, `rankdir`); clusters and the `cluster_` name prefix requirement; record and HTML-like labels; ranking with `rank=same`; and when to reach for each layout engine.

State the graphviz version. Get it from `viz.graphvizVersion` at runtime rather than guessing:

Run: `node -e "import('@viz-js/viz').then(async v => console.log((await v.instance()).graphvizVersion))"`

- [ ] **Step 2: Write the failing test**

Add to `src/ts/tests/guide.spec.ts`:

```ts
it('returns graphviz guidance for the graphviz topic', () => {
  expect(GUIDE_GRAPHVIZ).toContain('digraph');
  expect(GUIDE_GRAPHVIZ.length).toBeGreaterThan(1000);
});

it('keeps the graphviz guide out of the fsl language topic', () => {
  expect(GUIDE_LANGUAGE).not.toContain('rankdir');
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/ts/tests/guide.spec.ts`
Expected: FAIL, `GUIDE_GRAPHVIZ` is not exported.

- [ ] **Step 4: Extend the generator**

In `src/build_js/generate_guide_content.js`, add the source constant next to the existing two:

```js
const GRAPHVIZ = 'src/prompts/graphviz-primer.md';
```

Read it alongside the others, and add a third emitted export to the generated body:

```js
/** The graphviz DOT authoring primer, verbatim from src/prompts/graphviz-primer.md. */
export const GUIDE_GRAPHVIZ: string = \`${escapeTemplate(graphviz)}\`;
```

Do not append it to `language`. That constant is FSL primer plus flowcharts, and stays that way.

- [ ] **Step 5: Wire up the topic**

In `src/ts/server.ts`, import `GUIDE_GRAPHVIZ`, extend the enum to `z.enum(['flowcharts', 'graphviz', 'language'])`, and replace the ternary with a lookup so a third topic does not nest:

```ts
    ({ topic }) => {
      const bodies = { flowcharts: GUIDE_FLOWCHARTS, graphviz: GUIDE_GRAPHVIZ, language: GUIDE_LANGUAGE };
      return { content: [{ type: 'text' as const, text: bodies[topic] }] };
    });
```

Update the tool description to name the third topic.

- [ ] **Step 6: Regenerate and run**

Run: `node src/build_js/generate_guide_content.js`
Run: `npx vitest run src/ts/tests/guide.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/prompts/graphviz-primer.md src/build_js/generate_guide_content.js src/ts/server.ts src/ts/tools/guide-content.ts src/ts/tests/guide.spec.ts
git commit -m "docs(guide): add a graphviz authoring primer as an fsl_guide topic"
```

---

### Task 7: Documentation, version, and release

**Files:**
- Modify: `base_README.md`
- Modify: `CLAUDE.md`
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Update `base_README.md`**

Change every "seven tools" to "eight tools". Add `graphviz_render` to the tool table with its parameters. Mention the `graphviz` guide topic. Do not touch `README.md`; the build regenerates it.

- [ ] **Step 2: Update `CLAUDE.md`**

Change the tool count from seven to eight and add `graphviz_render` to the opening description.

Then replace the analyze-first rule with its general form. The current text says every authoring tool calls `analyze(source)` first, with two sourceless exceptions. Rewrite so the principle reads:

> Call the non-throwing API first. If it reports errors, return them. Only then touch an API that throws.

and note that `analyze()` (wrapping jssm's `fslDiagnostics()`) and `graphviz_render` (using viz-js's non-throwing `render()` and never `renderString()`) are two instances of it.

Add `@viz-js/viz` to the Dependencies section as a direct runtime dependency, and correct the existing note that says it is not one.

- [ ] **Step 3: Bump the version**

This is a feature, and the project is on major version zero, where breaking changes take the minor slot and features take it too. Bump `0.7.0` to `0.8.0`, and set both `version` fields in `package-lock.json` by hand, since editing `package.json` directly does not sync them.

- [ ] **Step 4: Run the full build**

Run: `npm run build`

No profile flags. The full build is also the test suite. Expected: unit tests pass at 100% coverage on all four metrics, stochastic tests pass, `attw` clean.

- [ ] **Step 5: Verify the bundle one final time**

Run: `ls -l dist/bin.mjs`
Expected: tens of KB.

- [ ] **Step 6: Commit and open the PR**

```bash
git add -u
git commit -m "feat(graphviz): graphviz_render tool and graphviz guide topic; v0.8.0"
```

```bash
git push -u origin feat_26-08-19_graphviz-render
```

Then open the PR against `main`.

---

## Self-Review

**Spec coverage.** Naming, Task 4. Standalone architecture, Task 2. The restated guard, Task 3 step 2's final test plus Task 7 step 2. jssm export, Task 1. viz-js direct dependency and both rollup entries, Task 2. Tool surface and defaults, Tasks 2 through 4. Hardcoded engine enum, Task 4. Data flow, Tasks 2 and 3. All five result types, Tasks 2 and 3. Four error paths, Tasks 2 and 3. `renderResult` widening, Task 4. Unit and stochastic testing, Tasks 2, 3, and 5. Guide topic, Task 6. Documentation obligations, Task 7. Sequencing, Task 1's repository note. No gaps found.

**Placeholders.** The one soft spot is Task 6 Step 1, which describes the primer's required coverage rather than supplying its prose. That is deliberate: it is an authoring task, not a code task, and pre-writing a graphviz primer here would put unverified claims into a plan. The step names the model document, the required topics, and the command that yields the exact version to verify against.

**Type consistency.** `GraphvizEngine`, `GraphvizFormat`, `GraphvizDiagnostic`, `GraphvizRasterOptions`, `VizRenderer`, `VizFactory`, `Rasterizer`, `GraphvizDeps`, `GraphvizSvg`, `GraphvizImage`, `GraphvizUnsupported`, `GraphvizError`, and `GraphvizFailure` are each defined once and referenced under the same names throughout. `graphvizRender`'s parameter order is `(dot, engine, format, options, deps)` in the definition, in every test, and in the Task 4 registration.
