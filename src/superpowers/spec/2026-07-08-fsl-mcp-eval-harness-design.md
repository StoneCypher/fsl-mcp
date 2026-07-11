# fsl-mcp eval harness — design

Status: approved (brainstorm), pending spec review
Author: Claude (Opus 4.8), with John
Date: 2026-07-08

## Purpose

A cheap, repeatable, **subscription-based** regression metric that answers, with real numbers rather than assertion:

> Does fsl-mcp — and/or a shipped FSL language reference — *measurably* improve an agent's FSL authoring versus authoring blind?

It is meant to be re-run as FSL grows (v7 expressions, v9 contracts, v12 proofs, …) to confirm the MCP keeps earning its keep as the language gets harder. The output is a per-condition success rate and the deltas between conditions.

## Non-negotiable constraint: no API access

The harness MUST run on a user's ordinary **Claude Code subscription**, with **no `ANTHROPIC_API_KEY` and no pay-per-token API account**. Requiring API setup would exclude most users and is considered a project dealbreaker. The harness therefore drives the model through Claude Code's headless mode (`claude -p`), which authenticates with the user's existing Claude Code login.

## Execution mechanism

For each `(task × condition × trial)`, the runner spawns:

```bash
claude -p "<prompt>" --output-format json --model <model> --strict-mcp-config [--mcp-config <path>]
```

- `--output-format json` yields a structured envelope containing the final assistant text, from which the FSL is extracted.
- `--strict-mcp-config` guarantees ONLY the MCP servers we pass are loaded — so the user's own globally-configured MCP servers never leak into a condition and pollute results.
- The **tools** conditions pass `--mcp-config <temp config>` pointing at the real built server (`node dist/bin.mjs`), so the eval measures the actual shipped MCP as a user would install it — not a hand-rolled tool loop.
- `--model` selects the tier (default `claude-opus-4-8`; FSL becomes challenging quickly, so even the top tier is worth measuring).
- The five `fsl_*` tools are read-only, so the run uses a permission mode that auto-approves them (e.g. `--permission-mode bypassPermissions` or an `--allowedTools` allowlist scoped to the `fsl_*` tools) — no interactive prompts.

### Caveats (documented, not solved away)
- Draws on the user's **subscription usage**, like any Claude Code work. That is the deliberate tradeoff versus per-token API billing.
- Model output has **run-to-run variance**; a single pass is not a stable metric. The harness runs **N trials per (task, condition)** and reports a rate with spread, so a real regression is distinguishable from noise.
- Requires the `claude` CLI on `PATH` (true for any Claude Code user).

## Conditions (4-way)

| Condition | Reference primer in prompt? | fsl-mcp tools available? |
|---|---|---|
| `bare` | no | no |
| `reference` | yes | no |
| `tools` | no | yes |
| `reference+tools` | yes | yes |

- **Reference primer**: the versioned FSL description emitted by jssm's `fsl-export-system-prompt` CLI, captured once per run and prepended to the task prompt. Sourcing it from jssm (not from model training or a hand-written blob) keeps it locked to the installed language version.
- This 4-way design answers three questions in one run: do the tools help (`tools − bare`), does a reference help (`reference − bare`), and are they additive or redundant (`reference+tools` vs the parts).

## Scoring — jssm is ground truth

The model is instructed to emit its final machine inside a single fenced ```` ```fsl ```` block. The extractor pulls that block; if none is present, the trial scores as a hard fail (invalid + incorrect) and is logged.

Each extracted machine is scored on two axes:

1. **Validity** — `fslDiagnostics(source)` returns no `error`-severity diagnostics. (Reuses the project's own `analyze`/`hasErrors`.)
2. **Correctness** — per-task machine-checkable expectations, only evaluated if the machine is valid:
   - *Structural* checks via the model built with `from()` (reusing `fslExplain`'s introspection): expected states present, expected transitions present, expected start/terminal states.
   - *Behavioral* checks via `fslSimulate`: a specified action/target walk lands on the expected end state (and/or a specified illegal move is rejected).

A trial's correctness is all-expectations-pass (boolean). Validity and correctness are aggregated independently to rates.

> Note on fairness: both the `tools` conditions and the scorer call the same jssm engine. That is intentional and fair — the question under test is whether *access during authoring* raises the quality of the *final* output, scored by the ground-truth engine. It is not circular: a bare-condition model can still produce valid, correct FSL from its own knowledge, and often will on easy tasks.

## Aggregation & report

Per condition, over all `tasks × trials`:
- **validity rate** = valid trials / total trials
- **correctness rate** = correct trials / total trials
- spread across trials (min/max or stddev) so noise is visible

The report prints:
- a table: condition × {validity rate, correctness rate, n}
- the key deltas: `tools − bare`, `reference − bare`, `reference+tools − bare`, each for validity and correctness
- optionally, a per-difficulty-tier breakdown (the tool value should grow with task difficulty)

Machine-readable JSON output is also written (for tracking the metric over time / across FSL versions).

## Task set

Curated across a difficulty gradient, stored as data so it extends as FSL adds surface. Initial set (illustrative, ~10):

- **easy**: a light switch (`on`/`off`); a 3-state linear pipeline; a one-way door.
- **medium**: a traffic light cycle (behavioral walk check); a machine with named action labels (`a 'go' -> b;`) where the walk must use the action; a machine with a terminal/final state.
- **harder**: a checkout flow with a rejected illegal transition (behavioral check that an illegal move is rejected); a machine with forced (`~>`) edges; a machine with a specified start state that isn't the first declared.
- **structure-only**: "a machine with exactly these states and these transitions" (pure structural check).

Each task record:

```ts
{
  id: string,
  difficulty: 'easy' | 'medium' | 'harder',
  prompt: string,                    // the natural-language spec given to the model
  expect: {
    states?: string[],               // must all be present
    transitions?: [from, to][],      // must all be present
    start?: string[],                // must be start state(s)
    terminals?: string[],            // must be terminal
    walks?: { actions: string[]; endState: string; rejectedAt?: number }[],
  }
}
```

## Layout & units (`src/eval/`)

- `tasks.ts` — the task set + `Task`/`Expect` types. One responsibility: the corpus.
- `reference.ts` — capture the FSL primer once (spawn `fsl-export-system-prompt` from the installed jssm, or read a cached copy). Returns the primer string.
- `conditions.ts` — `buildInvocation(task, condition, model)` → the argv + prompt + temp mcp-config for one `claude -p` call. Pure (no spawning).
- `runner.ts` — `runTrial(invocation)`: spawn `claude -p`, parse the JSON envelope, extract the ```` ```fsl ```` block. The spawn function is injectable so tests don't shell out. Returns `{ fsl: string | null, raw }`.
- `score.ts` — pure jssm scoring: `scoreValidity(fsl)`, `scoreCorrectness(fsl, expect)` → booleans, plus `extractFsl(text)`. No I/O, fully unit-testable.
- `report.ts` — aggregate trial results into rates + deltas; render the table and the JSON.
- `eval.ts` — CLI entry. Flags: `--model` (default opus), `--tasks` (default all / a count), `--trials` (default 3), `--conditions` (default all four). Orchestrates tasks × conditions × trials, calls runner, scores, reports.

`npm run eval` invokes `eval.ts`. **Not wired into CI** — it consumes subscription usage and is an opt-in, human-run measurement.

## Defaults

- model: `claude-opus-4-8`, overridable via `--model`.
- run size: **small by default** — ~10 tasks × 3 trials × 4 conditions ≈ 120 `claude -p` calls. `--tasks`/`--trials` scale up for a serious measurement.

## Error handling

- A `claude -p` failure (nonzero exit, timeout, malformed JSON) → that trial is recorded as a hard fail with the error captured; the run continues. A per-trial timeout bounds a hung call.
- No FSL block in the output → hard fail (invalid), logged with the raw text for inspection.
- If `fsl-export-system-prompt` is unavailable in the installed jssm, the `reference*` conditions are skipped with a clear warning rather than aborting the run.
- Never let one bad trial abort the whole sweep; the point is an aggregate rate.

## Testing

- `score.ts` (validity, correctness, `extractFsl`) — real unit tests over hand-written valid/invalid FSL and known walks. No mocks of jssm; call it for real (it's fast and deterministic). Cover: valid machine passes; invalid machine fails validity; correct walk passes; wrong end state fails; missing fenced block → null; fenced block with surrounding prose extracted correctly.
- `conditions.ts` — unit test that each condition produces the expected argv shape (strict-mcp-config always present; `--mcp-config` present iff a tools condition; reference prepended iff a reference condition).
- `runner.ts` — inject a fake spawn that returns canned `claude -p` JSON; assert FSL extraction and failure handling. Do not shell out in tests.
- `report.ts` — unit test aggregation math (rates, deltas) over synthetic trial results.
- No fake tests: scoring tests assert against independently-known FSL semantics, not values the code produced.

## Non-goals (v1)

- Not in CI; no automated gating on the eval result.
- No API-based execution path.
- Not a general LLM-eval framework — scoped to FSL authoring with jssm as the oracle.
- No fine-grained partial-credit scoring; correctness is all-expectations-pass per trial (kept simple; can refine later if the signal is too coarse).

## Open questions

- Exact `claude -p` permission flag to auto-approve the fsl_* tools without prompting — confirm the current Claude Code flag (`--permission-mode` value vs `--allowedTools`) against the installed CLI during implementation (a build-time check, not a design blocker).
- Whether the reference primer should be trimmed/summarized if `fsl-export-system-prompt` output is very long (revisit if it dominates the prompt).
