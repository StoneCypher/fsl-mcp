# Ambient Context Injection - portable spec

Teach an agent harness to push situational awareness into the model's context on
every user message, instead of the model pulling it through tool calls. Implemented
for Claude Code as a UserPromptSubmit hook (a program whose stdout is appended as
context when the user submits a prompt); any harness with a pre-prompt hook point
can do the same. One process per prompt, one terse line per sense, every section
fail-silent - a missing repo, database, or file must never block the prompt.

## The senses

1. **Wall clock** - `[current-time] unixtime=1783880699 local=11:24 am PDT`
   Source: system clock. Why: models cannot know the time and will guess or
   fabricate plausible-looking timestamps under pressure; ambient time removes
   both the tool-call cost and the temptation. Include unixtime (canonical) and
   a preformatted local string matching whatever timestamp format your
   conventions use.

2. **Context-window fill** - `[context] ~142k/200k tokens (71%)`
   Source: the session transcript file (hook payload carries its path); the most
   recent entry with API usage counts gives live context size as
   input_tokens + cache_read_input_tokens + cache_creation_input_tokens.
   Read only the file tail (~256KB). Why: the model has no native gauge of its
   own context; the number governs pacing - when to consolidate state to disk,
   when to summarize, when a compaction is imminent.

3. **Git snapshot** - `[git] main dirty(3) ahead=1 behind=0`
   Source: `git rev-parse --abbrev-ref HEAD`, `git status --porcelain` (count
   lines), `git rev-list --left-right --count @{upstream}...HEAD`, all with
   short timeouts, cwd from the hook payload. Why: kills the stale-assumption
   error class (working on the wrong branch, not noticing a dirty tree or an
   unpulled main).

4. **Background task ages** - `[tasks] last-write ages: b2yh89147(15m) bvrbulnv3(34m)`
   Source: mtimes of the harness's per-task output files. Filter to fresh
   (<=2h), sort ascending, cap ~8. Why: liveness at a glance - a stale age is a
   stuck task; survives conversation compaction, which the model's memory of
   "what did I launch" does not.

5. **Subagent heartbeats** - `[heartbeats] b07: 🙂 [08:20 AM] all 8 drafted; writing verify script`
   Source: a heartbeats/ directory in session scratch; each background agent
   OVERWRITES its own one-line file (an affect emoji, a self-reported timestamp,
   <=80 chars of current intent) at phase transitions - via file-write tools,
   never via the message channel (message-channel status pollutes the user's
   prompt stream and fires their hooks). Why: multi-agent visibility with zero
   prompt-channel noise; the orchestrator reads the wall ambiently.

6. **Affect-log tail** - `[affect-tail] [11:13 am|mtg-plugin] 😊 🏁 branch done ...`
   Source: last 3 rows of a shared sqlite journal every session writes a
   one-line self-state signature to (see the affect-signature convention).
   Why: cross-session continuity - each session sees its siblings' (and its own
   pre-compaction) recent states without any coordination protocol.

## Design rules learned the hard way

- Terse: every line costs tokens on EVERY prompt; one line per sense, hard caps.
- Fail-silent everywhere; the hook must exit 0 with whatever it gathered.
- Never fabricate: emit nothing over emitting a guess (applies doubly to time).
- Freshness beats completeness: filter stale tasks, cap lists, tail files.
- Ambient beats polled: any info the model repeatedly pulls with tool calls is
  a candidate sense; any info that changes mid-conversation and silently
  invalidates model assumptions is a strong candidate.
- Push channels the model cannot see itself (its own context fill) are the most
  valuable of all - they patch introspective blind spots.
