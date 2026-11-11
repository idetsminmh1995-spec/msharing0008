/**
 * rule26-runtime.ts — RULE 26: PERFORMANCE RUNTIME, PLAYBACK STATE &
 * DETERMINISTIC REPRODUCTION
 *
 * "Runtime faithfully executes solved performance; no hidden
 * re-sticking or random decision-making." This is purely a reader of an
 * already-solved performance -- it never calls back into Rules 1–25 to
 * re-decide anything.
 */

import type { FinalValidatedPerformance, PerformanceEvent } from './datamodel.js';

export class PerformanceRuntime {
  readonly performance: FinalValidatedPerformance;
  playheadS = 0.0;
  playing = false;
  private readonly sorted: readonly PerformanceEvent[];

  constructor(performance: FinalValidatedPerformance) {
    if (!performance.validation.approved) {
      throw new Error('cannot construct a runtime from an unapproved performance (Rule 25 gate)');
    }
    this.performance = performance;
    this.sorted = [...performance.events].sort((a, b) => a.timeSeconds - b.timeSeconds);
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  seek(timeS: number): void {
    this.playheadS = Math.max(0.0, Math.min(this.performance.durationS, timeS));
  }

  /** Exactly the events due in a frame window. Same seed and version, same slice. */
  eventsBetween(t0: number, t1: number): PerformanceEvent[] {
    return this.sorted.filter((e) => t0 <= e.timeSeconds && e.timeSeconds < t1);
  }

  advance(dtS: number): PerformanceEvent[] {
    if (!this.playing) return [];
    const t0 = this.playheadS;
    const t1 = Math.min(this.performance.durationS, this.playheadS + dtS);
    const due = this.eventsBetween(t0, t1);
    this.playheadS = t1;
    return due;
  }

  exportSummary(): Record<string, number | string> {
    return {
      engineVersion: this.performance.engineVersion,
      seed: this.performance.seed,
      durationS: this.performance.durationS,
      eventCount: this.performance.events.length,
      validationIssues: this.performance.validation.issues.length,
    };
  }
}
