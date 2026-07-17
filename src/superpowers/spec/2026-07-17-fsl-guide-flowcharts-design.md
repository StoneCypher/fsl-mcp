# fsl_guide + flowchart idiom - design

Date: 2026-07-17. Status: approved design (delivery, topics, and sourcing all
user-selected), pending spec review. Sub-project 1 of 3 for flowchart support
(2: fsl_scaffold tool with presets; 3: flowchart lint pack - separate specs).

## Goal

People (and agents) arriving at fsl-mcp to make flowcharts get taught the
idiom, through the channel that demonstrably works: documentation. The eval
found the reference primer moved a weak model from 60% to 100% correctness -
so the flowchart guidance ships both as primer content AND through a new
`fsl_guide` tool, closing the out-of-band delivery gap for every connected
agent.

## Non-goals

- No scaffold/translate tool (sub-project 2).
- No new lint rules (sub-project 3).
- No MCP resources surface - tools are what agent harnesses reliably expose.
- No restructuring of the existing primer text.

## Content: src/prompts/fsl-flowcharts.md

A new authored markdown document, "Flowcharts in FSL", covering:

- The mapping vocabulary: process step -> default (box) state; decision ->
  `shape: diamond` state declaration with one labeled edge per outcome
  (`'yes' ->`, `'no' ->`); start terminal (shaped/colored start state); end
  terminal (voluntary end state, doublecircle); subroutine/reference -> `box3d`
  or `note` shapes.
- Retry/loop-back cycles and how labeled edges keep them readable.
- Error and exception paths on `~>` so main flow and failure flow render
  distinctly.
- Layout: `flow: down;` for classic top-to-bottom flowchart reading,
  `flow: right;` for pipelines; theme guidance.
- Render guidance for the new image formats: png width for legibility in chat,
  gif random-walk as a quick demo of flow behavior.
- Gotchas that specifically bite flowchart authors (all empirically verified
  this month): post-arrow decorations silently don't bind; bare
  `state X : {};` declarations are dropped (attach at least one property or a
  self-loop); duplicate unlabeled (source,target) edges collide across kinds;
  apostrophes in single-quoted labels need `\'`.
- One complete worked example: an approval flowchart (submit -> validate ->
  decision diamond -> approve/reject -> end) exercising every element above.

Every ```fsl fence in the document MUST compile (see Testing) - the guidance
can never teach FSL that does not parse.

## Composition rule

The main primer `src/prompts/fsl-llms-draft.md` is not edited. The
'language' topic serves the concatenation fsl-llms-draft.md + "\n\n" +
fsl-flowcharts.md; the 'flowcharts' topic serves fsl-flowcharts.md alone.
The idiom is "a section of the primer" by composition, keeping both files
independently maintainable and the flowchart doc extractable for jssm's own
docs later (issue #10 primer handoff).

## Tool contract: fsl_guide (sixth tool)

- Input (zod): `{ topic: z.enum(['flowcharts', 'language']) }`. No `source`
  input, therefore the analyze-first rule is explicitly N/A - this is the one
  tool that never touches jssm.
- Output: ONE text content block containing the markdown verbatim - raw
  prose, NOT the jsonResult JSON wrapper. Escaping a document into a JSON
  string only hurts the consuming agent.
- Failure modes: none beyond zod enum rejection at the protocol layer. The
  tool is a pure lookup of build-time constants and cannot throw.
- Tool description tells agents when to call it: "Call with topic 'language'
  before writing FSL for the first time; topic 'flowcharts' when the goal is
  a flowchart/decision-diagram."

## Sourcing pipeline (Approach A - build-time embed)

- `src/build_js/generate_guide_content.js` reads the two md files and emits
  `src/ts/tools/guide-content.ts`: a do-not-edit-header module exporting
  `GUIDE_FLOWCHARTS: string` and `GUIDE_LANGUAGE: string` (template-literal
  safe: backslashes, backticks, and `${` escaped).
- Wired into `src/build_js/run_build.js` before the typescript step.
- The generated module is COMMITTED (README.md madlibs precedent) so plain
  tsc/vitest/eslint work without running a build.
- Rollup bundles the constants into dist; zero runtime file reads, works
  under npx from the published package.

## Testing

- Unit (`guide.spec.ts`): each topic's constant contains sentinel headings;
  'language' contains both the primer's opening and the flowchart heading
  (composition proof); the fsl-fence test - extract every ```fsl block from
  GUIDE_FLOWCHARTS and assert `analyze(block)` reports no errors, for each
  block individually (a real test: it executes the actual parser against the
  actual docs).
- Drift guard: a unit test re-derives the expected constants from the md
  files (same escape logic) and asserts the committed guide-content.ts
  matches - so a primer edit without regeneration fails the suite instead of
  shipping stale guidance.
- e2e (`server.spec.ts` grows): one round-trip calling fsl_guide with topic
  'flowcharts', asserting a text content block containing the flowchart
  heading.
- Coverage gate stays 95 on all four metrics.

## Documentation

- base_README.md: fsl_guide added to the tool table plus a short section
  (topics, when to call, the no-source/no-analyze note).
- DocBlocks on the tool function and both generated constants (the generator
  writes the DocBlocks into the generated file).

## Risks

- Generated-file drift: covered by the drift-guard test.
- Primer duplication with jssm's eventual official docs: composition keeps
  fsl-flowcharts.md a standalone handoff artifact.
- Token weight: 'language' returns the full primer (~2-3k tokens) - that is
  the point; the description steers agents to the cheaper 'flowcharts' topic
  when that's all they need.
