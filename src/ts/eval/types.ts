/** Task difficulty tier; the tool/reference value is expected to grow with difficulty. */
export type Difficulty = 'easy' | 'medium' | 'harder';

/** A behavioral expectation: applying `actions` in order must end on `endState`;
 *  if `rejectedAt` is set, the move at that index must be rejected (walk stops there). */
export interface Walk {
  actions    : string[];
  endState   : string;
  rejectedAt?: number;
}

/** Machine-checkable expectations for a task's produced FSL. All present checks must pass. */
export interface Expect {
  states?      : string[];
  transitions? : [string, string][];
  start?       : string[];
  terminals?   : string[];
  walks?       : Walk[];
}

/** One eval task: a natural-language spec plus how to check the result. */
export interface Task {
  id         : string;
  difficulty : Difficulty;
  prompt     : string;
  expect     : Expect;
}

/** The four experimental conditions. */
export type Condition = 'bare' | 'reference' | 'tools' | 'reference+tools';

/** The conditions evaluated, in report order. */
export const CONDITIONS: readonly Condition[] = ['bare', 'reference', 'tools', 'reference+tools'];

/** A fully-built `claude -p` invocation: CLI args plus the prompt fed on stdin. */
export interface Invocation {
  args   : string[];
  prompt : string;
}

/** The outcome of one trial's model call: the extracted FSL, or null with an error note. */
export interface TrialResult {
  fsl    : string | null;
  error? : string;
}

/** One scored trial. */
export interface ScoredTrial {
  task       : string;
  difficulty : Difficulty;
  condition  : Condition;
  valid      : boolean;
  correct    : boolean;
}

/** Aggregate rates for one condition across all its trials. */
export interface ConditionSummary {
  condition       : Condition;
  n               : number;
  validityRate    : number;
  correctnessRate : number;
}
