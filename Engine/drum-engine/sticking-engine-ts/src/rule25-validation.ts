/**
 * rule25-validation.ts — RULE 25: FINAL VALIDATION, QUALITY GATE & REPAIR
 *
 * "No runtime execution before approval; repair escalates from local to
 * global only as needed." Nothing here silently rewrites decisions --
 * repair is a separate, explicit, logged step.
 */

import type { Limb, PerformanceEvent, ValidationIssue, ValidationResult } from './datamodel.js';

/** Above ~22 Hz a single limb is not humanly possible. */
export const MIN_SAME_LIMB_INTERVAL_S = 1.0 / 22.0;

export function validatePerformance(events: readonly PerformanceEvent[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  const byLimb = new Map<Limb, PerformanceEvent[]>();
  for (const ev of [...events].sort((a, b) => a.timeSeconds - b.timeSeconds)) {
    const bucket = byLimb.get(ev.limb);
    if (bucket === undefined) byLimb.set(ev.limb, [ev]);
    else bucket.push(ev);
  }

  // 1) Same-limb superhuman-rate check.
  for (const [limb, evs] of byLimb) {
    for (let i = 1; i < evs.length; i++) {
      const a = evs[i - 1] as PerformanceEvent;
      const b = evs[i] as PerformanceEvent;
      const dt = b.timeSeconds - a.timeSeconds;
      if (dt >= 0 && dt < MIN_SAME_LIMB_INTERVAL_S) {
        issues.push({
          severity: 'error',
          code: 'SUPERHUMAN_RATE',
          message:
            `${limb} plays two notes ${(dt * 1000).toFixed(1)}ms apart ` +
            `(min ${(MIN_SAME_LIMB_INTERVAL_S * 1000).toFixed(1)}ms)`,
          eventId: b.eventId,
          ruleId: 'rule25',
        });
      }
    }
  }

  // 2) Two events assigned to one limb at the same instant.
  const seen = new Set<string>();
  for (const ev of events) {
    const key = `${ev.limb}@${ev.timeSeconds.toFixed(4)}`;
    if (seen.has(key)) {
      issues.push({
        severity: 'error',
        code: 'LIMB_COLLISION',
        message: `${ev.limb} assigned two simultaneous events`,
        eventId: ev.eventId,
        ruleId: 'rule25',
      });
    }
    seen.add(key);
  }

  // 3) Velocity sanity.
  for (const ev of events) {
    if (ev.velocity <= 0 || ev.velocity > 127) {
      issues.push({
        severity: 'warning',
        code: 'VELOCITY_RANGE',
        message: `velocity ${ev.velocity} out of expected range`,
        eventId: ev.eventId,
        ruleId: 'rule25',
      });
    }
  }

  return { issues, approved: !issues.some((i) => i.severity === 'error') };
}

/**
 * Local repair for SUPERHUMAN_RATE: nudge the later event forward just
 * enough to be physically possible, rather than re-running the whole
 * solver ("repair escalates from local to global only as needed").
 */
export function repairSuperhumanRate(
  events: readonly PerformanceEvent[],
): readonly PerformanceEvent[] {
  const byLimb = new Map<Limb, PerformanceEvent[]>();
  for (const ev of events) {
    const bucket = byLimb.get(ev.limb);
    if (bucket === undefined) byLimb.set(ev.limb, [ev]);
    else bucket.push(ev);
  }

  const repaired = new Map<string, number>();
  for (const evs of byLimb.values()) {
    evs.sort((a, b) => a.timeSeconds - b.timeSeconds);
    for (let i = 1; i < evs.length; i++) {
      const prev = evs[i - 1] as PerformanceEvent;
      const cur = evs[i] as PerformanceEvent;
      const dt = cur.timeSeconds - prev.timeSeconds;
      if (dt >= 0 && dt < MIN_SAME_LIMB_INTERVAL_S) {
        repaired.set(cur.eventId, cur.timeSeconds + (MIN_SAME_LIMB_INTERVAL_S - dt));
      }
    }
  }

  if (repaired.size === 0) return events;

  return events.map((ev) => {
    const at = repaired.get(ev.eventId);
    if (at === undefined) return ev;
    return {
      ...ev,
      timeSeconds: at,
      ruleTrace: [...ev.ruleTrace, 'rule25:repair_superhuman_rate'],
    };
  });
}

/** Validate, repair locally, re-validate -- bounded so repair can never loop. */
export function validateAndRepair(
  events: readonly PerformanceEvent[],
  maxPasses = 3,
): ValidationResult {
  let current = events;
  for (let pass = 0; pass < maxPasses; pass++) {
    const result = validatePerformance(current);
    if (result.approved) return result;
    if (result.issues.some((i) => i.code === 'SUPERHUMAN_RATE')) {
      current = repairSuperhumanRate(current);
      continue;
    }
    return result; // non-repairable issue types: surface as-is
  }
  return validatePerformance(current);
}
