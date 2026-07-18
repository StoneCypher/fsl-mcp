/**
 * The scaffold preset registry: which presets exist, their family, their
 * renamable role slots (with canonical names as authored in the .fsl
 * sources), and the teaching notes returned alongside each scaffold.
 * Adding a chart family later = a new .fsl file + one entry here.
 *
 * @see ./scaffold.js for the substitution logic that consumes this.
 */

/** One renamable slot in a preset: a state, an action label, or a fixed-arity state list. */
export type RoleSlot =
  | { role: string; kind: 'state' | 'action'; canonical: string }
  | { role: string; kind: 'stateList'; canonical: readonly string[] };

/** A registry entry: family grouping, canonical machine name, slots, notes. */
export interface PresetDef {
  family: string;
  machineName: string;
  slots: readonly RoleSlot[];
  notes: readonly string[];
}

const NOTE_BEFORE = 'Action labels and decorations bind only BEFORE the arrow; misplacement compiles clean with zero diagnostics.';
const NOTE_FORCED = 'Involuntary flow (failures, timeouts) rides ~>, never ->.';
const NOTE_EDGES  = 'Only edges register states; a state declaration alone styles and never creates.';
const NOTE_DRAWING = 'This preset is a drawing, not a process: simulate is meaningless; render it (fsl_render, format png).';

/** All preset definitions, keyed by preset id. */
export const SCAFFOLD_REGISTRY: Record<string, PresetDef> = {
  'decision': { family: 'flowchart', machineName: 'Decision',
    slots: [ { role: 'decision', kind: 'state', canonical: 'Validate' },
             { role: 'outcomes', kind: 'stateList', canonical: ['Ship', 'Reject'] } ],
    notes: [NOTE_BEFORE, NOTE_EDGES] },
  'pipeline': { family: 'flowchart', machineName: 'Pipeline',
    slots: [ { role: 'stages', kind: 'stateList', canonical: ['Fetch', 'Parse', 'Save'] },
             { role: 'failed', kind: 'state', canonical: 'Failed' } ],
    notes: [NOTE_FORCED, NOTE_BEFORE] },
  'review-loop': { family: 'flowchart', machineName: 'Review Loop',
    slots: [ { role: 'draft', kind: 'state', canonical: 'Draft' },
             { role: 'review', kind: 'state', canonical: 'Review' },
             { role: 'publish', kind: 'state', canonical: 'Publish' },
             { role: 'approve', kind: 'action', canonical: 'approve' },
             { role: 'revise', kind: 'action', canonical: 'revise' } ],
    notes: [NOTE_BEFORE] },
  'flowchart': { family: 'flowchart', machineName: 'Expense Approval',
    slots: [ { role: 'submitted', kind: 'state', canonical: 'Submitted' },
             { role: 'validating', kind: 'state', canonical: 'Validating' },
             { role: 'managerReview', kind: 'state', canonical: 'ManagerReview' },
             { role: 'paid', kind: 'state', canonical: 'Paid' },
             { role: 'returned', kind: 'state', canonical: 'Returned' },
             { role: 'escalated', kind: 'state', canonical: 'Escalated' } ],
    notes: [NOTE_BEFORE, NOTE_FORCED, NOTE_EDGES] },
  'handshake': { family: 'protocol', machineName: 'Handshake',
    slots: [ { role: 'idle', kind: 'state', canonical: 'Idle' },
             { role: 'connecting', kind: 'state', canonical: 'Connecting' },
             { role: 'established', kind: 'state', canonical: 'Established' },
             { role: 'failed', kind: 'state', canonical: 'TimedOut' },
             { role: 'connect', kind: 'action', canonical: 'connect' },
             { role: 'acknowledge', kind: 'action', canonical: 'acknowledge' } ],
    notes: [NOTE_FORCED] },
  'job-lifecycle': { family: 'process', machineName: 'Job Lifecycle',
    slots: [ { role: 'queued', kind: 'state', canonical: 'Queued' },
             { role: 'running', kind: 'state', canonical: 'Running' },
             { role: 'done', kind: 'state', canonical: 'Done' },
             { role: 'failed', kind: 'state', canonical: 'Failed' },
             { role: 'retrying', kind: 'state', canonical: 'Retrying' },
             { role: 'start', kind: 'action', canonical: 'start' },
             { role: 'finish', kind: 'action', canonical: 'finish' },
             { role: 'retry', kind: 'action', canonical: 'retry' } ],
    notes: [NOTE_FORCED, NOTE_BEFORE] },
  'org-chart': { family: 'orgchart', machineName: 'Org Chart',
    slots: [ { role: 'root', kind: 'state', canonical: 'CEO' },
             { role: 'branches', kind: 'stateList', canonical: ['VP_Eng', 'VP_Sales'] },
             { role: 'leaves', kind: 'stateList', canonical: ['Eng_One', 'Eng_Two', 'Sales_One', 'Sales_Two'] } ],
    notes: [NOTE_DRAWING, NOTE_EDGES] },
  'network-topology': { family: 'network', machineName: 'Network',
    slots: [ { role: 'hub', kind: 'state', canonical: 'Hub' },
             { role: 'switches', kind: 'stateList', canonical: ['Switch_A', 'Switch_B'] },
             { role: 'hosts', kind: 'stateList', canonical: ['Host_One', 'Host_Two', 'Host_Three'] },
             { role: 'isolated', kind: 'state', canonical: 'Standby' } ],
    notes: [NOTE_DRAWING, NOTE_EDGES] },
};

/** Preset ids in stable sorted order; the tool's input enum derives from this. */
export const PRESET_IDS: readonly string[] = Object.keys(SCAFFOLD_REGISTRY).sort();
