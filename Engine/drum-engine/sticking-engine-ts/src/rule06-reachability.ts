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
// A limb cannot strike faster than this however short the journey.
// Travel time alone does not bound a repeated stroke on ONE surface --
// the distance is zero, so without this a hand could play a drum at any
// rate at all. The stick still has to be lifted and dropped.
export const HAND_MAX_STROKE_RATE_HZ = 14.0;
export const FOOT_MAX_STROKE_RATE_HZ = 10.0;
// How far past the body midline a hand still works comfortably. A kit is
// laid out in FRONT of the drummer, not split down the middle: the rack
// toms and the snare are within easy reach of either hand, and only the
// far side -- the floor tom and ride for a left hand, the hi-hat for a
// right one -- is a real reach across the other arm.
export const HAND_COMFORT_REACH_M = 0.4;
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
  if (limb === 'RH') return toX < -HAND_COMFORT_REACH_M;
  if (limb === 'LH') return toX > HAND_COMFORT_REACH_M;
  return false;
}

export function checkReachability(
  limb: Limb,
  limbState: LimbState,
  targetPoint: Target,
  availableTimeS: number,
  eventId: string,
  maxStrokeRateHz = 0.0,
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
  let reachable = availableTimeS - travelTime >= SAFETY_MARGIN_S || availableTimeS <= 0;
  const margin = availableTimeS - travelTime;

  let reason = reachable
    ? ''
    : `insufficient time: needs ${(travelTime * 1000).toFixed(1)}ms, ` +
      `has ${(availableTimeS * 1000).toFixed(1)}ms`;

  // Stroke-rate ceiling. Independent of distance, and the reason a
  // 16 Hz hi-hat has to be shared between two hands: zero travel does
  // not make a limb infinitely fast.
  const defaultRate = isFoot ? FOOT_MAX_STROKE_RATE_HZ : HAND_MAX_STROKE_RATE_HZ;
  const rateCeiling = maxStrokeRateHz > 0 ? maxStrokeRateHz : defaultRate;
  if (reachable && rateCeiling > 0 && availableTimeS > 0) {
    const minInterval = 1.0 / rateCeiling;
    if (availableTimeS < minInterval) {
      reachable = false;
      reason =
        `stroke rate: ${(1.0 / availableTimeS).toFixed(1)}Hz exceeds this limb's ` +
        `${rateCeiling.toFixed(1)}Hz ceiling`;
    }
  }

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
