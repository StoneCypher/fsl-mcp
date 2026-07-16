# fsl_render image derivation - design

Date: 2026-07-15. Status: approved approach (option A), pending spec review.

## Goal

Let the calling agent SEE the machine it wrote. `fsl_render` grows raster output:
PNG / JPEG / GIF returned as genuine MCP image content blocks, so a vision-capable
model closes the author-validate-look loop inside one tool surface. SVG remains the
default and is byte-compatible with today's behavior; DOT is added as a second text
format since the engine provides it for free.

## Non-goals

- No batch/collection rendering (jssm's RenderSet) - composes later if wanted.
- No file-writing tool; the MCP returns content, the client decides persistence.
- No theming/styling parameters beyond what jssm's render() already accepts.

## Engine

jssm (>= 5.162.10) ships `render(fsl, opts)` on its CLI surface: targets
`svg | dot | png | jpeg | html | gif`, returning a discriminated union -
`{ kind:'text', content }` for svg/dot/html, `{ kind:'raster', buffer }` for
png/jpeg/gif. Raster options: `width`, `height`, `scale` (zoom %, 100 = 3x natural),
`quality` (jpeg 1-100), `delay` (gif per-frame centiseconds), `maxFrames` (gif walk
ceiling). Rasterization uses native OffscreenCanvas or `@resvg/resvg-wasm`; the
latter is a jssm optionalDependency and is already present transitively - ZERO new
fsl-mcp dependencies. Typed failures: `RenderError`, `RasterizationUnsupportedError`.

Implementation task zero: pin down the exact import path for the CLI surface from
jssm's package exports map (expected `jssm/cli`; the declarations live in
`jssm.cli.d.ts`). If the subpath is not exported, fall back to whatever entry the
exports map names for it; do not deep-import dist paths.

`html` is deliberately NOT exposed: an HTML document is neither useful MCP text for
an agent nor an image.

## Tool contract

`fsl_render` input (zod):

- `source` string (unchanged)
- `format` enum `'svg' | 'dot' | 'png' | 'jpeg' | 'gif'`, default `'svg'`
- `width`, `height` optional positive ints (raster only; forwarded)
- `scale` optional positive int (raster only; forwarded)
- `quality` optional int 1-100 (jpeg only; forwarded)
- `delay` optional positive int (gif only; forwarded)
- `maxFrames` optional positive int 1-100 (gif only; forwarded)

Non-applicable options are silently ignored by jssm; we forward them as given and
document the applicability in the tool description rather than hard-rejecting,
matching jssm's own forgiving contract.

Result shapes (discriminated union, exported types):

- Invalid source: existing analyze-first short-circuit, unchanged - diagnostics.
- `RenderSvg` (unchanged) and new `RenderDot { rendered:true, format:'dot', dot }`.
- New `RenderImage { rendered:true, format:'png'|'jpeg'|'gif', mimeType, bytes }` -
  internal shape carrying the Uint8Array.
- `RenderUnsupported { rendered:false, reason:'raster-unsupported' | 'viz-missing', message }` -
  extends today's viz-missing case with the raster backend case
  (`RasterizationUnsupportedError`).
- `RenderError` (unchanged): render-time failure with message.

## Server plumbing (the one real change outside render.ts)

Today `server.ts` serializes every tool result to one JSON text content block. It
gains a narrow special case: when the render result is a `RenderImage`, the tool
response content is `[{ type:'image', data: <base64 of bytes>, mimeType }, { type:'text',
text: <small JSON summary: format, byte length, dimensions if known> }]`. All other
tools and all other render shapes keep the existing single-text-block path. The
summary text block keeps non-vision clients and logs informative.

## Analyze-first

Unchanged and load-bearing: `analyze(source)` gates every path before jssm's
throwing render engine is invoked, exactly as CLAUDE.md requires.

## Errors

- Parse/validation problems: diagnostics via the analyze gate (never reach render).
- `RasterizationUnsupportedError`: structured `RenderUnsupported`, non-throwing -
  message tells the caller SVG remains available.
- Any other `RenderError` or unexpected throw: caught, returned as the existing
  `RenderError` shape. The tool never throws.

## Testing

- Unit (`render.spec.ts` grows): PNG returns bytes beginning with the PNG magic
  number; JPEG begins 0xFFD8; GIF begins `GIF8`; small `maxFrames` keeps the gif
  test fast; svg/dot text paths asserted on real content substrings; option
  forwarding smoke (width honored: decoded PNG header width matches - read IHDR
  bytes, no image library needed); invalid source short-circuits before render for
  every format; raster-unsupported path covered by injecting a stubbed engine
  failure (the real backend exists in CI, so the error path is exercised via a
  seam - a small injectable render function parameter, defaulted to jssm's,
  mirroring the eval harness's injectable-spawn pattern).
- e2e (`server.spec.ts` grows): one stdio round-trip requesting png; asserts the
  response contains an image content block with base64 payload and correct
  mimeType, via the established PassThrough-stream harness.
- Coverage gate (95 on all four metrics) must stay green.

## Documentation

- DocBlocks on every new/changed export (types, render, server helper).
- `base_README.md`: fsl_render section gains the format table and one GIF example
  (README is generated - never edit README.md directly).

## Risks

- jssm/cli subpath export uncertainty - task zero resolves before anything builds.
- GIF size: an animated walk can be hundreds of KB; `maxFrames` default (jssm's)
  plus documented guidance ("use maxFrames <= 20 for chat contexts") mitigates.
- resvg-wasm presence depends on npm installing optionals (default behavior);
  the RenderUnsupported path is the designed degradation, matching the viz pattern.
