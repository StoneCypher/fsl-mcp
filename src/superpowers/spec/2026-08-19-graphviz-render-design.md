# graphviz_render: exposing the graphviz pipeline directly

**Status:** approved design, not yet implemented
**Date:** 2026-08-19

## Why

fsl-mcp already renders graphviz. It just refuses to let anyone hand it a
graph. `fsl_render` accepts FSL, lowers it to DOT, and draws the result, so
the whole graphviz toolchain is present in the dependency tree and reachable
at runtime, but only ever through the FSL front door.

Three reasons to open the other door:

1. **It is useful on its own.** Rendering DOT is a capability people want
   independent of finite-state machines.
2. **FSL cannot express every graph.** FSL is a state-machine language. A
   caller who needs a cluster layout, a record node, or a radial arrangement
   has no way to ask for it through `fsl_render`, even though the engine
   underneath supports all of it.
3. **Discoverability.** A server that advertises graphviz rendering is
   findable by people searching for graphviz rendering. The FSL tools are not.

## What ships

A single new tool, `graphviz_render`, plus a `graphviz` topic for `fsl_guide`.
Tool count goes from seven to eight.

Explicitly not in this cycle: a `graphviz_validate` tool (redundant, since
`graphviz_render` already returns structured errors for bad DOT) and graphviz
scaffold presets.

## Naming

The tool is `graphviz_render`, not `dot_render`.

"Graphviz" is the term people search and the term that unambiguously names the
capability. "DOT" collides with dotfiles, the dot operator, `.dot` file
extensions, and the Department of Transportation, which is noise both for
search and for a model scanning `tools/list` to decide whether a tool matches
an intent. The input parameter stays `dot`, since that genuinely is the
language's name, so the term is still present and indexed where it is accurate.

## Architecture

A standalone `src/ts/tools/graphviz.ts`, parallel to `render.ts`, sharing no
implementation with it.

The two tools look alike from outside and have almost nothing in common
inside. `fslRender` makes a single call to `jssm/cli`'s `render(fsl, opts)`,
which performs layout and rasterization together and never surfaces an
intermediate SVG. `graphvizRender` makes two calls: `viz.render(dot)` to get
an SVG, then `rasterize(svg)` to get pixels. There is no shared seam to
extract, and manufacturing one would mean changing `fslRender`'s behavior to
render and rasterize in separate passes. The result-shape types resemble each
other because both tools return similar things over the same protocol, not
because they share a mechanism.

`graphviz.ts` never imports `analyze`. FSL diagnostics have nothing to say
about DOT.

### The guard, restated

The contributor brief currently says every authoring tool calls `analyze()`
first, with two sourceless exceptions. `graphviz_render` is a third category:
it has a source, but that source is not FSL. Rather than record it as an
exception, the brief's rule should be restated in the more general form that
was always the actual principle:

> Call the non-throwing API first. If it reports errors, return them. Only
> then touch an API that throws.

`analyze()` is one instance of this: it wraps jssm's non-throwing
`fslDiagnostics()` so that the throwing `from()` and `fsl_to_svg_string()` only
ever see FSL known to compile. `graphviz_render` is a second instance of the
same pattern against a different library.

viz-js ships exactly the same pair of entry points jssm does. `viz.render()`
is documented as not throwing on invalid DOT, returning
`{ status: 'failure', output: undefined, errors: RenderError[] }` instead;
`viz.renderString()` throws. **Use `viz.render()`. Never use
`viz.renderString()`.** A failure short-circuits before the rasterizer is ever
reached, so `rasterize` only ever sees an SVG that graphviz already produced
successfully.

## Dependencies

### Upstream change to jssm, required first

jssm's `dist/cli/lib.mjs` contains a `rasterize(svg, target, opts)` that takes
an **SVG string**, not FSL:

```js
async function rasterize(svg, target, opts) {
  const { canvas } = await loadAndSizeCanvas(svg, opts);
  const blob = await canvas.convertToBlob({
    type: mimeOf(target),
    quality: target === "jpeg" ? (opts.quality ?? 85) / 100 : void 0
  });
  return new Uint8Array(await blob.arrayBuffer());
}
```

The only FSL-specific step in jssm's entire raster pipeline is `svgTarget(fsl)`.
Everything downstream of it is generic. But `jssm.cli.d.ts` exports only
`render`, `renderSet`, `parseFslArgs`, `RenderError`, and
`RasterizationUnsupportedError`; `rasterize` is internal.

jssm should export `rasterize` from `jssm/cli`. The change is additive and
non-breaking. fsl-mcp then consumes it rather than reimplementing roughly
thirty lines of canvas sizing, blob conversion, and resvg wasm initialization
that would immediately begin drifting from jssm's copy.

This also keeps `@resvg/resvg-wasm` out of fsl-mcp's direct dependencies. It
stays jssm's concern, where it already is.

### New direct dependency

`@viz-js/viz`. It is currently present transitively as a jssm optional
dependency; this promotes it to a direct one, because fsl-mcp will now import
it by name.

Per the bundling contract, `rollup.config.js`'s `external` array gains both
entries together:

```js
'@viz-js/viz',
/^@viz-js\//,
```

`dist/` must be rebuilt and committed in the same change. `dist/bin.mjs` must
remain in the tens of KB; hundreds means something got inlined.

## Tool surface

```ts
graphviz_render({
  dot:      string,
  engine?:  'dot' | 'neato' | 'fdp' | 'circo' | 'twopi' | 'osage' | 'patchwork',
  format?:  'svg' | 'png' | 'jpeg',
  width?:   number,
  height?:  number,
  scale?:   number,
  quality?: number,
})
```

Defaults: `engine` is `'dot'`, matching graphviz's own default. `format` is
`'svg'`, matching `fsl_render`'s default.

`width`, `height`, and `scale` apply only to raster formats and are ignored
for `'svg'`. `quality` is JPEG-only, takes 1-100, and is ignored for every
other format; jssm's `rasterize` defaults it to 85. This mirrors how
`RenderRasterOptions` documents the same knobs at `render.ts:15`.

### What is deliberately absent

viz-js's `RenderOptions` also offers `graphAttributes`, `nodeAttributes`, and
`edgeAttributes`. These are not exposed, because every one of them is
expressible in the DOT source itself as `graph [...]`, `node [...]`, and
`edge [...]`. Exposing them would add three parameters and three schema
branches for zero new capability.

`engine` is exposed precisely because it is the one thing a caller **cannot**
express by editing their DOT. Layout engine selection is an API-level choice,
not a language-level one.

### The engine enum is hardcoded

`viz.engines` reports what the wasm build supports at runtime, but zod needs a
static enum to give agents a usable schema. The seven standard engines are
hardcoded. If a build ever lacks one, the mismatch surfaces as a normal viz
error through the ordinary failure path, which is a better outcome than a
schema that cannot be described ahead of time.

## Data flow

```
dot ─► viz.render(dot, { engine, format: 'svg' })
        │
        ├─ status:'failure' ─────► { valid: false, errors: [...] }
        │
        └─ status:'success' ─► svg
                                │
                  format 'svg' ─┴─► { valid: true, format: 'svg', svg, warnings? }
                                │
           format 'png'|'jpeg' ─┴─► rasterize(svg, format, { width, height, scale, quality })
                                     └─► { valid: true, format, mimeType, bytes, warnings? }
```

## Types

Mirroring `render.ts`'s discipline: every failure is a returned value, and the
function is documented `@throws never`.

```ts
export type GraphvizEngine = 'dot' | 'neato' | 'fdp' | 'circo' | 'twopi' | 'osage' | 'patchwork';
export type GraphvizFormat = 'svg' | 'png' | 'jpeg';

export interface GraphvizRasterOptions {
  width?    : number;
  height?   : number;
  scale?    : number;
  quality?  : number;
}

export interface GraphvizSvg {
  valid     : true;
  format    : 'svg';
  svg       : string;
  warnings? : string[];
}

export interface GraphvizImage {
  valid     : true;
  format    : 'png' | 'jpeg';
  mimeType  : 'image/png' | 'image/jpeg';
  bytes     : Uint8Array;
  warnings? : string[];
}

export interface GraphvizUnsupported {
  valid     : true;
  format    : 'png' | 'jpeg';
  svg       : string;
  note      : string;
}

export interface GraphvizError {
  valid     : false;
  errors    : { level: 'error' | 'warning'; message: string }[];
}

export interface GraphvizFailure {
  valid     : false;
  error     : string;
}
```

The exported function's signature is therefore:

```ts
export async function graphvizRender(
  dot: string,
  engine?: GraphvizEngine,
  format?: GraphvizFormat,
  options?: GraphvizRasterOptions,
  // injectable collaborators, defaulted; see Testing
): Promise<GraphvizSvg | GraphvizImage | GraphvizUnsupported | GraphvizError | GraphvizFailure>
```

`warnings` exists because viz-js's `SuccessResult.errors` may be non-empty on a
successful render; graphviz reports warnings through the same channel as
errors. Under `exactOptionalPropertyTypes` the key is set conditionally and
never assigned `undefined`.

Every export needs an explicit return type under `isolatedDeclarations`.

## Error handling

Four paths, all returned rather than thrown:

| Condition | Result |
|---|---|
| Invalid DOT | `{ valid: false, errors }` from viz's failure result |
| Success, graphviz emitted warnings | `{ valid: true, ..., warnings }` |
| Raster requested, no rasterizer backend | `{ valid: true, format, svg, note }` |
| Rasterizer threw anything else | `{ valid: false, error: message }` |

The third row mirrors `fslRender`'s existing degrade path at `render.ts:135`.
The same runtime concern applies for the same reason, so it gets the same
answer rather than a new one.

## Change to existing code

`server.ts`'s `renderResult` helper is typed
`Awaited<ReturnType<typeof fslRender>>`. Its logic is purely structural
(`r.valid && 'bytes' in r`), so it needs only its parameter type widened to
accept both tools' result unions. This is the only existing file whose
behavior is touched.

## Testing

Both collaborators are injectable, exactly as `fslRender` takes an injectable
`engine` at `render.ts:119`. That is what makes the enforced 100% coverage gate
reachable without loading wasm inside a unit test.

**Unit** (`graphviz.spec.ts`): SVG success; PNG success; invalid DOT returning
errors; warnings present on an otherwise successful render; the
raster-unsupported degrade; an injected throw producing a failure; each of the
seven engines accepted.

**Stochastic** (`graphviz.stoch.ts`): generate small random valid graphs and
assert the output parses as SVG. Generate arbitrary strings and assert the
function never throws and always returns a well-formed result. The second
property matters more than the first: `viz.render` runs a wasm graphviz build,
so garbage input is a path directly into compiled C, and a property test over
arbitrary strings is exactly the shape of test that finds a panic the type
system cannot.

No fake tests. Each test must exercise real behavior rather than assert output
it generated itself.

## Guide topic

New prose at `src/prompts/graphviz-primer.md`. `generate_guide_content.js`
gains a third exported constant, `GUIDE_GRAPHVIZ`, alongside `GUIDE_LANGUAGE`
and `GUIDE_FLOWCHARTS`. `fsl_guide`'s topic enum gains `'graphviz'`.

The `'language'` topic stays FSL-only. It currently concatenates the FSL primer
and the flowcharts guide; graphviz is a different language and earns its own
topic rather than being appended to FSL's.

The primer is the largest single piece of writing in this cycle.
`fsl-llms-draft.md` is a useful model for tone and rigor: every claim in it is
verified against a specific library version rather than recalled.

## Documentation obligations

- `base_README.md`, never `README.md`, which is generated.
- DocBlocks on every new export, with at least one realistic success example.
- `CLAUDE.md`: update the tool count from seven to eight, and replace the
  analyze-first rule with the restated general form above.

## Sequencing

This spans two repositories, and the order is load-bearing:

1. jssm PR exporting `rasterize` from `jssm/cli`.
2. jssm release.
3. fsl-mcp raises its jssm version floor to that release.
4. fsl-mcp implements `graphviz_render` and the primer.

Steps 1 and 2 gate the raster half only. If it becomes useful to parallelize,
the SVG path depends on nothing but `@viz-js/viz` and could land first, with
`format` widened from `'svg'` to the full set afterward as a non-breaking
change.
