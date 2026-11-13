/**
 * notation.ts — text and JSON views of a solved performance.
 *
 * A helper, not a numbered rule. It reads `FinalValidatedPerformance`
 * and writes; it never decides anything.
 */

import type { FinalValidatedPerformance } from './datamodel.js';

/** The same columns the Python's `print_table` produces, as lines. */
export function performanceTable(performance: FinalValidatedPerformance): string[] {
  const lines = ['    time limb instrument       stroke      vel', '  ' + '-'.repeat(45)];
  for (const ev of performance.events) {
    lines.push(
      `${ev.timeSeconds.toFixed(3).padStart(8)} ${ev.limb.padStart(4)} ` +
        `${ev.instrument.padEnd(16)}${ev.strokeType.padEnd(12)}${String(ev.velocity).padStart(3)}`,
    );
  }
  lines.push('');
  lines.push(
    `Approved: ${performance.validation.approved}  ` +
      `Issues: ${performance.validation.issues.length}  ` +
      `Duration: ${performance.durationS.toFixed(2)}s`,
  );
  return lines;
}

/** A plain object ready for `JSON.stringify` — the port's parity output. */
export function toPlainObject(performance: FinalValidatedPerformance): unknown {
  return {
    seed: performance.seed,
    engine_version: performance.engineVersion,
    duration_s: performance.durationS,
    approved: performance.validation.approved,
    issues: performance.validation.issues.map((i) => ({
      severity: i.severity,
      code: i.code,
      event_id: i.eventId ?? null,
    })),
    events: performance.events.map((e) => ({
      event_id: e.eventId,
      source_id: e.sourceId,
      time_seconds: e.timeSeconds,
      limb: e.limb,
      instrument: e.instrument,
      stroke_type: e.strokeType,
      velocity: e.velocity,
      microtiming_offset_ms: e.microtimingOffsetMs,
      dynamic_level: e.dynamicLevel,
    })),
  };
}
