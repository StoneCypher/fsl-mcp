// GENERATED FILE - DO NOT EDIT.
// Source: src/prompts/scaffolds/*.fsl
// Regenerate: node src/build_js/generate_scaffold_content.js (runs automatically before tsc)

/** Raw preset FSL sources, keyed by preset id (scaffold filename sans .fsl). */
export const SCAFFOLD_SOURCES: Record<string, string> = {
  'decision': `machine_name: "Decision";
flow: down;

// Labels bind BEFORE the arrow; after the arrow they are silently ignored.
Validate 'ok'  -> Ship;
Validate 'bad' -> Reject;

state Validate: { shape: diamond; };
state Ship:     { shape: doublecircle; background-color: palegreen; };
state Reject:   { shape: doublecircle; background-color: mistyrose; };
`,
  'flowchart': `machine_name: "Expense Approval";
flow: down;

// Full flowchart idiom: terminals, diamonds, forced escalation, rework loop.
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
`,
  'handshake': `machine_name: "Handshake";
flow: right;

Idle 'connect'          -> Connecting;
Connecting 'acknowledge' -> Established;
Established 'close'      -> Idle;
// A timeout is involuntary: it rides ~>.
Connecting ~> TimedOut;
TimedOut 'connect' -> Connecting;

state Established: { background-color: palegreen; };
state TimedOut:    { background-color: mistyrose; };
`,
  'job-lifecycle': `machine_name: "Job Lifecycle";
flow: right;

Queued 'start'   -> Running;
Running 'finish' -> Done;
// Jobs do not choose to fail.
Running ~> Failed;
Failed 'retry' -> Retrying;
Retrying -> Running;

state Done:   { shape: doublecircle; background-color: palegreen; };
state Failed: { background-color: mistyrose; };
`,
  'network-topology': `machine_name: "Network";
graph_layout: neato;

// A drawing, not a machine: <-> draws linked pairs.
Hub <-> Switch_A;
Hub <-> Switch_B;
Switch_A <-> Host_One;
Switch_A <-> Host_Two;
Switch_B <-> Host_Three;
// Islands are allowed by default; a self-loop registers an isolated node.
Standby -> Standby;

state Hub:     { shape: hexagon; };
state Standby: { line-style: dashed; };
`,
  'org-chart': `machine_name: "Org Chart";
flow: down;

// A drawing, not a process: edges are reporting lines. Render it; never simulate it.
CEO -> [VP_Eng VP_Sales];
VP_Eng -> [Eng_One Eng_Two];
VP_Sales -> [Sales_One Sales_Two];

state CEO: { background-color: lightgoldenrodyellow; };
`,
  'pipeline': `machine_name: "Pipeline";
flow: right;

// Happy path rides ->; involuntary failure rides ~>.
Fetch -> Parse -> Save;
Fetch ~> Failed;
Parse ~> Failed;

state Fetch:  { background-color: palegreen; };
state Failed: { background-color: mistyrose; };
`,
  'review-loop': `machine_name: "Review Loop";
flow: down;

Draft 'submit'   -> Review;
Review 'approve' -> Publish;
Review 'revise'  -> Draft;

state Publish: { shape: doublecircle; background-color: palegreen; };
`,
};
