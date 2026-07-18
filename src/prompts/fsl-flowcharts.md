# Flowcharts in FSL

Flowcharts map cleanly onto state machines: every box is a state, every arrow
is a transition, and every decision is a state whose outgoing edges carry the
answers. This section shows the idiom. Every fenced example below is a
complete FSL document that compiles on its own.

## The mapping

| Flowchart element | FSL |
|---|---|
| Process box | a plain state (default box shape) |
| Decision diamond | a state declared `shape: diamond;` with one labeled edge per outcome |
| Start terminal | your first state, styled so it reads as an entry point |
| End terminal | a state with no outgoing edges, declared `shape: doublecircle;` |
| Arrow label | an action label in single quotes BEFORE the arrow: `'yes' ->` |
| Failure/exception arrow | a forced transition `~>` |

## Decisions

One labeled edge per outcome, and the label goes **before** the arrow.
Decorations placed after the arrow silently do not bind - this is the single
most common flowchart-authoring mistake in FSL.

```fsl
Validate 'ok' -> Ship;
Validate 'bad' -> Reject;

state Validate: { shape: diamond; };
```

## Terminals

An end terminal is just a state with no outgoing edges; give it
`doublecircle` so it reads as terminal. Style the start state so the eye
finds the entry point. Note: a `state` declaration alone never creates a
state - `state X : {};` and `state X : { shape: box; };` alike are silently
dropped unless `X` appears in at least one edge. Only edges register states;
a self-loop `X -> X;` is the minimal way to make an edgeless box exist.
Properties are for styling, not existence.

```fsl
Start -> Working;
Working -> Done;

state Start: { shape: circle; background-color: palegreen; };
state Done:  { shape: doublecircle; };
```

## Failure paths

Keep the happy path on `->` and exceptional flow on `~>` (forced
transitions); they render distinctly, so main flow and failure flow separate
visually for free. Transitions chain: `a -> b -> c;` is three states and two
edges in one statement.

```fsl
Fetch -> Parse -> Save;
Fetch ~> Failed;
Parse ~> Failed;
```

## Loops

Rework cycles are ordinary edges pointing back; the labels keep the diagram
readable.

```fsl
Draft -> Review;
Review 'approve' -> Publish;
Review 'revise'  -> Draft;
```

## Layout and themes

`flow: down;` gives the classic top-to-bottom flowchart read; `flow: right;`
suits pipelines. Name the machine so renders are titled. Themes available:
`default ocean modern plain bold`.

```fsl
machine_name: "Signup";
flow: down;

Landing -> Form -> Submitted;
```

## Gotchas (all empirically verified)

- Action labels and decorations bind only BEFORE the arrow; after the arrow
  they are silently ignored - with ZERO diagnostics. Validation and lint
  both pass; only review catches the misplacement.
- A `state` declaration never creates a state - `state X : {};` and
  `state X : { shape: box; };` are both silently dropped unless `X` appears
  in an edge. Use a self-loop `X -> X;` to register an isolated state;
  properties style, they do not register.
- Two unlabeled edges with the same source and target collide, even across
  different arrow kinds. Two parallel edges are legal when both carry
  distinct action labels.
- Apostrophes inside single-quoted labels need escaping: `'it\'s done'`.
- Numeric cycle targets like `+1` compile - into an object pseudo-state
  (`{"key":"cycle","value":1}`) that appears in the state and edge lists,
  breaking things downstream rather than at compile time. Spell states out
  in flowcharts.

## Rendering flowcharts

Request `format: "png"` with `width` 640 or more for chat legibility;
`format: "gif"` (keep `maxFrames` at or under 20) animates a random walk
through the flow, which makes a good quick demo. If no raster backend is
available the render degrades to SVG plus a note.

## Worked example: an approval flowchart

```fsl
machine_name: "Expense Approval";
flow: down;

Submitted -> Validating;
Validating 'complete'   -> ManagerReview;
Validating 'incomplete' -> Returned;
Returned 'resubmit' -> Submitted;
ManagerReview 'approve' -> Paid;
ManagerReview 'reject'  -> Returned;
ManagerReview ~> Escalated;
Escalated 'resolve' -> ManagerReview;

state Submitted:     { background-color: palegreen; };
state Validating:    { shape: diamond; };
state ManagerReview: { shape: diamond; };
state Paid:          { shape: doublecircle; background-color: palegreen; };
state Returned:      { line-style: dotted; };
state Escalated:     { background-color: mistyrose; };
```

Submitted is the start terminal; Paid is the end terminal; both diamonds
carry one labeled edge per outcome; the escalation path rides `~>`; the
rework loop returns to Submitted. Render it with `flow: down` and it reads
exactly like the whiteboard version.
