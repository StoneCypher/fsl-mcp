# Changelog

All notable changes to this project will be documented in this file.

1 release; Changelogging the last 10 commits; Full changelog at [CHANGELOG.long.md](CHANGELOG.long.md)



&nbsp;

&nbsp;

Published tags:

<a href="#0__3__0">0.3.0</a>





&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 10:26:16 AM

Commit [faecb5d2d86d6ece30b38601d7a910c86590c037](https://github.com/StoneCypher/fsl-mcp/commit/faecb5d2d86d6ece30b38601d7a910c86590c037)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: prompt artifacts - FSL LLM primer draft and ambient-context spec (#15)
  * - src/prompts/fsl-llms-draft.md: the grammar-verified FSL primer (A/B-tested;
  100% validity over 70 trials; exact-names directive from failure autopsy),
  staged here ahead of its jssm handoff.
- src/prompts/ambient-context-spec.md: portable spec of the ambient-context
  injection hook (time, context gauge, git, tasks, heartbeats, affect tail)
  for reimplementation in other harnesses.




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 7:57:04 AM

Commit [f5730bdb2fdb7895e2366e81032fe8bbe70ff00f](https://github.com/StoneCypher/fsl-mcp/commit/f5730bdb2fdb7895e2366e81032fe8bbe70ff00f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: prompt artifacts - FSL LLM primer draft and ambient-context spec
  * - src/prompts/fsl-llms-draft.md: the grammar-verified FSL primer (A/B-tested;
  100% validity over 70 trials; exact-names directive from failure autopsy),
  staged here ahead of its jssm handoff.
- src/prompts/ambient-context-spec.md: portable spec of the ambient-context
  injection hook (time, context gauge, git, tasks, heartbeats, affect tail)
  for reimplementation in other harnesses.




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 7:07:09 AM

Commit [673d7dab739b4d98bda59eb2508d3f3aa699f82f](https://github.com/StoneCypher/fsl-mcp/commit/673d7dab739b4d98bda59eb2508d3f3aa699f82f)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore: bump jssm to 5.162.10 for upstream fixes (#11)
  * Full suite green against the new version: 128/128, coverage
98.56/95.95/96.15/100 vs the 95 gate.




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 7:06:55 AM

Commit [add6910383c77cec167886d4ec05cfe188b12f90](https://github.com/StoneCypher/fsl-mcp/commit/add6910383c77cec167886d4ec05cfe188b12f90)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): primer A/B tooling - --primer-file, case-fold scoring, per-trial capture (#8)
  * * feat(eval): --primer-file flag for A/B testing alternative primers
  * * fix(eval): case-insensitive name matching in the scorer
  * scoreCorrectness now folds case on every name comparison: states,
transition endpoints, start/terminal states, and a walk's endState.
A/B runs showed models writing On/Off for tasks specifying on/off -
structurally correct FSL that only differed in identifier case, which
should not fail a trial.
  * Because jssm's own action()/transition() lookups are case-sensitive, a
walk's actions are resolved case-insensitively against the machine's
own action labels and state names before being simulated, so a
differently-cased action label in the expectation still walks
correctly. Only the resolved copy is ever passed to jssm; nothing
jssm returns is mutated.
  * Extends score.spec.ts with a case-insensitive-matching describe block
covering states/transitions/start/terminals, a walk endState, a
capitalized action label resolved against a lowercase expected action,
and a negative control confirming a genuinely wrong name still fails.
  * * feat(eval): capture per-trial FSL and error in results
  * ScoredTrial gains fsl (the trial's extracted FSL, null when extraction
failed) and an optional error, populated from the TrialResult when
eval.ts pushes each scored row. Lets a failing or miscored trial be
inspected directly from eval-results.json instead of re-running the
sweep.
  * report.ts's aggregate/computeDeltas only read task/condition/valid/
correct, so they're unaffected; report.spec.ts's hand-built
ScoredTrial fixtures gained the now-required fsl field to keep
typechecking.




&nbsp;

&nbsp;

## [Untagged] - Jul 15, 2026 5:59:52 AM

Commit [c718dd15d224867217bb8b6130c10d46e20920a0](https://github.com/StoneCypher/fsl-mcp/commit/c718dd15d224867217bb8b6130c10d46e20920a0)

Author: `John Haugeland <stonecypher@gmail.com>`

  * docs: prompt artifacts - FSL LLM primer draft, ambient-context spec, system prompt capture
  * - src/prompts/fsl-llms-draft.md: the grammar-verified FSL primer (A/B-tested;
  100% validity over 70 trials; exact-names directive from failure autopsy),
  staged here ahead of its jssm handoff.
- src/prompts/ambient-context-spec.md: portable spec of the ambient-context
  injection hook (time, context gauge, git, tasks, heartbeats, affect tail)
  for reimplementation in other harnesses.
- src/prompts/claude-code-system-prompt-2026-07-12.md: verbatim capture of a
  Claude Code session system prompt, kept as reference; contains
  machine-specific paths and a session UUID - drop from this PR if that
  bothers anyone.




&nbsp;

&nbsp;

## [Untagged] - Jul 12, 2026 8:55:55 AM

Commit [dc4219a37af83238a918aec2b08e6ce0ed00aafc](https://github.com/StoneCypher/fsl-mcp/commit/dc4219a37af83238a918aec2b08e6ce0ed00aafc)

Author: `John Haugeland <stonecypher@gmail.com>`

  * chore: bump jssm to 5.162.10 for upstream fixes
  * Full suite green against the new version: 128/128, coverage
98.56/95.95/96.15/100 vs the 95 gate.




&nbsp;

&nbsp;

## [Untagged] - Jul 12, 2026 6:07:47 AM

Commit [773f4a5534dff842063f8a584a7895dbebbb1ae1](https://github.com/StoneCypher/fsl-mcp/commit/773f4a5534dff842063f8a584a7895dbebbb1ae1)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): capture per-trial FSL and error in results
  * ScoredTrial gains fsl (the trial's extracted FSL, null when extraction
failed) and an optional error, populated from the TrialResult when
eval.ts pushes each scored row. Lets a failing or miscored trial be
inspected directly from eval-results.json instead of re-running the
sweep.
  * report.ts's aggregate/computeDeltas only read task/condition/valid/
correct, so they're unaffected; report.spec.ts's hand-built
ScoredTrial fixtures gained the now-required fsl field to keep
typechecking.




&nbsp;

&nbsp;

## [Untagged] - Jul 12, 2026 3:58:20 AM

Commit [701af28fd1b24f014754057abe7f5a0afe45330b](https://github.com/StoneCypher/fsl-mcp/commit/701af28fd1b24f014754057abe7f5a0afe45330b)

Author: `John Haugeland <stonecypher@gmail.com>`

  * feat(eval): --primer-file flag for A/B testing alternative primers




&nbsp;

&nbsp;

## [Untagged] - Jul 12, 2026 6:07:37 AM

Commit [0c59f6c683760251d51eb7dd3e452105c74cd9a9](https://github.com/StoneCypher/fsl-mcp/commit/0c59f6c683760251d51eb7dd3e452105c74cd9a9)

Author: `John Haugeland <stonecypher@gmail.com>`

  * fix(eval): case-insensitive name matching in the scorer
  * scoreCorrectness now folds case on every name comparison: states,
transition endpoints, start/terminal states, and a walk's endState.
A/B runs showed models writing On/Off for tasks specifying on/off -
structurally correct FSL that only differed in identifier case, which
should not fail a trial.
  * Because jssm's own action()/transition() lookups are case-sensitive, a
walk's actions are resolved case-insensitively against the machine's
own action labels and state names before being simulated, so a
differently-cased action label in the expectation still walks
correctly. Only the resolved copy is ever passed to jssm; nothing
jssm returns is mutated.
  * Extends score.spec.ts with a case-insensitive-matching describe block
covering states/transitions/start/terminals, a walk endState, a
capitalized action label resolved against a lowercase expected action,
and a negative control confirming a genuinely wrong name still fails.




&nbsp;

&nbsp;

## [Untagged] - Jul 12, 2026 6:36:36 AM

Commit [df036980c892936b466bc1f156cc66ae2d6c0e44](https://github.com/StoneCypher/fsl-mcp/commit/df036980c892936b466bc1f156cc66ae2d6c0e44)

Author: `John Haugeland <stonecypher@gmail.com>`

  * ci: replace archived create-release action with gh release create (#6)
  * The release job (`.github/workflows/ci.yml`) still used
`actions/create-release@v1`, which is archived upstream and emits three
deprecated `set-output` warnings on every run. It also checked out with
`actions/checkout@v4` while every other job already uses `@v5`, and ran
a `Push tags` step (`git push origin --tags`) that has always been a
no-op: checkout runs with `fetch-tags: false` and no local tag is ever
created, so there was nothing for that step to push — the tag has
always been created by `create-release` itself. That leftover step used
to mask the same-shaped 403 permissions bug this job hit before
`contents: write` was added.
  * - Bump checkout to `actions/checkout@v5` to match the rest of the
  workflow.
- Drop the now-dead `Push tags` step and the `Use Node.js 22.x` setup
  step (nothing left in the job runs node/npm since release creation no
  longer needs `actions/setup-node`'s npm registry auth). Left a comment
  showing how to restore setup-node ahead of the commented-out
  `Publish to npm` step if that's ever revived.
- Replace `actions/create-release@v1` with a single step that shells out
  to the preinstalled `gh` CLI: `gh release create "$TAG" --title "$TAG"
  --notes-file CHANGELOG.md`. Guarded with `gh release view "$TAG"`
  first so a re-run of a main push without a version bump skips
  gracefully instead of failing on a duplicate release/tag.
  * `permissions: contents: write` and the job's `if:`/`needs:` are
unchanged. No other job was touched.