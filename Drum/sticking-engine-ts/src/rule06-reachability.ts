/**
 * rule06-reachability.ts — RULE 6: PHYSICAL REACHABILITY & TARGET ACCESS
 *
 * "Physical feasibility is a hard boundary; unreachable actions are
 * rejected rather than visually faked."
 *
 * Travel time = distance / max_speed, with a required safety margin.
 * Body-crossing is flagged but is NOT itself a rejection -- Rule 7 uses
 * it as a soft cost.
 */

import type { LimbState, Limb, Point3, ReachabilityResult, Target } from './datamodel.js';
import { distance2d } from './core/geometry.js';

// Simple biomechanical constants (meters, seconds) -- deliberately
// conservative, and the numbers the Python uses.
export const HAND_MAX_SPEED_MPS = 4.2;
export const FOOT_MAX_SPEED_MPS = 2.0;
export const SAFETY_MARGIN_S = 0.012;
const HAND_NEUTRAL_X: Readonly<Partial<Record<Limb, number>>> = { RH: 0.3, LH: -0.3 };
const HAND_NEUTRAL_Y = 0.3;
const FOOT_NEUTRAL_X: Readonly<Partial<Record<Limb, number>>> = { RF: 0.0, LF: -0.55 };

export function isFootLimb(limb: Limb): boolean {
  return limb === 'RF' || limb === 'LF';
}

function distance(p1: Point3, x: number, y: number): number {
  return distance2d(p1[0], p1[1], x, y);
}

/** A hand "crosses" when it must travel past the body midline to the far side. */
function crossesBody(limb: Limb, toX: number): boolean {
  if (limb === 'RH') return toX < -0.05;
  if (limb === 'LH') return toX > 0.05;
  return false;
}

export function checkReachability(
  limb: Limb,
  limbState: LimbState,
  targetPoint: Target,
  availableTimeS: number,
  eventId: string,
): ReachabilityResult {
  const isFoot = isFootLimb(limb);
  if (isFoot && !targetPoint.isFootTarget) {
    return {
      limb,
      eventId,
      reachable: false,
      distanceM: 0.0,
      requiredTravelTimeS: 0.0,
      availableTimeS,
      safetyMarginS: 0.0,
      crossesBody: false,
      reason: 'foot cannot play a hand-only surface',
    };
  }
  if (!isFoot && targetPoint.isFootTarget) {
    return {
      limb,
      eventId,
      reachable: false,
      distanceM: 0.0,
      requiredTravelTimeS: 0.0,
      availableTimeS,
      safetyMarginS: 0.0,
      crossesBody: false,
      reason: 'hand cannot play a foot-only surface',
    };
  }

  const fromPos = limbState.position;
  const distanceM = distance(fromPos, targetPoint.x, targetPoint.y);
  const maxSpeed = isFoot ? FOOT_MAX_SPEED_MPS : HAND_MAX_SPEED_MPS;
  const travelTime = maxSpeed > 0 ? distanceM / maxSpeed : Infinity;

  const crosses = !isFoot && crossesBody(limb, targetPoint.x);

  // `availableTimeS <= 0` is the very first event of a performance --
  // nothing to compare against yet -- which Rule 7 treats as a free start.
  const reachable = availableTimeS - travelTime >= SAFETY_MARGIN_S || availableTimeS <= 0;
  const margin = availableTimeS - travelTime;

  const reason = reachable
    ? ''
    : `insufficient time: needs ${(travelTime * 1000).toFixed(1)}ms, ` +
      `has ${(availableTimeS * 1000).toFixed(1)}ms`;

  return {
    limb,
    eventId,
    reachable,
    distanceM,
    requiredTravelTimeS: travelTime,
    availableTimeS,
    safetyMarginS: margin,
    crossesBody: crosses,
    reason,
  };
}

/** Rest position for a limb that has not yet played anything. */
export function neutralPosition(limb: Limb): Point3 {
  if (limb === 'RH' || limb === 'LH') {
    return [HAND_NEUTRAL_X[limb] as number, HAND_NEUTRAL_Y, 0.15];
  }
  return [FOOT_NEUTRAL_X[limb] as number, 0.0, 0.0];
}
