/**
 * rule30-state-machine.ts — RULE 30: PERFORMANCE STATE MACHINE &
 * CONTINUOUS DRUMMER STATE
 *
 * "A drummer is not a list of isolated hits; every action changes the
 * state from which the next action emerges."
 *
 * A thin, explicit wrapper that gives the rest of the engine an atomic,
 * rollback-capable transition API -- Rule 39's commit discipline depends
 * on this existing at the state layer, not only in the solver.
 */

import type { DrummerState, StateTransition } from './datamodel.js';
import { snapshotState } from './datamodel.js';

export class DrummerStateMachine {
  state: DrummerState;
  private readonly history: DrummerState[] = [];

  constructor(initialState: DrummerState) {
    this.state = initialState;
  }

  checkpoint(): void {
    this.history.push(snapshotState(this.state));
  }

  rollback(): void {
    const previous = this.history.pop();
    if (previous === undefined) throw new Error('no checkpoint to roll back to');
    this.state = previous;
  }

  /**
   * The ONLY sanctioned way authoritative state changes outside
   * checkpoint/rollback. `newState` must already be a fully-resolved,
   * validated speculative state.
   */
  commit(newState: DrummerState, eventIds: readonly string[], ruleId = 'rule30'): StateTransition {
    const transition: StateTransition = {
      fromTimeS: this.state.timeSeconds,
      toTimeS: newState.timeSeconds,
      eventIds: [...eventIds],
      ruleId,
    };
    this.state = newState;
    return transition;
  }
}
