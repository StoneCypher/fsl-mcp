# FSL — Finite State Language (authoring guide for LLMs)

You write FSL, the text language of the `jssm` library, to define finite-state
machines. This guide is verified against jssm 5.162.10. Emit only constructs
described here; do not import syntax from other DSLs or programming languages.

## Semantic model — read this first

An FSL document is a list of **statements**, each ending in a semicolon `;`.
Most statements are **transitions** between **states**. Whitespace and newlines
are insignificant; the `;` is the only statement separator.

- **States** are bare identifiers (`Idle`, `Green`, `LoggedIn`). You do not
  declare them to use them — a state exists as soon as a transition mentions
  it. Multi-word or punctuated names must be double-quoted strings
  (`"Traffic Light"`).
- **Transitions** connect states with an **arrow**. The arrow encodes a
  *direction* and a *kind*.
- **The start state** is whatever the `start_states:` directive names, or, in
  its absence, the **first state mentioned** in the document.
- **A terminal (final) state** is any state with no outgoing transition. You
  do not mark it; jssm derives it. (An `end_states:` directive marks
  *voluntary success* endpoints, which is a separate, optional concept.)

### The three transition kinds — this is the crux

| Arrow | Kind | Runtime meaning |
|-------|------|-----------------|
| `->`  | legal  | An ordinary allowed move. A driver may take it. |
| `=>`  | main   | The primary / "happy path". Also an ordinary allowed move at runtime — `=>` is `->` plus a "this is the main path" tag used for layout and documentation. It is **not** a different runtime mechanism. |
| `~>`  | forced | An **involuntary** edge: errors, timeouts, crashes, external interrupts. Naming the *target* is refused (`transition('Failed')` returns false), but firing the edge's *action* traverses it, and forced actions are listed in `actions()` / `list_exit_actions()`. The API's `force_transition` also traverses it. |

Use `~>` for anything the actor does not opt into. Model "the job crashed",
"the session timed out", "the payment was reversed" as forced edges — never as
`->`. This is the single most common FSL authoring mistake.

Verified (5.162.10): for `Working 'crash' ~> Failed;`, `action('crash')`
returns true and traverses the forced edge, and `crash` appears in `actions()`
/ `list_exit_actions()` (so it shows up in simulation's legal next moves). A
target-name `transition('Failed')` still returns false. `force_transition`
bypasses legality but not connectivity — the edge must still exist.

### Direction

A leftward glyph puts the source on the **right**. Two-headed glyphs make two
independent edges at once.

- `A -> B;` one edge A→B. `A <- B;` one edge B→A.
- `A <-> B;` two edges: A→B and B→A (both legal).

The kind letter is independent of direction, so every kind has three glyphs:

- legal: `->` `<-` `<->`
- main: `=>` `<=` `<=>`
- forced: `~>` `<~` `<~>`

**Mixed bidirectionals** give each direction its own kind. The left glyph
carries the leftward edge's kind, the right glyph the rightward edge's:
`<-=>` `<=->` `<-~>` `<~->` `<=~>` `<~=>`. Example — `A <=-> B;` makes A→B
*legal* (right glyph `->`) and B→A *main* (left glyph `<=`). These are rarely
needed; prefer two plain statements unless you specifically want one line.

Unicode arrow glyphs (`→ ← ↔ ⇒ ⇐ ⇔ ↛ ↚ ↮`) are accepted but **prefer ASCII**.

## Actions — named, single-quoted, BEFORE the arrow

An **action** is a named event that triggers a transition. Write it as a
single-quoted label placed **before** the arrow:

```fsl
Idle 'insert coin' -> Paid;
```

This binds the action `insert coin` to the edge Idle→Paid. At runtime, firing
that action from `Idle` moves the machine to `Paid`.

**Decorations placed *after* the arrow do NOT bind to a forward edge.** This is
verified and it is exactly the trap the previous guidance fell into:

- `A 'go' -> B;` binds action `go`  (fires A→B). ✅
- `A -> 'go' B;` binds **nothing** — the machine reports no action `go`. ❌

The same holds for probabilities (below). **Put actions and weights before the
arrow.** The misplacement produces **zero diagnostics**: validation and lint
both pass and the machine compiles with the decoration silently unbound. No
tool catches this — only review does.

Single quotes are for actions only. Double quotes make a string used as a
state/label name. `A "go" -> B;` is a **syntax error** — `"go"` is not an
action.

### Chains bind per hop

A chain is several arrows on one line; each action attaches to the hop it
precedes:

```fsl
Green 'tick' => Yellow 'tick' => Red 'tick' => Green;
```

`tick` from Green→Yellow, another `tick` Yellow→Red, another Red→Green. Verified:
driving `tick` three times cycles Green→Yellow→Red→Green.

## State lists — fan-in, fan-out, cross-product

A bracketed list `[a b c]` stands in for several states at once and expands to
one edge per member. It may appear as source, target, or both, and may carry a
pre-arrow action.

```fsl
[Red Yellow Green] 'reset' -> Off;   // fan-in: 3 edges, each →Off, action reset
Off 'power' -> [Red];                // fan-out (single here)
```

`[a b] -> [c d];` expands to the cross product (a→c, a→d, b→c, b→d).

## Probabilities and timing (for simulation)

A percentage weights a transition for stochastic simulation. Like actions it
goes **before** the arrow:

```fsl
Rolling 70% -> Win;
Rolling 30% -> Lose;
```

Verified: `A 60% -> B` attaches weight 60; `A -> 60% B` attaches nothing.

A timed edge fires after a delay: `A 'go' -> after 5s B;` (units: `ms`, `s`,
`m`/`min`, `h`, `d`, `w`, plus long forms like `seconds`, `minutes`).

## Worked examples (each compiles and runs as described)

Door with a lock:
```fsl
Closed 'open'   -> Opened;
Opened 'close'  -> Closed;
Closed 'lock'   -> Locked;
Locked 'unlock' -> Closed;
```

Job with an involuntary failure path and forced recovery:
```fsl
start_states: [Idle];
Idle    'start'  -> Running;
Running 'finish' -> Done;
Running 'crash'  ~> Failed;
Failed           ~> Idle;
```
`crash` and the `Failed→Idle` recovery are forced: an actor never *chooses* to
crash. `Done` and `Failed` (which has only a forced exit) behave differently —
`Done` is terminal, `Failed` is not, because a forced exit still counts as an
exit.

Approval flow with metadata and a voluntary end state:
```fsl
machine_name:    "Approval Flow";
machine_version: 1.0.0;
machine_license: MIT;
start_states: [Draft];
end_states:   [Published];
Draft  'submit'  -> Review;
Review 'approve' -> Published;
Review 'reject'  ~> Draft;
```

## Syntax reference

### Machine metadata (accepted keys, `key: value;`)
`machine_name` (label/string), `machine_author` (label, string, or `[list]`),
`machine_contributor`, `machine_comment`, `machine_reference`,
`machine_version` (semver `x.y.z`), `fsl_version` (semver), `machine_license`
(`MIT`, `BSD 2-clause`, `BSD 3-clause`, `Apache 2.0`, `Mozilla 2.0`,
`Public domain`, `GPL v2`, `GPL v3`, `LGPL v2.1`, `LGPL v3.0`, `Unknown`, or a
custom label/string), `machine_language`, `npm_name` (quote it if it contains a
hyphen), `theme` (`default ocean modern plain bold`), `flow`
(`up right down left`), `dot_preamble` ("string"), `default_size`.

```fsl
machine_name: "Traffic Light";
machine_author: [Ada Grace];
machine_version: 2.1.0;
Green -> Yellow -> Red -> Green;
```
A document needs at least one transition; metadata alone will not compile.

### Structural / rendering directives
- `start_states: [A B];` — override start-state inference.
- `end_states: [A];` — voluntary success endpoints.
- `failed_outputs: [A];` — failure endpoints.
- `graph_layout: dot;` — one of `dot circo fdp neato twopi`.
- `allow_islands:` — disconnected subgraphs are permitted **by default**
  (equivalent to `allow_islands: true;`). `allow_islands: false;` rejects a
  graph with disconnected components; `allow_islands: with_start;` requires
  every component to contain a start state.
- Default style blocks: `state: { ... };`, `start_state: { ... };`,
  `end_state: { ... };`, `terminal_state: { ... };`, `active_state: { ... };`,
  `transition: { ... };`, `graph: { ... };`.

### State declarations (styling one state)
```fsl
state Error: { background-color: red; text-color: white; shape: box; };
Ok 'fail' -> Error;
Error 'clear' -> Ok;
```
Item keys: `label`, `color`, `text-color`, `background-color`, `border-color`,
`shape`, `corners` (`regular rounded lined`), `line-style` (`solid dotted
dashed`), `image` ("url"), `url` ("url"), `property`. Colors: SVG names
(`red`, `cornflowerblue`), or hex `#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa`.
Shapes: graphviz names (`box circle ellipse diamond hexagon cylinder note
plaintext` …). A `state` declaration only styles; it does not create edges.

### Edge decoration block
Attach display data to an edge with a brace block after the arrow (keep
*actions/weights* before the arrow). One block holds **either** a run of
`arc_label`/`head_label`/`tail_label` items, **or** a single `edge-color`,
**or** a single `line-style` — these three groups cannot be combined in one
block.
```fsl
A -> { arc_label: sync; head_label: out; } B;
B -> { edge-color: blue; } A;
```

### Groups (named lists)
Declare a reusable set with `&name`, then use `&name` as a transition endpoint;
it expands to one edge per member.
```fsl
&lit: [Red Yellow Green];
&lit 'reset' -> Off;
```
Members may nest another group (`&child`) or spread it flat (`...&child`). A
group may also be styled: `state &lit: { color: gold; };`.

### Boundary hooks (in FSL text)
Register an action to fire when control crosses a state/group boundary:
```fsl
Idle 'start' -> Working;
on enter Working do 'startTimer';
on exit  Working do 'stopTimer';
```
`enter`/`exit`, subject is a state or `&group`, action is single-quoted. (This
is distinct from jssm's JavaScript hook API, which lives in code, not FSL text.)

### Layout hints (no colon)
`arrange [A B];` `arrange-start [A];` `arrange-end [B];` `oarrange […];`
`farrange […];` — ordering hints for rendering only.

### Global properties
`property cost default 0;` / `property size required;` — declare a machine
property. A per-state `property: name value;` (inside a `state {}` block)
requires the name to be globally declared first.

### Comments
`// line comment` to end of line; `/* block comment */` anywhere. Trailing
comments after a statement are fine.

## Agent directives

- **Use the exact state and action names the task gives you**, including their
  case and word form. If the request says states `open` and `closed`, write
  `open` - not `Open`, not `Opened`. Invented paraphrases are the most common
  correctness failure in otherwise-valid machines.
- **End every statement with `;`.** Missing semicolons are the top syntax
  error.
- **Actions: single quotes, before the arrow.** `S 'act' -> T;`. Never double
  quotes for an action; never place the action after the arrow.
- **Names with spaces or punctuation: double-quoted strings.** Bare atoms allow
  letters, digits, and `. _ ! $ ^ * ? ,` (and more), but **not spaces or
  hyphens**; quote such names.
- **Model involuntary events as forced (`~>`), voluntary choices as `->`.**
  Errors, timeouts, and external interrupts are `~>`; a user/actor decision is
  `->`. Reserve `=>` for marking the primary happy path.
- **Let start and terminal states be derived** unless the machine needs
  otherwise: start = `start_states:` or first-mentioned; terminal = any state
  with no exit. Add `start_states:` only when the first-mentioned state is not
  the real entry point.
- **Do not invent syntax.** No loops, conditionals, variables, guards,
  expressions, or nested machines — FSL has none. If a concept is not in this
  guide, do not emit it. In particular `machine_definition:` and a
  `hooks: open;` attribute are **not** accepted by this version; omit them.
- **No `+N` cycle targets.** `A -> +1;` compiles, but into an object
  pseudo-state (`{"key":"cycle","value":1}`) visible in the state and edge
  lists; breakage surfaces downstream, not at compile time. Spell the target
  state out.
- **One machine per document.** Put metadata first, then transitions, then
  optional styling — though order is not enforced.
- **Prefer ASCII arrows** over the Unicode equivalents.
