// GENERATED FILE - DO NOT EDIT.
// Source: src/prompts/fsl-llms-draft.md + src/prompts/fsl-flowcharts.md + src/prompts/graphviz-primer.md
// Regenerate: node src/build_js/generate_guide_content.js (runs automatically before tsc)
/* eslint-disable @typescript-eslint/no-inferrable-types */

/** The "Flowcharts in FSL" idiom guide, verbatim from src/prompts/fsl-flowcharts.md. */
export const GUIDE_FLOWCHARTS: string = `# Flowcharts in FSL

Flowcharts map cleanly onto state machines: every box is a state, every arrow
is a transition, and every decision is a state whose outgoing edges carry the
answers. This section shows the idiom. Every fenced example below is a
complete FSL document that compiles on its own. The fsl_scaffold tool returns
ready-to-edit starting documents for these idioms.

## The mapping

| Flowchart element | FSL |
|---|---|
| Process box | a plain state (default box shape) |
| Decision diamond | a state declared \`shape: diamond;\` with one labeled edge per outcome |
| Start terminal | your first state, styled so it reads as an entry point |
| End terminal | a state with no outgoing edges, declared \`shape: doublecircle;\` |
| Arrow label | an action label in single quotes BEFORE the arrow: \`'yes' ->\` |
| Failure/exception arrow | a forced transition \`~>\` |

## Decisions

One labeled edge per outcome, and the label goes **before** the arrow.
Decorations placed after the arrow silently do not bind - this is the single
most common flowchart-authoring mistake in FSL.

\`\`\`fsl
Validate 'ok' -> Ship;
Validate 'bad' -> Reject;

state Validate: { shape: diamond; };
\`\`\`

## Terminals

An end terminal is just a state with no outgoing edges; give it
\`doublecircle\` so it reads as terminal. Style the start state so the eye
finds the entry point. Note: a \`state\` declaration alone never creates a
state - \`state X : {};\` and \`state X : { shape: box; };\` alike are silently
dropped unless \`X\` appears in at least one edge. Only edges register states;
a self-loop \`X -> X;\` is the minimal way to make an edgeless box exist.
Properties are for styling, not existence.

\`\`\`fsl
Start -> Working;
Working -> Done;

state Start: { shape: circle; background-color: palegreen; };
state Done:  { shape: doublecircle; };
\`\`\`

## Failure paths

Keep the happy path on \`->\` and exceptional flow on \`~>\` (forced
transitions); they render distinctly, so main flow and failure flow separate
visually for free. Transitions chain: \`a -> b -> c;\` is three states and two
edges in one statement.

\`\`\`fsl
Fetch -> Parse -> Save;
Fetch ~> Failed;
Parse ~> Failed;
\`\`\`

## Loops

Rework cycles are ordinary edges pointing back; the labels keep the diagram
readable.

\`\`\`fsl
Draft -> Review;
Review 'approve' -> Publish;
Review 'revise'  -> Draft;
\`\`\`

## Layout and themes

\`flow: down;\` gives the classic top-to-bottom flowchart read; \`flow: right;\`
suits pipelines. Name the machine so renders are titled. Themes available:
\`default ocean modern plain bold\`.

\`\`\`fsl
machine_name: "Signup";
flow: down;

Landing -> Form -> Submitted;
\`\`\`

## Gotchas (all empirically verified)

- Action labels and decorations bind only BEFORE the arrow; after the arrow
  they are silently ignored - with ZERO diagnostics. Validation and lint
  both pass; only review catches the misplacement.
- A \`state\` declaration never creates a state - \`state X : {};\` and
  \`state X : { shape: box; };\` are both silently dropped unless \`X\` appears
  in an edge. Use a self-loop \`X -> X;\` to register an isolated state;
  properties style, they do not register.
- Two unlabeled edges with the same source and target collide, even across
  different arrow kinds. When you need parallel edges, give both distinct
  action labels - that is the verified-legal form.
- Apostrophes inside single-quoted labels need escaping: \`'it\\'s done'\`.
- Numeric cycle targets like \`+1\` compile - into an object pseudo-state
  (\`{"key":"cycle","value":1}\`) that appears in the state and edge lists,
  breaking things downstream rather than at compile time. Spell states out
  in flowcharts.

## Rendering flowcharts

Request \`format: "png"\` with \`width\` 640 or more for chat legibility;
\`format: "gif"\` (keep \`maxFrames\` at or under 20) animates a random walk
through the flow, which makes a good quick demo. If no raster backend is
available the render degrades to SVG plus a note.

## Worked example: an approval flowchart

\`\`\`fsl
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
\`\`\`

Submitted is the start terminal; Paid is the end terminal; both diamonds
carry one labeled edge per outcome; the escalation path rides \`~>\`; the
rework loop returns to Submitted. Render it with \`flow: down\` and it reads
exactly like the whiteboard version.
`;

/** The graphviz DOT authoring primer, verbatim from src/prompts/graphviz-primer.md. */
export const GUIDE_GRAPHVIZ: string = `# Graphviz DOT (authoring guide for LLMs)

You write DOT, the graph description language graphviz reads, to lay out and
render diagrams. This guide is verified against graphviz 15.1.1 (the version
this server's renderer reports). Emit only constructs described here; do not
import syntax from other DSLs - mermaid, PlantUML, and D2 all look superficially
similar and none of their syntax parses here. Every fenced \`dot\` example below
is a complete document that renders on its own.

DOT is not FSL. FSL describes a state machine and graphviz is one of its
rendering backends; DOT describes a picture directly and knows nothing about
states, actions, or transitions. Use DOT when you want control over the drawing
itself.

## Semantic model - read this first

A DOT document is exactly one graph declaration wrapping a list of
**statements**. Statements are separated by \`;\`. Whitespace and newlines are
insignificant.

- **Nodes** are bare identifiers (\`fetch\`, \`app\`, \`user_id\`). You do not declare
  them to use them - a node exists as soon as any statement mentions it.
- **Edges** connect nodes with an **edge operator**, and which operator is legal
  is decided by the graph kind.
- **Attributes** are \`key=value\` pairs in square brackets. They are the entire
  styling mechanism; there is nothing else.
- **Subgraphs** are brace-wrapped statement lists. A subgraph whose name starts
  with \`cluster\` is drawn as a box; any other subgraph only groups.

### The graph kind and its edge operator - this is the crux

| Declaration | Edge operator | Drawn as |
|---|---|---|
| \`digraph\` | \`->\` | arrows, directed |
| \`graph\`   | \`--\` | plain lines, undirected |

The operator must match the kind. Mixing them is a **hard parse failure**, not a
warning - verified in 15.1.1, \`graph { a -> b; }\` returns
\`syntax error in line 1 near '->'\` and \`digraph { a -- b; }\` returns
\`syntax error in line 1 near '--'\`. **This is the single most common DOT
authoring mistake.** Decide the kind first, then never type the other operator
in that document.

\`\`\`dot
digraph pipeline {
  fetch -> parse -> store;
}
\`\`\`

\`\`\`dot
graph mesh {
  a -- b;
  b -- c;
  c -- a;
}
\`\`\`

A chain (\`fetch -> parse -> store;\`) is one statement and two edges. Both graph
kinds may be prefixed with \`strict\`, which collapses duplicate edges between the
same pair into one; without \`strict\`, \`graph { a -- b; a -- b; }\` draws two
parallel lines. Verified both ways.

The graph may be named (\`digraph pipeline { ... }\`), and the name may be a
quoted string (\`digraph "My Graph" { ... }\`). The name is optional and does not
appear in the drawing; use \`label\` for a visible title.

### Identifiers

An identifier is one of: a bare atom of letters, digits, and underscores that
does not start with a digit; a numeral; a double-quoted string; or an HTML
string in angle brackets. **Hyphens are not legal in bare atoms** - verified,
\`digraph { my-node -> b; }\` is a syntax error. Quote any name with a hyphen,
space, or punctuation:

\`\`\`dot
digraph quoted {
  "my-node" -> "some other node";
  "my-node" -> plain_name;
}
\`\`\`

Keywords (\`graph\`, \`digraph\`, \`node\`, \`edge\`, \`subgraph\`, \`strict\`) are
case-insensitive; identifiers are case-sensitive, so \`Alpha\` and \`alpha\` are two
different nodes.

Comments are \`//\` to end of line, \`/* ... */\` anywhere, and \`#\` at the start of
a line. All three are verified.

## The three statement forms

### 1. Node statement - \`name [attrs];\`

Creates the node if it does not exist and applies attributes to it. Position in
the document does not matter: a node statement after the edge that first
mentioned the node still applies (verified - \`digraph { a -> b; a [shape=diamond]; }\`
draws \`a\` as a diamond).

### 2. Edge statement - \`a -> b [attrs];\`

The attribute list decorates the edge, not the endpoints. A target may be a
brace group, which fans out to one edge per member: \`a -> { b c };\` is two
edges.

### 3. Attribute statement - \`node [attrs];\` / \`edge [attrs];\` / \`graph [attrs];\`

Sets **defaults for items created after this point in the document**. This is
positional and it is the one place where statement order matters. Verified: in
\`digraph { a -> b; node [shape=diamond]; c; }\`, \`a\` and \`b\` stay ellipses and
only \`c\` is a diamond. Put your \`node [...]\` and \`edge [...]\` defaults at the
top.

Graph-level attributes may also be written bare, without brackets:
\`rankdir=LR;\` and \`graph [rankdir=LR];\` are equivalent.

\`\`\`dot
digraph defaults_first {
  rankdir = LR;
  node [shape=box, style="rounded,filled", fillcolor="#eef2ff", fontname="Helvetica", fontsize=11];
  edge [color="#64748b", arrowhead=vee];

  submit [label="Submit form"];
  review [label="Review", shape=diamond, fillcolor="#fef9c3"];
  done   [label="Done", shape=doublecircle, fillcolor="#dcfce7"];

  submit -> review;
  review -> done [label="approved"];
  review -> submit [label="changes requested", style=dashed];
}
\`\`\`

## The attributes that matter

Graphviz has hundreds of attributes. These carry almost all the weight:

| Attribute | Applies to | Notes |
|---|---|---|
| \`label\` | node, edge, graph, cluster | Display text. Quote anything with a space. On a graph or cluster it is the title. |
| \`shape\` | node | \`box ellipse circle diamond hexagon cylinder note folder box3d component plaintext point doublecircle Mdiamond record Mrecord none\` - all verified. |
| \`color\` | node, edge, cluster | Outline color (and cluster border). |
| \`fillcolor\` + \`style=filled\` | node, cluster | Interior color. \`fillcolor\` alone does nothing without \`style=filled\`. |
| \`style\` | node, edge, cluster | Node/cluster: \`filled rounded dashed dotted bold invis\`. Edge: \`solid dashed dotted bold invis\`. Combine with a **quoted** comma list: \`style="rounded,filled"\`. |
| \`rankdir\` | graph only | \`TB\` (default) \`LR\` \`BT\` \`RL\`. Graph-level only; setting it on a node or cluster does nothing. |
| \`fontname\` \`fontsize\` \`fontcolor\` | node, edge, graph | Set once as \`node [...]\` / \`edge [...]\` defaults. |
| \`penwidth\` \`peripheries\` | node, edge | Line weight, and number of outlines. |
| \`arrowhead\` \`dir\` | edge | \`dir=none both back\`; \`arrowhead=normal vee empty odot none\`. |
| \`URL\` \`tooltip\` | node, edge | Become \`xlink:href\` and \`<title>\` in SVG output. |

Colors are X11/SVG names (\`red\`, \`lightgrey\`, \`cornflowerblue\`) or hex
(\`"#eef2ff"\`). Quote hex values - the \`#\` starts a comment at line start and
quoting is always safe. A gradient is a color pair (\`bgcolor="white:lightblue"\`,
verified) and a two-tone fill is a weighted list
(\`fillcolor="yellow;0.5:orange"\`, verified).

Label text escapes, all verified: \`\\n\` centers a new line, \`\\l\` left-justifies
the line before it, \`\\r\` right-justifies it, and \`\\N\` expands to the node's own
name. Strings concatenate with \`+\`: \`label="one " + "two"\`.

## Clusters

A subgraph is drawn as a labeled box **only if its name begins with \`cluster\`**.
This is the most consequential silent failure in DOT: \`subgraph tier { ... }\`
parses, renders, and produces no box at all, with zero diagnostics. Verified in
15.1.1: \`cluster_x\`, \`clusterx\`, \`Cluster_x\`, and \`CLUSTER_x\` all produce a
cluster box; \`x\` and an anonymous subgraph do not. **Write \`cluster_name\`** - it
is the form every version and every tool recognizes.

A node belongs to the first cluster that names it. Listing the same node in two
clusters does not duplicate or move it (verified: the second listing is a no-op).

\`\`\`dot
digraph services {
  compound = true;
  rankdir  = LR;
  node [shape=box, style=filled, fillcolor=white, fontname="Helvetica"];

  subgraph cluster_web {
    label = "Web tier";
    style = "rounded,filled";
    color = "#e2e8f0";
    nginx;
    app;
  }

  subgraph cluster_data {
    label = "Data tier";
    style = "rounded,filled";
    color = "#e2e8f0";
    postgres;
    redis;
  }

  nginx -> app;
  app -> postgres [lhead=cluster_data, label="queries"];
  app -> redis;
}
\`\`\`

Edges attach to nodes, never to clusters. To make an edge *look* like it lands
on a cluster, set \`compound=true\` on the graph and then \`lhead=cluster_name\` (or
\`ltail=\`) on the edge; graphviz clips the edge at the cluster border. Verified:
\`compound=true\` measurably changes the drawn path; without it, \`lhead\` is
silently ignored and produces no warning.

Clusters nest. \`subgraph cluster_outer { subgraph cluster_inner { ... } }\`
renders as boxes inside boxes.

## Record labels

\`shape=record\` turns the label into a nested layout of fields. \`|\` splits
fields, \`{ }\` flips the split direction, and \`<name>\` at the start of a field
declares a **port** that edges can aim at with \`node:port\`. \`Mrecord\` is the
same with rounded corners.

\`\`\`dot
digraph schema {
  rankdir = LR;
  node [shape=record, fontname="Helvetica", fontsize=11];

  user  [label="{ User | <id> id : uuid | name : text }"];
  order [label="{ Order | <uid> user_id : uuid | total : cents }"];

  order:uid -> user:id [label="references"];
}
\`\`\`

A compass point may follow the port: \`order:uid:e -> user:id:w\` aims from the
east side to the west side. Compass points also work without ports (\`a:n -> b:s\`).

Record field orientation follows \`rankdir\`: under the default \`TB\` the top-level
fields sit side by side, and under \`rankdir=LR\` they stack vertically. Verified
by measuring the drawn node - \`{x|y|z}\` is 76x45 points under \`TB\` and 62x83
under \`LR\`. Use \`{ }\` to force the direction you want rather than relying on the
default.

## HTML-like labels

Wrap the label in **angle brackets, not quotes**, and graphviz parses a small
HTML subset - tables, rows, cells, \`<B>\`, \`<I>\`, \`<FONT>\`. Cells take a \`PORT\`
just like record fields. Pair it with \`shape=plaintext\` or \`shape=none\` so the
node's own outline does not fight the table's.

The quotes-versus-angles distinction is silent and total: \`label="<B>bold</B>"\`
renders the literal characters \`<B>bold</B>\` as text (verified - the SVG
contains \`&lt;B&gt;\`), while \`label=<<B>bold</B>>\` renders actual bold text.

\`\`\`dot
digraph html_label {
  node [shape=plaintext, fontname="Helvetica"];

  orders [label=<
    <TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4">
      <TR><TD COLSPAN="2" BGCOLOR="#e2e8f0"><B>orders</B></TD></TR>
      <TR><TD PORT="id">id</TD><TD>uuid</TD></TR>
      <TR><TD PORT="total">total</TD><TD>cents</TD></TR>
    </TABLE>
  >];

  ledger [shape=box];
  orders:total -> ledger [label="posts to"];
}
\`\`\`

HTML attribute values inside the label must be double-quoted, and the tags are
conventionally uppercase. Unclosed tags are a parse error, unlike browser HTML.

## Ranking and layout control

Under the \`dot\` engine every node gets a rank, and rank becomes the row (or
column, under \`rankdir=LR\`). These control it:

- \`{ rank=same; a; b; }\` - an anonymous subgraph forcing nodes onto one rank.
  Also \`rank=min\`, \`rank=max\`, \`rank=source\`, \`rank=sink\`. All verified.
- \`constraint=false\` on an edge - draw it but do not let it influence ranking.
  This is how you add a back edge without stretching the graph.
- \`weight=N\` on an edge - higher weight pulls the endpoints closer and
  straighter. Use it to keep a happy path in a vertical line.
- \`minlen=N\` on an edge - minimum number of ranks the edge must span.
- \`newrank=true\` on the graph - required for \`rank=same\` to work across cluster
  boundaries.
- \`ordering=out\` on the graph - preserve the document order of a node's
  out-edges left to right.

\`\`\`dot
digraph ranked {
  node [shape=box, fontname="Helvetica"];

  { rank=min; inbox; }
  { rank=max; archive; }

  inbox -> triage;
  triage -> approve;
  triage -> reject;
  approve -> archive;
  reject  -> archive;

  { rank=same; approve; reject; }

  triage -> inbox [constraint=false, style=dashed, label="reopen"];
}
\`\`\`

Spacing knobs, all graph-level: \`nodesep\` (within a rank), \`ranksep\` (between
ranks), \`splines\` (\`spline\` default, \`ortho\` for right angles, \`polyline\`,
\`line\`, \`curved\`), \`concentrate=true\` to merge parallel edge runs, and
\`size="w,h"\` with \`ratio\` to bound the drawing.

## Choosing a layout engine

The engine decides the whole geometry. Set it in the document with
\`layout=name;\` - verified: a document-level \`layout\` attribute overrides the
engine the caller requested, so state it explicitly when the choice matters.

| Engine | Reach for it when |
|---|---|
| \`dot\` | Anything with a direction: flowcharts, DAGs, dependency trees, state machines, org charts. The default and correct answer most of the time. |
| \`neato\` | Undirected graphs under roughly 100 nodes where relatedness, not flow, is the point. Spring model. Pair with \`overlap=false\`. |
| \`fdp\` | Same idea as \`neato\` but scales further and honors clusters. |
| \`circo\` | Cyclic structures: ring topologies, round-robin protocols, cycle-heavy graphs. |
| \`twopi\` | One clear center with everything radiating out. Set \`root=nodename\`. |
| \`osage\` | Packing clusters into an array; the drawing is the cluster arrangement, not the edges. |
| \`patchwork\` | Squarified treemap of node \`area\` values. Proportions, not connections. |

\`\`\`dot
graph neighbors {
  layout  = neato;
  overlap = false;
  node [shape=circle, fontname="Helvetica"];

  a -- b;
  a -- c;
  b -- c;
  c -- d;
  d -- e;
}
\`\`\`

\`\`\`dot
digraph token_ring {
  layout = circo;
  node [shape=box, style=rounded, fontname="Helvetica"];

  n1 -> n2 -> n3 -> n4 -> n5 -> n1;
  n1 -> n3 [style=dashed, label="bypass"];
}
\`\`\`

\`\`\`dot
digraph radial {
  layout = twopi;
  root   = core;
  node [shape=circle, fontname="Helvetica"];

  core -> auth;
  core -> billing;
  core -> search;
  auth -> tokens;
  auth -> sessions;
  billing -> invoices;
}
\`\`\`

## Rendering

DOT source goes to this server's graphviz render tool, which returns SVG by
default and can rasterize to PNG or JPEG. Request a raster with a \`width\` of 640
or more for chat legibility. If no raster backend exists in the runtime the
render degrades to SVG plus a note rather than failing.

Invalid DOT comes back as structured diagnostics, never as an exception, so a
parse error is something to read and fix, not something to work around.

## Worked example: a release pipeline

\`\`\`dot
digraph release {
  label     = "Release pipeline";
  labelloc  = t;
  fontname  = "Helvetica";
  fontsize  = 16;
  rankdir   = TB;
  compound  = true;

  node [shape=box, style="rounded,filled", fillcolor=white, fontname="Helvetica", fontsize=11];
  edge [fontname="Helvetica", fontsize=9, color="#475569"];

  commit [label="Commit", shape=circle, fillcolor="#dcfce7"];

  subgraph cluster_ci {
    label = "CI";
    style = "rounded,filled";
    color = "#f1f5f9";
    lint;
    unit  [label="Unit tests"];
    build [label="Build"];
  }

  subgraph cluster_release {
    label = "Release";
    style = "rounded,filled";
    color = "#f1f5f9";
    tag;
    publish [label="Publish to npm"];
  }

  gate    [label="All green?", shape=diamond, fillcolor="#fef9c3"];
  blocked [label="Blocked", shape=box, fillcolor="#fee2e2", style="rounded,filled"];
  done    [label="Released", shape=doublecircle, fillcolor="#dcfce7"];

  commit -> lint;
  lint  -> unit;
  unit  -> build;
  build -> gate [ltail=cluster_ci];

  gate -> tag     [label="yes", lhead=cluster_release];
  gate -> blocked [label="no", style=dashed, color="#b91c1c"];
  blocked -> commit [label="fix", constraint=false, style=dashed];

  tag -> publish;
  publish -> done;

  { rank=same; gate; blocked; }
}
\`\`\`

Every construct in it is covered above: graph-level title, defaults declared
before use, two clusters with the \`cluster_\` prefix, \`compound=true\` with
\`lhead\`/\`ltail\` so the edges clip at the cluster borders, a diamond decision
node, a non-constraining dashed rework edge, and \`rank=same\` pinning the
decision beside its failure state.

## Gotchas (all empirically verified)

- **Unknown attribute names are silently ignored.** \`a [nonesuch=7];\` renders
  with zero diagnostics. A misspelled attribute name is invisible; check the
  spelling against the table above rather than trusting a clean render.
- **A subgraph without a \`cluster\` name prefix draws no box**, silently.
- **\`lhead\`/\`ltail\` do nothing without \`compound=true\`** on the graph, silently.
- **\`fillcolor\` does nothing without \`style=filled\`.**
- **An unknown shape falls back to a box with a warning**
  (\`using box for unknown shape trapezoidal\`), and an unknown color warns
  (\`notacolor is not a known color.\`). Warnings do not fail the render, so read
  them.
- **Attribute defaults are positional; node and edge statements are not.**
  \`node [shape=box];\` affects only what comes after it. \`a [shape=box];\` affects
  node \`a\` wherever it appears.
- **Bare identifiers cannot contain hyphens.** \`my-node\` is a syntax error;
  \`"my-node"\` is fine.
- **HTML-like labels need angle brackets.** Quoted markup renders as literal
  characters with no warning.
- **\`style\` lists must be quoted.** \`style="rounded,filled"\`, not
  \`style=rounded,filled\`, which ends the attribute at the comma.
- **Other DSLs do not parse.** Mermaid's \`graph TD; A[Start] --> B[End];\` fails
  with \`syntax error in line 1 near ';'\`. There is no \`-->\`, no \`[Label]\` node
  shorthand, no \`%%\` comment, and no \`end\` keyword.

## Agent directives

- **Pick \`digraph\`/\`->\` or \`graph\`/\`--\` before writing anything**, and keep the
  pairing consistent through the whole document.
- **Use the exact node names the task gives you**, including case. Identifiers
  are case-sensitive.
- **Quote every string that is not a bare atom** - labels, hex colors, style
  lists, and any name with a space, hyphen, or punctuation.
- **Declare \`node [...]\` and \`edge [...]\` defaults at the top**, before the
  statements they should affect.
- **Prefix every box-drawing subgraph with \`cluster_\`.**
- **Set \`compound=true\` whenever you use \`lhead\` or \`ltail\`.**
- **Reach for \`dot\` unless the diagram has no direction.** Change engines with a
  document-level \`layout=\` so the choice travels with the source.
- **Do not invent syntax.** DOT has no variables, conditionals, loops, includes,
  functions, or expressions. If a construct is not in this guide, do not emit it.
- **One graph per document.** A DOT file holds exactly one top-level \`graph\` or
  \`digraph\`.
`;

/** The full FSL primer plus the flowchart guide, for agents new to FSL. */
export const GUIDE_LANGUAGE: string = `# FSL — Finite State Language (authoring guide for LLMs)

You write FSL, the text language of the \`jssm\` library, to define finite-state
machines. This guide is verified against jssm 5.162.10. Emit only constructs
described here; do not import syntax from other DSLs or programming languages.

## Semantic model — read this first

An FSL document is a list of **statements**, each ending in a semicolon \`;\`.
Most statements are **transitions** between **states**. Whitespace and newlines
are insignificant; the \`;\` is the only statement separator.

- **States** are bare identifiers (\`Idle\`, \`Green\`, \`LoggedIn\`). You do not
  declare them to use them — a state exists as soon as a transition mentions
  it. Multi-word or punctuated names must be double-quoted strings
  (\`"Traffic Light"\`).
- **Transitions** connect states with an **arrow**. The arrow encodes a
  *direction* and a *kind*.
- **The start state** is whatever the \`start_states:\` directive names, or, in
  its absence, the **first state mentioned** in the document.
- **A terminal (final) state** is any state with no outgoing transition. You
  do not mark it; jssm derives it. (An \`end_states:\` directive marks
  *voluntary success* endpoints, which is a separate, optional concept.)

### The three transition kinds — this is the crux

| Arrow | Kind | Runtime meaning |
|-------|------|-----------------|
| \`->\`  | legal  | An ordinary allowed move. A driver may take it. |
| \`=>\`  | main   | The primary / "happy path". Also an ordinary allowed move at runtime — \`=>\` is \`->\` plus a "this is the main path" tag used for layout and documentation. It is **not** a different runtime mechanism. |
| \`~>\`  | forced | An **involuntary** edge: errors, timeouts, crashes, external interrupts. Naming the *target* is refused (\`transition('Failed')\` returns false), but firing the edge's *action* traverses it, and forced actions are listed in \`actions()\` / \`list_exit_actions()\`. The API's \`force_transition\` also traverses it. |

Use \`~>\` for anything the actor does not opt into. Model "the job crashed",
"the session timed out", "the payment was reversed" as forced edges — never as
\`->\`. This is the single most common FSL authoring mistake.

Verified (5.162.10): for \`Working 'crash' ~> Failed;\`, \`action('crash')\`
returns true and traverses the forced edge, and \`crash\` appears in \`actions()\`
/ \`list_exit_actions()\` (so it shows up in simulation's legal next moves). A
target-name \`transition('Failed')\` still returns false. \`force_transition\`
bypasses legality but not connectivity — the edge must still exist.

### Direction

A leftward glyph puts the source on the **right**. Two-headed glyphs make two
independent edges at once.

- \`A -> B;\` one edge A→B. \`A <- B;\` one edge B→A.
- \`A <-> B;\` two edges: A→B and B→A (both legal).

The kind letter is independent of direction, so every kind has three glyphs:

- legal: \`->\` \`<-\` \`<->\`
- main: \`=>\` \`<=\` \`<=>\`
- forced: \`~>\` \`<~\` \`<~>\`

**Mixed bidirectionals** give each direction its own kind. The left glyph
carries the leftward edge's kind, the right glyph the rightward edge's:
\`<-=>\` \`<=->\` \`<-~>\` \`<~->\` \`<=~>\` \`<~=>\`. Example — \`A <=-> B;\` makes A→B
*legal* (right glyph \`->\`) and B→A *main* (left glyph \`<=\`). These are rarely
needed; prefer two plain statements unless you specifically want one line.

Unicode arrow glyphs (\`→ ← ↔ ⇒ ⇐ ⇔ ↛ ↚ ↮\`) are accepted but **prefer ASCII**.

## Actions — named, single-quoted, BEFORE the arrow

An **action** is a named event that triggers a transition. Write it as a
single-quoted label placed **before** the arrow:

\`\`\`fsl
Idle 'insert coin' -> Paid;
\`\`\`

This binds the action \`insert coin\` to the edge Idle→Paid. At runtime, firing
that action from \`Idle\` moves the machine to \`Paid\`.

**Decorations placed *after* the arrow do NOT bind to a forward edge.** This is
verified and it is exactly the trap the previous guidance fell into:

- \`A 'go' -> B;\` binds action \`go\`  (fires A→B). ✅
- \`A -> 'go' B;\` binds **nothing** — the machine reports no action \`go\`. ❌

The same holds for probabilities (below). **Put actions and weights before the
arrow.** The misplacement produces **zero diagnostics**: validation and lint
both pass and the machine compiles with the decoration silently unbound. No
tool catches this — only review does.

Single quotes are for actions only. Double quotes make a string used as a
state/label name. \`A "go" -> B;\` is a **syntax error** — \`"go"\` is not an
action.

### Chains bind per hop

A chain is several arrows on one line; each action attaches to the hop it
precedes:

\`\`\`fsl
Green 'tick' => Yellow 'tick' => Red 'tick' => Green;
\`\`\`

\`tick\` from Green→Yellow, another \`tick\` Yellow→Red, another Red→Green. Verified:
driving \`tick\` three times cycles Green→Yellow→Red→Green.

## State lists — fan-in, fan-out, cross-product

A bracketed list \`[a b c]\` stands in for several states at once and expands to
one edge per member. It may appear as source, target, or both, and may carry a
pre-arrow action.

\`\`\`fsl
[Red Yellow Green] 'reset' -> Off;   // fan-in: 3 edges, each →Off, action reset
Off 'power' -> [Red];                // fan-out (single here)
\`\`\`

\`[a b] -> [c d];\` expands to the cross product (a→c, a→d, b→c, b→d).

## Probabilities and timing (for simulation)

A percentage weights a transition for stochastic simulation. Like actions it
goes **before** the arrow:

\`\`\`fsl
Rolling 70% -> Win;
Rolling 30% -> Lose;
\`\`\`

Verified: \`A 60% -> B\` attaches weight 60; \`A -> 60% B\` attaches nothing.

A timed edge fires after a delay: \`A 'go' -> after 5s B;\` (units: \`ms\`, \`s\`,
\`m\`/\`min\`, \`h\`, \`d\`, \`w\`, plus long forms like \`seconds\`, \`minutes\`).

## Worked examples (each compiles and runs as described)

Door with a lock:
\`\`\`fsl
Closed 'open'   -> Opened;
Opened 'close'  -> Closed;
Closed 'lock'   -> Locked;
Locked 'unlock' -> Closed;
\`\`\`

Job with an involuntary failure path and forced recovery:
\`\`\`fsl
start_states: [Idle];
Idle    'start'  -> Running;
Running 'finish' -> Done;
Running 'crash'  ~> Failed;
Failed           ~> Idle;
\`\`\`
\`crash\` and the \`Failed→Idle\` recovery are forced: an actor never *chooses* to
crash. \`Done\` and \`Failed\` (which has only a forced exit) behave differently —
\`Done\` is terminal, \`Failed\` is not, because a forced exit still counts as an
exit.

Approval flow with metadata and a voluntary end state:
\`\`\`fsl
machine_name:    "Approval Flow";
machine_version: 1.0.0;
machine_license: MIT;
start_states: [Draft];
end_states:   [Published];
Draft  'submit'  -> Review;
Review 'approve' -> Published;
Review 'reject'  ~> Draft;
\`\`\`

## Syntax reference

### Machine metadata (accepted keys, \`key: value;\`)
\`machine_name\` (label/string), \`machine_author\` (label, string, or \`[list]\`),
\`machine_contributor\`, \`machine_comment\`, \`machine_reference\`,
\`machine_version\` (semver \`x.y.z\`), \`fsl_version\` (semver), \`machine_license\`
(\`MIT\`, \`BSD 2-clause\`, \`BSD 3-clause\`, \`Apache 2.0\`, \`Mozilla 2.0\`,
\`Public domain\`, \`GPL v2\`, \`GPL v3\`, \`LGPL v2.1\`, \`LGPL v3.0\`, \`Unknown\`, or a
custom label/string), \`machine_language\`, \`npm_name\` (quote it if it contains a
hyphen), \`theme\` (\`default ocean modern plain bold\`), \`flow\`
(\`up right down left\`), \`dot_preamble\` ("string"), \`default_size\`.

\`\`\`fsl
machine_name: "Traffic Light";
machine_author: [Ada Grace];
machine_version: 2.1.0;
Green -> Yellow -> Red -> Green;
\`\`\`
A document needs at least one transition; metadata alone will not compile.

### Structural / rendering directives
- \`start_states: [A B];\` — override start-state inference.
- \`end_states: [A];\` — voluntary success endpoints.
- \`failed_outputs: [A];\` — failure endpoints.
- \`graph_layout: dot;\` — one of \`dot circo fdp neato twopi\`.
- \`allow_islands:\` — disconnected subgraphs are permitted **by default**
  (equivalent to \`allow_islands: true;\`). \`allow_islands: false;\` rejects a
  graph with disconnected components; \`allow_islands: with_start;\` requires
  every component to contain a start state.
- Default style blocks: \`state: { ... };\`, \`start_state: { ... };\`,
  \`end_state: { ... };\`, \`terminal_state: { ... };\`, \`active_state: { ... };\`,
  \`transition: { ... };\`, \`graph: { ... };\`.

### State declarations (styling one state)
\`\`\`fsl
state Error: { background-color: red; text-color: white; shape: box; };
Ok 'fail' -> Error;
Error 'clear' -> Ok;
\`\`\`
Item keys: \`label\`, \`color\`, \`text-color\`, \`background-color\`, \`border-color\`,
\`shape\`, \`corners\` (\`regular rounded lined\`), \`line-style\` (\`solid dotted
dashed\`), \`image\` ("url"), \`url\` ("url"), \`property\`. Colors: SVG names
(\`red\`, \`cornflowerblue\`), or hex \`#rgb\` / \`#rgba\` / \`#rrggbb\` / \`#rrggbbaa\`.
Shapes: graphviz names (\`box circle ellipse diamond hexagon cylinder note
plaintext\` …). A \`state\` declaration only styles; it creates neither
states nor edges - the state must appear in an edge to exist.

### Edge decoration block
Attach display data to an edge with a brace block after the arrow (keep
*actions/weights* before the arrow). One block holds **either** a run of
\`arc_label\`/\`head_label\`/\`tail_label\` items, **or** a single \`edge-color\`,
**or** a single \`line-style\` — these three groups cannot be combined in one
block.
\`\`\`fsl
A -> { arc_label: sync; head_label: out; } B;
B -> { edge-color: blue; } A;
\`\`\`

### Groups (named lists)
Declare a reusable set with \`&name\`, then use \`&name\` as a transition endpoint;
it expands to one edge per member.
\`\`\`fsl
&lit: [Red Yellow Green];
&lit 'reset' -> Off;
\`\`\`
Members may nest another group (\`&child\`) or spread it flat (\`...&child\`). A
group may also be styled: \`state &lit: { color: gold; };\`.

### Boundary hooks (in FSL text)
Register an action to fire when control crosses a state/group boundary:
\`\`\`fsl
Idle 'start' -> Working;
on enter Working do 'startTimer';
on exit  Working do 'stopTimer';
\`\`\`
\`enter\`/\`exit\`, subject is a state or \`&group\`, action is single-quoted. (This
is distinct from jssm's JavaScript hook API, which lives in code, not FSL text.)

### Layout hints (no colon)
\`arrange [A B];\` \`arrange-start [A];\` \`arrange-end [B];\` \`oarrange […];\`
\`farrange […];\` — ordering hints for rendering only.

### Global properties
\`property cost default 0;\` / \`property size required;\` — declare a machine
property. A per-state \`property: name value;\` (inside a \`state {}\` block)
requires the name to be globally declared first.

### Comments
\`// line comment\` to end of line; \`/* block comment */\` anywhere. Trailing
comments after a statement are fine.

## Agent directives

- **Use the exact state and action names the task gives you**, including their
  case and word form. If the request says states \`open\` and \`closed\`, write
  \`open\` - not \`Open\`, not \`Opened\`. Invented paraphrases are the most common
  correctness failure in otherwise-valid machines.
- **End every statement with \`;\`.** Missing semicolons are the top syntax
  error.
- **Actions: single quotes, before the arrow.** \`S 'act' -> T;\`. Never double
  quotes for an action; never place the action after the arrow.
- **Names with spaces or punctuation: double-quoted strings.** Bare atoms allow
  letters, digits, and \`. _ ! $ ^ * ? ,\` (and more), but **not spaces or
  hyphens**; quote such names.
- **Model involuntary events as forced (\`~>\`), voluntary choices as \`->\`.**
  Errors, timeouts, and external interrupts are \`~>\`; a user/actor decision is
  \`->\`. Reserve \`=>\` for marking the primary happy path.
- **Let start and terminal states be derived** unless the machine needs
  otherwise: start = \`start_states:\` or first-mentioned; terminal = any state
  with no exit. Add \`start_states:\` only when the first-mentioned state is not
  the real entry point.
- **Do not invent syntax.** No loops, conditionals, variables, guards,
  expressions, or nested machines — FSL has none. If a concept is not in this
  guide, do not emit it. In particular \`machine_definition:\` and a
  \`hooks: open;\` attribute are **not** accepted by this version; omit them.
- **No \`+N\` cycle targets.** \`A -> +1;\` compiles, but into an object
  pseudo-state (\`{"key":"cycle","value":1}\`) visible in the state and edge
  lists; breakage surfaces downstream, not at compile time. Spell the target
  state out.
- **One machine per document.** Put metadata first, then transitions, then
  optional styling — though order is not enforced.
- **Prefer ASCII arrows** over the Unicode equivalents.


# Flowcharts in FSL

Flowcharts map cleanly onto state machines: every box is a state, every arrow
is a transition, and every decision is a state whose outgoing edges carry the
answers. This section shows the idiom. Every fenced example below is a
complete FSL document that compiles on its own. The fsl_scaffold tool returns
ready-to-edit starting documents for these idioms.

## The mapping

| Flowchart element | FSL |
|---|---|
| Process box | a plain state (default box shape) |
| Decision diamond | a state declared \`shape: diamond;\` with one labeled edge per outcome |
| Start terminal | your first state, styled so it reads as an entry point |
| End terminal | a state with no outgoing edges, declared \`shape: doublecircle;\` |
| Arrow label | an action label in single quotes BEFORE the arrow: \`'yes' ->\` |
| Failure/exception arrow | a forced transition \`~>\` |

## Decisions

One labeled edge per outcome, and the label goes **before** the arrow.
Decorations placed after the arrow silently do not bind - this is the single
most common flowchart-authoring mistake in FSL.

\`\`\`fsl
Validate 'ok' -> Ship;
Validate 'bad' -> Reject;

state Validate: { shape: diamond; };
\`\`\`

## Terminals

An end terminal is just a state with no outgoing edges; give it
\`doublecircle\` so it reads as terminal. Style the start state so the eye
finds the entry point. Note: a \`state\` declaration alone never creates a
state - \`state X : {};\` and \`state X : { shape: box; };\` alike are silently
dropped unless \`X\` appears in at least one edge. Only edges register states;
a self-loop \`X -> X;\` is the minimal way to make an edgeless box exist.
Properties are for styling, not existence.

\`\`\`fsl
Start -> Working;
Working -> Done;

state Start: { shape: circle; background-color: palegreen; };
state Done:  { shape: doublecircle; };
\`\`\`

## Failure paths

Keep the happy path on \`->\` and exceptional flow on \`~>\` (forced
transitions); they render distinctly, so main flow and failure flow separate
visually for free. Transitions chain: \`a -> b -> c;\` is three states and two
edges in one statement.

\`\`\`fsl
Fetch -> Parse -> Save;
Fetch ~> Failed;
Parse ~> Failed;
\`\`\`

## Loops

Rework cycles are ordinary edges pointing back; the labels keep the diagram
readable.

\`\`\`fsl
Draft -> Review;
Review 'approve' -> Publish;
Review 'revise'  -> Draft;
\`\`\`

## Layout and themes

\`flow: down;\` gives the classic top-to-bottom flowchart read; \`flow: right;\`
suits pipelines. Name the machine so renders are titled. Themes available:
\`default ocean modern plain bold\`.

\`\`\`fsl
machine_name: "Signup";
flow: down;

Landing -> Form -> Submitted;
\`\`\`

## Gotchas (all empirically verified)

- Action labels and decorations bind only BEFORE the arrow; after the arrow
  they are silently ignored - with ZERO diagnostics. Validation and lint
  both pass; only review catches the misplacement.
- A \`state\` declaration never creates a state - \`state X : {};\` and
  \`state X : { shape: box; };\` are both silently dropped unless \`X\` appears
  in an edge. Use a self-loop \`X -> X;\` to register an isolated state;
  properties style, they do not register.
- Two unlabeled edges with the same source and target collide, even across
  different arrow kinds. When you need parallel edges, give both distinct
  action labels - that is the verified-legal form.
- Apostrophes inside single-quoted labels need escaping: \`'it\\'s done'\`.
- Numeric cycle targets like \`+1\` compile - into an object pseudo-state
  (\`{"key":"cycle","value":1}\`) that appears in the state and edge lists,
  breaking things downstream rather than at compile time. Spell states out
  in flowcharts.

## Rendering flowcharts

Request \`format: "png"\` with \`width\` 640 or more for chat legibility;
\`format: "gif"\` (keep \`maxFrames\` at or under 20) animates a random walk
through the flow, which makes a good quick demo. If no raster backend is
available the render degrades to SVG plus a note.

## Worked example: an approval flowchart

\`\`\`fsl
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
\`\`\`

Submitted is the start terminal; Paid is the end terminal; both diamonds
carry one labeled edge per outcome; the escalation path rides \`~>\`; the
rework loop returns to Submitted. Render it with \`flow: down\` and it reads
exactly like the whiteboard version.
`;
