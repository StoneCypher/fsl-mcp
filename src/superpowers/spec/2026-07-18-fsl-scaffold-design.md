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
2. **Preset catalog (v1, eight - amended 2026-07-18):** `flowchart`,
   `pipeline`, `decision`, `review-loop`, plus `handshake`, `job-lifecycle`,
   `org-chart`, `network-topology` to smoke out the family interface.
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

v1 ships **eight presets across five families** (user decision 2026-07-18: two
state-machine and two pure-diagram families join, to smoke out the registry
interface before it ships). **List slots are fixed-arity**: canonical-rename
substitution cannot add or remove states, so each list slot requires exactly
its canonical count; arity knobs are precisely where the rejected
rich-generator option begins. Adding a stage is a one-line edit to the
returned source - a scaffold is a starting point.

**Role slots come in two kinds**: `state` slots (rename a state; bare or
auto-double-quoted) and `action` slots (rename a single-quoted action label;
`'` escaped as `\'`, newlines rejected). The manifest declares the kind;
validation and quoting are generic per kind.

| Preset | Family | Shape | Role slots (optional; defaults = canonical) |
|---|---|---|---|
| `decision` | flowchart | one diamond, labeled edge per outcome, styled terminals | states: `decision`, `outcomes` (exactly 2) |
| `pipeline` | flowchart | linear stages, `flow: right;`, shared `~>` failure sink | states: `stages` (exactly 3), `failed` |
| `review-loop` | flowchart | Draft/Review/Publish with approve + revise-back | states: `draft`, `review`, `publish`; actions: `approve`, `revise` |
| `flowchart` | flowchart | full worked idiom (Expense Approval shape) | states: `submitted`, `validating`, `managerReview`, `paid`, `returned`, `escalated` |
| `handshake` | protocol | connect/established/close with retry loop and forced timeout | states: `idle`, `connecting`, `established`, `failed`; actions: `connect`, `acknowledge` |
| `job-lifecycle` | process | queued/running/done with `~>` fail and retry loop | states: `queued`, `running`, `done`, `failed`, `retrying`; actions: `start`, `finish`, `retry` |
| `org-chart` | orgchart | strict reporting tree, `flow: down;`, box nodes | states: `root`, `branches` (exactly 2), `leaves` (exactly 4) |
| `network-topology` | network | `graph_layout: neato;`, `<->` links, one isolated node registered by self-loop | states: `hub`, `switches` (exactly 2), `hosts` (exactly 3), `isolated` |

**Diagram families (orgchart, network) are rendering-first**: the "machine"
semantics are vestigial. Their `notes` say so explicitly ("this is a drawing;
simulate is meaningless; render it"), their content leans on styling and
layout directives, and network-topology deliberately exercises
islands-by-default and the self-loop registration idiom. Authoring caution
for `handshake`: verify the timed-forced combination (`~> after 5s`)
actually compiles during authoring - if it does not, use a plain `~>`
timeout edge and say so in the preset's comments (the fence-style compile
test is the enforcement either way).

Naming rules: a role value matching `^[A-Za-z][A-Za-z0-9_]*$` is used bare;
anything else is double-quoted automatically; values containing `"`, newlines,
or nothing at all are rejected as errors; duplicate resolved names (across
roles or colliding with a remaining canonical name) are rejected. List slots
enforce the counts above. `machine_name` replaces the preset's quoted default
via the same quoting rules (always quoted).

## Files

- `src/prompts/scaffolds/*.fsl` - the eight authored presets (new; LF-pinned
  in `.gitattributes` like the other prompt sources).
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

## Extensibility: preset families (user-requested 2026-07-18)

The catalog is a **data-driven registry**, built to take chart types beyond
flowcharts later (statecharts, protocol handshakes, cycles, ...):

- Each preset is a registry entry `{ id, family, roles manifest, notes }`
  plus its `.fsl` file; all four v1 presets carry `family: 'flowchart'`.
- `generate_scaffold_content.js` **scans** `src/prompts/scaffolds/*.fsl`
  rather than hard-coding four names; `scaffold-content.ts` exports the
  registry and the embedded sources together.
- The `preset` zod enum and the tool description's preset list are **derived
  from the registry at registration time**, so adding a chart family later =
  new `.fsl` files + registry entries (+ their role manifests). No changes
  to `scaffold.ts` logic, the server registration code, or the test
  machinery (the per-preset tests iterate the registry).
- The jsonResult already carries `preset`; it gains `family` so callers can
  group. Role-manifest validation is generic (single slots, list slots with
  min/max) - a new family reuses it.

## Composition and release

- Tool description cross-references `fsl_guide` topic `flowcharts`; the guide
  gains the pointer back. The coming lint pack (sub-project 3) uses the
  presets as known-good fixtures.
- Zero new dependencies. Strict-TS/eslint constraints per contributor brief.
- The PR carries a version bump (0.5.0 - new tool = minor) and a build, per
  the standing bump-versions-in-PRs rule. Branch: `feat_26-07-18_fsl-scaffold`.
