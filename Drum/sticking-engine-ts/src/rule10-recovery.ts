/**
 * rule10-recovery.ts — RULE 10: RECOVERY & NEXT-STROKE PREPARATION
 *
 * "No-reset principle: every stroke ends in a state that prepares the
 * next stroke."
 *
 * `readyTimeS` feeds straight back into Rule 6's available-time
 * calculation for whatever this limb plays next, so recovery cost is
 * never silently ignored by a later reachability check.
 */

import type { Limb, RecoveryPlan, StrokeType, TechniquePlan } from './datamodel.js';

/**
 * Approximate recovery durations by articulation. A ghost note rebounds
 * almost immediately; an accented rim shot needs a fuller recovery arc
 * before the limb is genuinely ready for a demanding next hit.
 */
const RECOVERY_TIME_BY_STROKE: Readonly<Record<StrokeType, number>> = {
  ghost: 0.02,
  single: 0.035,
  double: 0.018, // already mid-bounce
  accent: 0.055,
  rim_shot: 0.06,
  cross_stick: 0.045,
  flam: 0.045,
  drag: 0.04,
  choke: 0.07,
  bell: 0.045,
  open: 0.05,
  closed: 0.035,
};

export function planRecovery(
  eventTime: number,
  limb: Limb,
  technique: TechniquePlan,
  nextEventId?: string,
): RecoveryPlan {
  const base = RECOVERY_TIME_BY_STROKE[technique.strokeType] ?? 0.035;
  // Harder dynamics -> a higher rebound -> marginally longer recovery.
  const recoveryTime = base * (0.8 + 0.4 * technique.dynamicLevel);
  const reboundHeight = 0.02 + 0.1 * technique.dynamicLevel;

  return {
    eventId: technique.eventId,
    limb,
    reboundHeightM: reboundHeight,
    readyTimeS: eventTime + recoveryTime,
    ...(nextEventId !== undefined ? { preparedForEventId: nextEventId } : {}),
  };
}
