# fsl_scaffold - design

Date: 2026-07-18. Status: approved approach (interview complete), pending spec review.
Flowchart sub-project 2 of 3 (harness task #1; decomposition approved 2026-07-16).

## Purpose

A seventh MCP tool, `fsl_scaffold`, that returns a complete, compiling FSL
starting document for a chosen flowchart idiom, with the caller's own names
already substituted. It converts the guide's taught idioms into ready-to-edit
source, one call before `fsl_validate`/`fsl_render`.

## Decisions from the design interview (all user-approved)

1. **Parameterization: presets + light params.** A preset id, an optional
   `machine_name`, and optional named role slots. No rich generator knobs.
2. **Preset catalog (v1, all four):** `flowchart`, `pipeline`, `decision`,
   `review-loop`.
3. **Output: jsonResult wrapper** (the authoring-tools convention, not
   fsl_guide's raw-text convention).
4. **Renames: named role slots per preset** - self-documenting, validated
   per preset, auto-quoted when not bare-safe.
5. **Architecture: approach A** - authored content files under `src/prompts/`,
   embedded at build time into a committed generated module (guide-content
   precedent), pure substitution logic, analyze-checked output.

## Refinement within approach A: canonical FSL, not placeholder templates

Each preset is authored as a **real, compiling FSL document** in
`src/prompts/scaffolds/<preset>.fsl` using canonical state names and
instructive `//` comments - no `{{placeholder}}` syntax. Role substitution is
a token-boundary rename of the canonical identifiers (and the quoted default
machine name). Consequences:

- The preset files themselves pass `analyze()` raw - they get the same
  fence-style compile test as the guide's examples.
- Canonical names are chosen to be unambiguous tokens within their file
  (e.g. `ManagerReview`), so a word-boundary regex rename is exact; renames
  intentionally also update mentions inside comments.

## Tool contract

- Name: `fsl_scaffold`. Registered in `src/ts/server.ts` in sibling style.
- Input (zod): `preset: z.enum(['flowchart','pipeline','decision','review-loop'])`,
  `machine_name?: string`, `roles?: <per-preset object, see catalog>`.
- Success: jsonResult `{ valid: true, preset, source, roles, notes }` where
  `source` is the substituted FSL (teaching comments intact), `roles` is the
  fully-resolved role→name map (defaults filled in), and `notes` is a short
  static string[] of the gotchas most relevant to that shape (from the
  re-verified guide: labels before arrows, `~>` for involuntary flow, edges
  register states).
- Failure: jsonResult `{ valid: false, errors }` for bad role input (wrong
  count, empty name, name containing `"` or a newline, duplicate names).
  The tool never throws.
- **Compile guarantee:** after substitution the tool runs `analyze()` on the
  output and returns `valid: true` only if it has no errors. A failure here is
  a bug (return `valid: false` with the diagnostics); tests make it
  effectively unreachable. `fsl_scaffold` takes no FSL *input*, so the
  analyze-first input guard is N/A (fsl_guide precedent) - but its *output*
  is analyze-gated.

## Preset catalog and role slots

| Preset | Shape (from the flowchart guide) | Role slots (all optional, defaults = canonical names) |
|---|---|---|
| `decision` | one diamond, one labeled edge per outcome, styled terminals | `decision: string`, `outcomes: string[]` (2-6, default `[Ship, Reject]`) |
| `pipeline` | linear stages, `flow: right;`, shared `~>` failure sink | `stages: string[]` (2-8, default `[Fetch, Parse, Save]`), `failed: string` |
| `review-loop` | Draft/Review/Publish with approve + revise-back | `draft`, `review`, `publish` (strings) |
| `flowchart` | full worked idiom: start terminal, two diamonds, end terminal, `~>` escalation, rework loop (Expense Approval shape) | `submitted`, `validating`, `managerReview`, `paid`, `returned`, `escalated` (strings) |

Naming rules: a role value matching `^[A-Za-z][A-Za-z0-9_]*$` is used bare;
anything else is double-quoted automatically; values containing `"`, newlines,
or nothing at all are rejected as errors; duplicate resolved names (across
roles or colliding with a remaining canonical name) are rejected. List slots
enforce the counts above. `machine_name` replaces the preset's quoted default
via the same quoting rules (always quoted).

## Files

- `src/prompts/scaffolds/flowchart.fsl`, `pipeline.fsl`, `decision.fsl`,
  `review-loop.fsl` - authored presets (new; LF-pinned in `.gitattributes`
  like the other prompt sources).
- `src/build_js/generate_scaffold_content.js` - embeds the four files into
  `src/ts/tools/scaffold-content.ts` (generated, committed, drift-guarded);
  wired into the `typescript` npm script beside the guide generator.
- `src/ts/tools/scaffold.ts` - pure logic: role validation, quoting,
  token-boundary substitution, analyze gate. Exported types for the role
  maps. DocBlocks throughout.
- `src/ts/server.ts` - registration (modify).
- Tests: `src/ts/tests/scaffold.spec.ts` (unit + drift), `scaffold.stoch.ts`
  (fast-check), e2e round-trip in `src/ts/e2e/server.spec.ts`; tool-count
  assertions go 6 -> 7.
- `base_README.md` - tool row + section (never README.md).
- `src/prompts/fsl-flowcharts.md` - one-line pointer to fsl_scaffold
  (regenerates guide-content.ts).

## Testing

- Unit: each preset compiles raw; each compiles with default roles and with
  full renames (incl. a multi-word quoted name); count/character/duplicate
  violations return `valid: false` with named errors; notes non-empty;
  drift guard between .fsl sources and scaffold-content.ts.
- Stochastic (`*.stoch.ts`, fast-check): arbitrary strings fed as role names
  either produce `valid: true` source whose `analyze()` is clean, or
  `valid: false` - never a throw, never a compiling-but-wrong silent state.
- e2e: MCP round-trip for one preset with renames; tool list shows seven.
- No fake tests; coverage gate stays 95 on all four metrics.

## Composition and release

- Tool description cross-references `fsl_guide` topic `flowcharts`; the guide
  gains the pointer back. The coming lint pack (sub-project 3) uses the
  presets as known-good fixtures.
- Zero new dependencies. Strict-TS/eslint constraints per contributor brief.
- The PR carries a version bump (0.5.0 - new tool = minor) and a build, per
  the standing bump-versions-in-PRs rule. Branch: `feat_26-07-18_fsl-scaffold`.
