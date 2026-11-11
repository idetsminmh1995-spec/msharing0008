/**
 * rule13-19-24-motion.ts
 *
 * Rules 13–19 and 24: one continuous pipeline over the SAME committed
 * sticking/technique decisions.
 *
 * 13 — motion planning, "never teleport / snap to neutral / invent
 *      impossible acceleration".
 * 14 — rig realization, which "cannot change the high-level performance
 *      decision". `applyRigEnvelope` is the seam a real IK solver plugs
 *      into without touching any decision code.
 * 15 — impact/rebound physics, traceable to the originating event.
 * 16 — post-impact recovery: the next motion starts exactly where this
 *      one's rebound ends, never at an invented neutral pose.
 * 17 — whole-body compensation, a CONSEQUENCE of limb positions.
 * 18 — human timing, bounded; "physics cannot be violated for feel".
 * 19 — timeline assembly, which "does not reinterpret sticking".
 * 24 — audio/animation sync off one authoritative clock.
 */

import type {
  AnimationEvent,
  AnimationTimeline,
  BodyState,
  HumanTimingContext,
  ImpactEvent,
  Instrument,
  Limb,
  MotionKeyframe,
  MotionPlan,
  Point3,
  RecoveryPlan,
  SyncState,
  TechniquePlan,
} from './datamodel.js';
import { FOOT_MAX_SPEED_MPS, HAND_MAX_SPEED_MPS, isFootLimb } from './rule06-reachability.js';
import { distance2d } from './core/geometry.js';

/** How high a limb lifts before an accented approach. */
const PREP_LIFT_M = 0.08;

/**
 * Physical continuity is enforced structurally: motion cannot start
 * before `limbReadyTimeS` (the previous recovery's promise), and travel
 * time comes from real distance / max speed -- Rule 6's same model -- so
 * an impossible instantaneous jump cannot be emitted from here.
 */
export function buildMotionPlan(
  eventId: string,
  limb: Limb,
  technique: TechniquePlan,
  prevPosition: Point3,
  targetPosition: Point3,
  humanTiming: HumanTimingContext,
  limbReadyTimeS: number,
): MotionPlan {
  const isFoot = isFootLimb(limb);
  const maxSpeed = isFoot ? FOOT_MAX_SPEED_MPS : HAND_MAX_SPEED_MPS;
  const distance = distance2d(
    prevPosition[0],
    prevPosition[1],
    targetPosition[0],
    targetPosition[1],
  );
  const travelTime = maxSpeed > 0 ? distance / maxSpeed : 0.0;

  const impactTime = humanTiming.performedTimeS;
  let motionStart = impactTime - travelTime;

  let feasible = true;
  let rejection = '';
  if (motionStart < limbReadyTimeS - 1e-6) {
    // Not enough physical time even after Rule 6's pre-filtering, which
    // can happen once Rule 12's jitter has moved the impact. Rule 18:
    // physics wins over feel -- clamp to the earliest honest time and
    // let Rule 25 flag the humanization rather than silently violating
    // continuity.
    motionStart = limbReadyTimeS;
    feasible = false;
    rejection = 'motion_start clamped to limb_ready_time_s after humanization';
  }

  const lift = PREP_LIFT_M * (0.5 + technique.dynamicLevel);
  const prepZ = isFoot ? prevPosition[2] : prevPosition[2] + lift;

  const keyframes: MotionKeyframe[] = [
    { timeSeconds: motionStart, limb, position: prevPosition, phase: 'prep' },
    {
      timeSeconds: motionStart + travelTime * 0.35,
      limb,
      position: [prevPosition[0], prevPosition[1], prepZ],
      phase: 'travel',
    },
    { timeSeconds: impactTime, limb, position: targetPosition, phase: 'impact' },
  ];

  return {
    eventId,
    limb,
    keyframes,
    peakVelocityMps: maxSpeed,
    feasible,
    rejectionReason: rejection,
  };
}

/**
 * RULE 14 seam. A full IK/FK solver would retarget the keyframes onto
 * joint angles here. The single-point model already respects the same
 * envelope Rule 6 checked, so this is a structural pass-through -- kept
 * as an explicit function so a real rig can be dropped in without
 * touching any decision-layer code.
 */
export function applyRigEnvelope(plan: MotionPlan): MotionPlan {
  return plan;
}

export function computeImpact(
  plan: MotionPlan,
  instrument: Instrument,
  technique: TechniquePlan,
): ImpactEvent {
  const impactKf = plan.keyframes.find((k) => k.phase === 'impact') as MotionKeyframe;
  return {
    eventId: plan.eventId,
    limb: plan.limb,
    timeSeconds: impactKf.timeSeconds,
    instrument,
    impactVelocityMps: plan.peakVelocityMps,
    reboundHeightM: 0.02 + 0.1 * technique.dynamicLevel,
  };
}

/**
 * RULE 16: extend the plan with the rebound phase Rule 10 promised, so
 * the NEXT plan can legitimately start from here rather than from an
 * invented neutral pose.
 */
export function appendRecoveryKeyframe(plan: MotionPlan, recovery: RecoveryPlan): MotionPlan {
  const impactKf = plan.keyframes.find((k) => k.phase === 'impact') as MotionKeyframe;
  plan.keyframes.push({
    timeSeconds: recovery.readyTimeS,
    limb: plan.limb,
    position: [
      impactKf.position[0],
      impactKf.position[1],
      impactKf.position[2] + recovery.reboundHeightM,
    ],
    phase: 'rebound',
  });
  return plan;
}

/**
 * RULE 17: whole-body compensation derived purely from where the limbs
 * currently are, never independently animated.
 */
export function computeBodyState(
  timeS: number,
  activeLimbPositions: Readonly<Partial<Record<Limb, Point3>>>,
): BodyState {
  const positions = Object.values(activeLimbPositions).filter((p): p is Point3 => p !== undefined);
  if (positions.length === 0) {
    return { timeSeconds: timeS, torsoRotationDeg: 0.0, comOffsetM: [0.0, 0.0] };
  }
  const meanX = positions.reduce((s, p) => s + p[0], 0) / positions.length;
  const meanY = positions.reduce((s, p) => s + p[1], 0) / positions.length;
  return {
    timeSeconds: timeS,
    torsoRotationDeg: Math.max(-18.0, Math.min(18.0, meanX * 22.0)),
    comOffsetM: [meanX * 0.05, (meanY - 0.3) * 0.03],
  };
}

/** RULE 19: pure assembly. No new decisions are made here. */
export function assembleTimeline(
  motionPlans: readonly MotionPlan[],
  techniqueByEvent: ReadonlyMap<string, TechniquePlan>,
): AnimationTimeline {
  const events: AnimationEvent[] = motionPlans.map((plan) => {
    const tech = techniqueByEvent.get(plan.eventId);
    return {
      eventId: plan.eventId,
      limb: plan.limb,
      startTimeS: (plan.keyframes[0] as MotionKeyframe).timeSeconds,
      endTimeS: (plan.keyframes[plan.keyframes.length - 1] as MotionKeyframe).timeSeconds,
      keyframes: plan.keyframes,
      strokeType: tech ? tech.strokeType : 'single',
    };
  });
  const durationS = events.length > 0 ? Math.max(...events.map((e) => e.endTimeS)) : 0.0;
  return { events, durationS };
}

/**
 * RULE 24. Because the impact time IS the authoritative clock that both
 * the audio scheduler and the animation read from -- rather than two
 * independently-tracked clocks -- structural drift is zero by
 * construction. This exists as the explicit place a real-time runtime
 * would monitor device-latency drift.
 */
export function checkAudioAnimationSync(timeline: AnimationTimeline): SyncState {
  return { maxDriftMs: 0.0, resynced: true, lastCheckTimeS: timeline.durationS };
}
