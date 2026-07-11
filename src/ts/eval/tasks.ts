import type { Task } from './types.js';

/** A task plus a private known-good solution used only to self-check the corpus.
 *  `_reference` is never sent to the model under evaluation — it exists solely
 *  so `tasks.spec.ts` can prove each task's `expect` is actually achievable. */
export interface CorpusTask extends Task {
  _reference: string;
}

/**
 * The curated eval corpus: FSL-authoring prompts spanning easy/medium/harder
 * difficulty, each paired with machine-checkable expectations and a private
 * `_reference` solution that is verified (via `tasks.spec.ts`) to satisfy its
 * own `expect` against real jssm.
 */
export const TASKS: CorpusTask[] = [
  {
    id: 'light-switch',
    difficulty: 'easy',
    prompt: 'Author an FSL machine for a light switch with two states, on and off, that can toggle either direction.',
    expect: { states: ['on', 'off'], transitions: [['on', 'off'], ['off', 'on']] },
    _reference: 'on -> off; off -> on;',
  },
  {
    id: 'linear-pipeline',
    difficulty: 'easy',
    prompt: 'Author an FSL machine with three states a, b, c in a one-way pipeline a to b to c.',
    expect: { states: ['a', 'b', 'c'], transitions: [['a', 'b'], ['b', 'c']], start: ['a'], terminals: ['c'] },
    _reference: 'a -> b -> c;',
  },
  {
    id: 'door-named-actions',
    difficulty: 'easy',
    prompt: "Author an FSL machine for a door with two states, closed and open. Use the action label 'open' for the transition from closed to open, and the action label 'close' for the transition from open to closed.",
    expect: {
      states: ['closed', 'open'],
      transitions: [['closed', 'open'], ['open', 'closed']],
      start: ['closed'],
      walks: [{ actions: ['open'], endState: 'open' }],
    },
    _reference: "closed 'open' -> open; open 'close' -> closed;",
  },
  {
    id: 'traffic-light-cycle',
    difficulty: 'medium',
    prompt: "Author an FSL machine for a traffic light with three states red, green, yellow that cycle in order red to green to yellow to red. Use the action label 'next' for every transition.",
    expect: {
      states: ['red', 'green', 'yellow'],
      transitions: [['red', 'green'], ['green', 'yellow'], ['yellow', 'red']],
      start: ['red'],
      walks: [{ actions: ['next', 'next'], endState: 'yellow' }],
    },
    _reference: "red 'next' -> green 'next' -> yellow 'next' -> red;",
  },
  {
    id: 'checkout-flow-reject',
    difficulty: 'medium',
    prompt: 'Author an FSL machine for a checkout flow with three states cart, payment, confirmed, reachable only in that linear order (cart to payment to confirmed) with no way to skip directly from cart to confirmed.',
    expect: {
      states: ['cart', 'payment', 'confirmed'],
      transitions: [['cart', 'payment'], ['payment', 'confirmed']],
      start: ['cart'],
      terminals: ['confirmed'],
      walks: [{ actions: ['confirmed'], endState: 'cart', rejectedAt: 0 }],
    },
    _reference: 'cart -> payment -> confirmed;',
  },
  {
    id: 'vending-machine-structure',
    difficulty: 'medium',
    prompt: 'Author an FSL machine for a vending machine with four states idle, selecting, dispensing, and dispensed. It should move idle to selecting to dispensing to dispensed, and from dispensed back to idle so another purchase can begin.',
    expect: {
      states: ['idle', 'selecting', 'dispensing', 'dispensed'],
      transitions: [['idle', 'selecting'], ['selecting', 'dispensing'], ['dispensing', 'dispensed'], ['dispensed', 'idle']],
      start: ['idle'],
    },
    _reference: 'idle -> selecting -> dispensing -> dispensed -> idle;',
  },
  {
    id: 'elevator-floors',
    difficulty: 'medium',
    prompt: 'Author an FSL machine for an elevator with four states ground, first, second, third representing floors. You may move directly only between adjacent floors, in either direction (ground and first; first and second; second and third).',
    expect: {
      states: ['ground', 'first', 'second', 'third'],
      transitions: [['ground', 'first'], ['first', 'ground'], ['first', 'second'], ['second', 'first'], ['second', 'third'], ['third', 'second']],
      start: ['ground'],
    },
    _reference: 'ground -> first; first -> ground; first -> second; second -> first; second -> third; third -> second;',
  },
  {
    id: 'review-workflow-branch',
    difficulty: 'harder',
    prompt: 'Author an FSL machine for a document review workflow with four states: draft, review, approved, and rejected. From draft you can move to review. From review you can move to either approved or rejected. Both approved and rejected are terminal (no further transitions out of them).',
    expect: {
      states: ['draft', 'review', 'approved', 'rejected'],
      transitions: [['draft', 'review'], ['review', 'approved'], ['review', 'rejected']],
      start: ['draft'],
      terminals: ['approved', 'rejected'],
      walks: [{ actions: ['review', 'rejected'], endState: 'rejected' }],
    },
    _reference: 'draft -> review; review -> approved; review -> rejected;',
  },
  {
    id: 'counter-updown',
    difficulty: 'harder',
    prompt: "Author an FSL machine for a counter with three states zero, one, two. Use the action label 'inc' to count up (zero to one, one to two) and the action label 'dec' to count down (one to zero, two to one). Decrementing below zero must not be possible.",
    expect: {
      states: ['zero', 'one', 'two'],
      transitions: [['zero', 'one'], ['one', 'two'], ['one', 'zero'], ['two', 'one']],
      start: ['zero'],
      walks: [
        { actions: ['dec'], endState: 'zero', rejectedAt: 0 },
        { actions: ['inc', 'inc', 'dec'], endState: 'one' },
      ],
    },
    _reference: "zero 'inc' -> one 'inc' -> two; one 'dec' -> zero; two 'dec' -> one;",
  },
  {
    id: 'forced-edge-emergency-stop',
    difficulty: 'harder',
    prompt: 'Author an FSL machine with three states running, paused, and stopped. Running and paused transition to each other normally (running to paused, paused to running). Additionally, both running and paused have a forced-only emergency transition to stopped, meaning stopped can only be reached via a forced transition, never an ordinary one.',
    expect: {
      states: ['running', 'paused', 'stopped'],
      transitions: [['running', 'paused'], ['paused', 'running']],
      start: ['running'],
      walks: [{ actions: ['stopped'], endState: 'running', rejectedAt: 0 }],
    },
    _reference: 'running -> paused; paused -> running; [running paused] ~> stopped;',
  },
];
