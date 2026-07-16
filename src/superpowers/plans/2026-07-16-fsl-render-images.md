# fsl_render Image Derivation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `fsl_render` returns PNG/JPEG/GIF as real MCP image content blocks (plus DOT as a second text format) so the calling agent can see the machine it wrote.

**Architecture:** Replace render.ts's `fsl_to_svg_string` call with jssm's CLI-surface `render()` engine (probed working: `jssm/cli` resolves; PNG rasterizes via the transitively-installed `@resvg/resvg-wasm`). render.ts keeps the analyze-first gate, gains an injectable engine seam for error-path tests, and returns a widened discriminated union. server.ts gains one narrow special case: `RenderImage` results become an image content block plus a JSON summary text block; every other tool and shape keeps the existing single-text-block path.

**Tech Stack:** TypeScript (strict: isolatedDeclarations, exactOptionalPropertyTypes, noUncheckedIndexedAccess, nodenext `.js` imports), zod, vitest, jssm >= 5.162.10.

## Global Constraints

- Spec: `src/superpowers/spec/2026-07-15-fsl-render-images-design.md`. Deviations locked here: discriminant field stays `valid` (codebase convention; spec's `rendered` is corrected), and engine-throw failures return a NEW `RenderFailure { valid:false, error }` (spec's "RenderError unchanged" keeps RenderError as the diagnostics carrier).
- Zero new dependencies. The raster backend is jssm's own optionalDependency, already installed.
- Analyze-first: `analyze(source)` gates every path; no throwing jssm API sees unvalidated source.
- `html` target is NOT exposed.
- eslint strictTypeChecked: no `!`, no redundant `String()` on strings, wrap numbers in `String()` inside template literals. Every export has an explicit return type and a DocBlock with a one-line summary. Test files are eslint-ignored.
- Coverage gate: 95 on all four metrics, enforced; suite must end green.
- Never edit README.md (generated); edit base_README.md.
- Commits: Conventional Commits; NO Claude-Session trailer; NO "Generated with Claude Code" line.
- Shell discipline for all executors: one command per Bash call - nothing joined by `&&`, `||`, `;`, a pipe, or a newline; nothing between git/npm and their subcommand; no `node -e`; cd standalone.

## File Structure

- `src/ts/tools/render.ts` - rewritten: engine call, widened union, injectable seam. Stays the single render responsibility.
- `src/ts/server.ts` - `renderResult()` helper + updated fsl_render registration.
- `src/ts/index.ts` - re-export the new public types.
- `src/ts/tests/render.spec.ts` - updated + new format/error tests.
- `src/ts/e2e/server.spec.ts` - one new round-trip asserting the image block.
- `base_README.md` - fsl_render section gains the format table and gif example.

---

### Task 1: render.ts - engine swap, formats, seam

**Files:**
- Modify: `src/ts/tools/render.ts` (full rewrite below)
- Modify: `src/ts/index.ts` (type re-exports)
- Test: `src/ts/tests/render.spec.ts`

**Interfaces:**
- Consumes: `analyze`, `hasErrors` from `../analyze.js` (unchanged); `render`, `RasterizationUnsupportedError` from `'jssm/cli'`.
- Produces (Task 2 and 3 rely on these exact names): `RenderFormat`, `RenderRasterOptions`, `RenderSvg`, `RenderDot`, `RenderImage`, `RenderUnsupported`, `RenderFailure`, `RenderError`, `RenderEngine`, and `fslRender(source, format?, options?, engine?)` returning `Promise<RenderSvg | RenderDot | RenderImage | RenderUnsupported | RenderFailure | RenderError>`.

- [ ] **Step 1: Write the failing tests**

Replace the whole of `src/ts/tests/render.spec.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { fslRender, RasterizationUnsupportedError } from '../tools/render.js';

const SRC = 'a -> b;';

describe('fslRender', () => {
  it('renders svg by default (unchanged contract)', async () => {
    const r = await fslRender(SRC);
    expect(r.valid).toBe(true);
    if (r.valid && r.format === 'svg') { expect(r.svg).toContain('<svg'); } else { expect.unreachable(); }
  });

  it('renders dot as text', async () => {
    const r = await fslRender(SRC, 'dot');
    if (r.valid && r.format === 'dot') { expect(r.dot).toContain('digraph'); } else { expect.unreachable(); }
  });

  it('renders a real png with correct magic bytes and mime', async () => {
    const r = await fslRender(SRC, 'png');
    if (r.valid && r.format === 'png' && 'bytes' in r) {
      expect(r.mimeType).toBe('image/png');
      expect(r.bytes[0]).toBe(0x89);
      expect(r.bytes[1]).toBe(0x50);
      expect(r.bytes.length).toBeGreaterThan(100);
    } else { expect.unreachable(); }
  });

  it('honors width for png (IHDR width field)', async () => {
    const r = await fslRender(SRC, 'png', { width: 320 });
    if (r.valid && r.format === 'png' && 'bytes' in r) {
      // PNG IHDR: width is the big-endian uint32 at bytes 16..19
      const w = ((r.bytes[16] ?? 0) << 24) | ((r.bytes[17] ?? 0) << 16) | ((r.bytes[18] ?? 0) << 8) | (r.bytes[19] ?? 0);
      expect(w).toBe(320);
    } else { expect.unreachable(); }
  });

  // NOTE (plan amendment, verified by probe): jssm throws
  // RasterizationUnsupportedError for jpeg in non-Canvas runtimes -
  // resvg-wasm covers png/gif only. So jpeg's byte mapping is tested through
  // the stub engine, and the real engine is held to the degrade contract.
  it('maps jpeg raster results to image/jpeg (stub engine)', async () => {
    const engine = async () => ({ kind: 'raster' as const, buffer: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) });
    const r = await fslRender(SRC, 'jpeg', {}, engine);
    if (r.valid && r.format === 'jpeg' && 'bytes' in r) {
      expect(r.mimeType).toBe('image/jpeg');
      expect(r.bytes[0]).toBe(0xff);
      expect(r.bytes[1]).toBe(0xd8);
    } else { expect.unreachable(); }
  });

  it('jpeg with the real engine never hard-fails: real bytes or svg degrade', async () => {
    const r = await fslRender(SRC, 'jpeg');
    expect(r.valid).toBe(true);
    if (r.valid && 'bytes' in r) {
      expect(r.mimeType).toBe('image/jpeg');
    } else if (r.valid && 'note' in r) {
      expect(r.svg).toContain('<svg');
      expect(r.note).toContain('raster');
    } else { expect.unreachable(); }
  });

  it('renders a real gif (GIF8 header), bounded frames', async () => {
    const r = await fslRender(SRC, 'gif', { maxFrames: 2 });
    if (r.valid && r.format === 'gif' && 'bytes' in r) {
      expect(r.mimeType).toBe('image/gif');
      const head = String.fromCharCode(r.bytes[0] ?? 0, r.bytes[1] ?? 0, r.bytes[2] ?? 0, r.bytes[3] ?? 0);
      expect(head).toBe('GIF8');
    } else { expect.unreachable(); }
  });

  it('short-circuits invalid source with diagnostics for every format', async () => {
    for (const format of ['svg', 'dot', 'png', 'jpeg', 'gif'] as const) {
      const r = await fslRender('a -> ;', format);
      expect(r.valid).toBe(false);
      if (!r.valid && 'diagnostics' in r) { expect(r.diagnostics.length).toBeGreaterThan(0); } else { expect.unreachable(); }
    }
  });

  it('degrades to svg-plus-note when the raster backend is unavailable', async () => {
    let calls = 0;
    const engine = async (fsl: string, opts: Record<string, unknown>) => {
      calls++;
      if (opts.target === 'png') { throw new RasterizationUnsupportedError('no backend'); }
      return { kind: 'text' as const, content: '<svg>stub</svg>' };
    };
    const r = await fslRender(SRC, 'png', {}, engine);
    if (r.valid && 'note' in r) {
      expect(r.format).toBe('png');
      expect(r.svg).toContain('<svg');
      expect(r.note).toContain('raster');
      expect(calls).toBe(2);
    } else { expect.unreachable(); }
  });

  it('returns RenderFailure on any other engine throw', async () => {
    const engine = async () => { throw new Error('viz exploded'); };
    const r = await fslRender(SRC, 'svg', {}, engine);
    if (!r.valid && 'error' in r) { expect(r.error).toContain('viz exploded'); } else { expect.unreachable(); }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ts/tests/render.spec.ts`
Expected: FAIL - `RasterizationUnsupportedError` is not exported from `../tools/render.js`, and png returns the old degrade-note shape.

- [ ] **Step 3: Implement**

Replace the whole of `src/ts/tools/render.ts` with:

```ts
import { render as jssmRender, RasterizationUnsupportedError } from 'jssm/cli';
import { analyze, hasErrors } from '../analyze.js';
import type { FslDiagnostic } from '../types.js';

export { RasterizationUnsupportedError };

/** Requested render format: two text targets and three raster targets. */
export type RenderFormat = 'svg' | 'dot' | 'png' | 'jpeg' | 'gif';

/** Raster-only tuning knobs, forwarded verbatim to jssm's render engine. */
export interface RenderRasterOptions {
  /** Fit raster output to this pixel width. */
  width?: number;
  /** Fit raster output to this pixel height. */
  height?: number;
  /** Raster zoom percentage; 100 = 3x natural size. */
  scale?: number;
  /** JPEG quality 1-100; ignored for other formats. */
  quality?: number;
  /** GIF per-frame delay in centiseconds; ignored for other formats. */
  delay?: number;
  /** GIF walk-length frame ceiling; ignored for other formats. */
  maxFrames?: number;
}

/** The engine contract: jssm/cli's render(), injectable for error-path tests. */
export type RenderEngine = (
  fsl: string,
  opts: Record<string, unknown>,
) => Promise<{ kind: 'text'; content: string } | { kind: 'raster'; buffer: Uint8Array }>;

/** Successful SVG render. */
export interface RenderSvg {
  valid  : true;
  format : 'svg';
  svg    : string;
}

/** Successful DOT (graphviz source) render. */
export interface RenderDot {
  valid  : true;
  format : 'dot';
  dot    : string;
}

/** Successful raster render; bytes are the encoded image. */
export interface RenderImage {
  valid    : true;
  format   : 'png' | 'jpeg' | 'gif';
  mimeType : 'image/png' | 'image/jpeg' | 'image/gif';
  bytes    : Uint8Array;
}

/** Raster requested but no rasterizer backend exists: the SVG plus a note. */
export interface RenderUnsupported {
  valid  : true;
  format : 'png' | 'jpeg' | 'gif';
  svg    : string;
  note   : string;
}

/** Returned instead of a diagram when the source does not compile. */
export interface RenderError {
  valid       : false;
  diagnostics : FslDiagnostic[];
}

/** Returned when the render engine itself fails at render time. */
export interface RenderFailure {
  valid : false;
  error : string;
}

const MIME = {
  png  : 'image/png',
  jpeg : 'image/jpeg',
  gif  : 'image/gif',
} as const;

/** Copy only the defined raster options (exactOptionalPropertyTypes-safe). */
function definedOptions(options: RenderRasterOptions): Record<string, number> {
  const out: Record<string, number> = {};
  if (options.width     !== undefined) { out.width     = options.width; }
  if (options.height    !== undefined) { out.height    = options.height; }
  if (options.scale     !== undefined) { out.scale     = options.scale; }
  if (options.quality   !== undefined) { out.quality   = options.quality; }
  if (options.delay     !== undefined) { out.delay     = options.delay; }
  if (options.maxFrames !== undefined) { out.maxFrames = options.maxFrames; }
  return out;
}

/**
 * Render FSL source to a diagram. `svg` (default) and `dot` return text;
 * `png`, `jpeg`, and `gif` return real encoded image bytes (the gif animates a
 * random walk). When a raster format is requested but no rasterizer backend is
 * available, degrades to the SVG plus a note. Invalid source yields
 * diagnostics and is never handed to the render engine.
 *
 * @param source - the FSL source text
 * @param format - one of `'svg' | 'dot' | 'png' | 'jpeg' | 'gif'`; default `'svg'`
 * @param options - raster tuning knobs; ignored for text formats
 * @param engine - render engine, injectable for tests; defaults to jssm/cli's
 * @returns a text result, an image result, a degraded result, or a failure
 * @throws never - all failures are returned as values
 *
 * @example
 *   await fslRender('a -> b;')                          // => { valid: true, format: 'svg', svg: '<svg ...' }
 * @example
 *   await fslRender('a -> b;', 'png', { width: 640 })   // => { valid: true, format: 'png', mimeType: 'image/png', bytes: Uint8Array }
 */
export async function fslRender(
  source: string,
  format: RenderFormat = 'svg',
  options: RenderRasterOptions = {},
  engine: RenderEngine = jssmRender as RenderEngine,
): Promise<RenderSvg | RenderDot | RenderImage | RenderUnsupported | RenderFailure | RenderError> {
  const diagnostics = analyze(source);
  if (hasErrors(diagnostics)) { return { valid: false, diagnostics }; }

  try {
    const result = await engine(source, { target: format, ...definedOptions(options) });

    if (result.kind === 'text') {
      if (format === 'dot') { return { valid: true, format: 'dot', dot: result.content }; }
      return { valid: true, format: 'svg', svg: result.content };
    }

    const raster = format as 'png' | 'jpeg' | 'gif';
    return { valid: true, format: raster, mimeType: MIME[raster], bytes: result.buffer };
  } catch (err: unknown) {
    if (err instanceof RasterizationUnsupportedError && (format === 'png' || format === 'jpeg' || format === 'gif')) {
      try {
        const fallback = await engine(source, { target: 'svg' });
        if (fallback.kind === 'text') {
          return {
            valid : true,
            format,
            svg   : fallback.content,
            note  : 'no raster backend available in this runtime; returning the svg instead.',
          };
        }
      } catch { /* fall through to failure below */ }
    }
    return { valid: false, error: err instanceof Error ? err.message : JSON.stringify(err) };
  }
}
```

In `src/ts/index.ts`, extend the existing render re-export lines to:

```ts
export { fslRender } from './tools/render.js';
export type { RenderFormat, RenderRasterOptions, RenderEngine, RenderSvg, RenderDot, RenderImage, RenderUnsupported, RenderFailure, RenderError } from './tools/render.js';
```

(Keep whatever other exports index.ts already has; only the render lines change.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/ts/tests/render.spec.ts`
Expected: PASS, 9/9.

- [ ] **Step 5: Static checks**

Run: `npx tsc --noEmit`
Expected: clean.
Run: `npx eslint src/ts/tools/render.ts src/ts/index.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/ts/tools/render.ts src/ts/index.ts src/ts/tests/render.spec.ts
git commit -m "feat(render): real png/jpeg/gif and dot output via jssm/cli render engine"
```

---

### Task 2: server.ts - image content blocks

**Files:**
- Modify: `src/ts/server.ts`
- Test: `src/ts/tests/server.spec.ts` (one added unit test via the in-memory pattern already used there; if the existing server unit tests live only in e2e, add to `src/ts/e2e/server.spec.ts` in Task 3 instead and keep this task's testing to the compile gate - check which file exists and follow the established location)

**Interfaces:**
- Consumes: Task 1's `fslRender`, `RenderFormat`, `RenderRasterOptions`, and the union member shapes (`'bytes' in r` discriminates `RenderImage`).
- Produces: fsl_render tool responses whose content is `[image, text-summary]` for raster results; unchanged single-text-block responses otherwise.

- [ ] **Step 1: Modify server.ts**

Replace the `fslRender` import line, add the helper below `jsonResult`, and replace the fsl_render registration:

```ts
import { fslRender } from './tools/render.js';
import type { RenderRasterOptions } from './tools/render.js';
```

```ts
/**
 * Wrap a render result: raster results become an MCP image content block plus
 * a JSON text summary; every other shape uses the standard JSON text block.
 */
function renderResult(r: Awaited<ReturnType<typeof fslRender>>): {
  content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[];
} {
  if (r.valid && 'bytes' in r) {
    return {
      content: [
        { type: 'image', data: Buffer.from(r.bytes).toString('base64'), mimeType: r.mimeType },
        { type: 'text', text: JSON.stringify({ valid: true, format: r.format, mimeType: r.mimeType, byteLength: r.bytes.length }, null, 2) },
      ],
    };
  }
  return jsonResult(r);
}
```

```ts
  server.registerTool('fsl_render',
    { description: 'Render FSL to a diagram. format: svg (default) | dot (text) | png | jpeg | gif (returned as an image content block; gif animates a random walk). Raster options: width, height, scale (zoom %, 100 = 3x), quality (jpeg 1-100), delay (gif centiseconds/frame), maxFrames (gif; keep <= 20 for chat).',
      inputSchema: {
        source    : z.string(),
        format    : z.enum(['svg', 'dot', 'png', 'jpeg', 'gif']).optional(),
        width     : z.number().int().positive().optional(),
        height    : z.number().int().positive().optional(),
        scale     : z.number().int().positive().optional(),
        quality   : z.number().int().min(1).max(100).optional(),
        delay     : z.number().int().positive().optional(),
        maxFrames : z.number().int().min(1).max(100).optional(),
      } },
    async ({ source, format, width, height, scale, quality, delay, maxFrames }) => {
      const options: RenderRasterOptions = {};
      if (width     !== undefined) { options.width     = width; }
      if (height    !== undefined) { options.height    = height; }
      if (scale     !== undefined) { options.scale     = scale; }
      if (quality   !== undefined) { options.quality   = quality; }
      if (delay     !== undefined) { options.delay     = delay; }
      if (maxFrames !== undefined) { options.maxFrames = maxFrames; }
      return renderResult(await fslRender(source, format, options));
    });
```

- [ ] **Step 2: Static checks**

Run: `npx tsc --noEmit`
Expected: clean.
Run: `npx eslint src/ts/server.ts`
Expected: clean.

- [ ] **Step 3: Full unit suite**

Run: `npx vitest run --coverage`
Expected: all green; coverage >= 95 on all four metrics. If server.ts's new helper drags function coverage, the Task 3 e2e covers it - re-run the gate at the end of Task 3 before judging.

- [ ] **Step 4: Commit**

```bash
git add src/ts/server.ts
git commit -m "feat(server): fsl_render raster results ship as MCP image content blocks"
```

---

### Task 3: e2e round-trip, docs, gate

**Files:**
- Modify: `src/ts/e2e/server.spec.ts`
- Modify: `base_README.md`

**Interfaces:**
- Consumes: the running server's `fsl_render` tool via the existing PassThrough-stream stdio harness in `e2e/server.spec.ts` (follow its established connect/call pattern exactly).

- [ ] **Step 1: Add the e2e test**

Append to the existing describe block in `src/ts/e2e/server.spec.ts` (reusing its client/transport setup helpers; adapt names to the file's existing pattern):

```ts
it('returns an image content block for png renders', async () => {
  const result = await client.callTool({
    name: 'fsl_render',
    arguments: { source: 'a -> b;', format: 'png', width: 320 },
  });
  const content = result.content as ({ type: string; data?: string; mimeType?: string })[];
  const image = content.find((c) => c.type === 'image');
  expect(image).toBeDefined();
  expect(image?.mimeType).toBe('image/png');
  const bytes = Buffer.from(image?.data ?? '', 'base64');
  expect(bytes[0]).toBe(0x89);
  expect(bytes[1]).toBe(0x50);
  const summary = content.find((c) => c.type === 'text');
  expect(summary).toBeDefined();
});
```

- [ ] **Step 2: Run the suite**

Run: `npx vitest run --coverage`
Expected: all green, coverage gate >= 95 on all four metrics.

- [ ] **Step 3: Update base_README.md**

Locate the fsl_render tool section (grep base_README.md for `fsl_render`) and replace its description with:

```markdown
### fsl_render

Render FSL to a diagram.

| format | returns |
|--------|---------|
| `svg` (default) | SVG text |
| `dot` | Graphviz DOT text |
| `png` / `jpeg` | an MCP image content block (the model can see it) |
| `gif` | an animated random walk as an image content block |

Raster options: `width`, `height`, `scale` (zoom %, 100 = 3x natural), `quality`
(jpeg 1-100), `delay` (gif centiseconds/frame), `maxFrames` (gif frame ceiling -
keep it at or under 20 in chat contexts). PNG and GIF work in plain Node (via
jssm's bundled resvg-wasm); JPEG needs a Canvas-capable runtime and otherwise
degrades to SVG plus a note, as does any raster format when no backend is
available. Invalid source returns diagnostics, as everywhere else.
```

- [ ] **Step 4: Full verification**

Run: `npx vitest run --coverage`
Expected: green, gate passes.
Run: `npx tsc --noEmit`
Expected: clean.
Run: `npx eslint src/ts/e2e/server.spec.ts`
Expected: clean (or note if e2e files are eslint-ignored, matching the repo config).

- [ ] **Step 5: Commit**

```bash
git add src/ts/e2e/server.spec.ts base_README.md
git commit -m "feat(render): e2e image-block round-trip and README format table"
```
