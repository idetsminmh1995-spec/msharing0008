import type { Euler, Finger, Hand, Technique, Vec3 } from './types.js';

export type MotionPhase =
  'REST' | 'PREPARE' | 'TRAVEL' | 'ALIGN' | 'PRESS' | 'HOLD' | 'RELEASE' | 'SHIFT' | 'CROSS';

export interface HandTrajectorySegment {
  readonly hand: Hand;
  readonly startMs: number;
  readonly endMs: number;
  readonly phase: MotionPhase;
  readonly anchorKey: number | null;
  readonly wristPosition: Vec3;
  readonly wristRotation: Euler;
  readonly targetWristPosition: Vec3;
  readonly targetWristRotation: Euler;
  readonly technique: Technique;
}

export interface FingerContactPlan {
  readonly noteId: string;
  readonly hand: Hand;
  readonly finger: Finger;
  readonly targetKeyMidi: number;
  readonly approachStartMs: number;
  readonly contactMs: number;
  readonly holdEndMs: number;
  readonly releaseEndMs: number;
  readonly target: Vec3;
  readonly approach: Vec3;
  readonly pressDepthMm: number;
}

export interface PianoMotionPlan {
  readonly version: 1;
  readonly trajectories: readonly HandTrajectorySegment[];
  readonly contacts: readonly FingerContactPlan[];
}

export type ContactState = 'APPROACH' | 'CONTACT' | 'HOLD' | 'RELEASE';

export interface ActiveFingerContact extends FingerContactPlan {
  readonly state: ContactState;
}

export interface SampledHandMotion {
  readonly timestampMs: number;
  readonly hands: Readonly<Record<Hand, SampledHandState>>;
  readonly contacts: readonly ActiveFingerContact[];
}

export interface SampledHandState {
  readonly phase: MotionPhase;
  readonly anchorKey: number | null;
  readonly technique: Technique;
  readonly wristPosition: Vec3;
  readonly wristRotation: Euler;
  readonly progress: number;
}

/**
 * Sample a motion plan from absolute time, never from frame delta.
 *
 * This is intentionally pure: preview, export and seek can call it with the
 * same plan and timestamp and receive the same serialisable state.
 */
export function sampleHandMotion(plan: PianoMotionPlan, timestampMs: number): SampledHandMotion {
  const timestamp = Number.isFinite(timestampMs) ? timestampMs : 0;
  return {
    timestampMs: timestamp,
    hands: {
      left: sampleHand('left', plan.trajectories, timestamp),
      right: sampleHand('right', plan.trajectories, timestamp),
    },
    contacts: plan.contacts
      .filter((contact) => timestamp >= contact.approachStartMs && timestamp < contact.releaseEndMs)
      .map((contact) => ({ ...contact, state: contactState(contact, timestamp) })),
  };
}

function sampleHand(
  hand: Hand,
  trajectories: readonly HandTrajectorySegment[],
  timestampMs: number,
): SampledHandState {
  const segments = trajectories.filter((segment) => segment.hand === hand);
  if (segments.length === 0) return restState();

  const first = segments[0];
  const last = segments[segments.length - 1];
  if (first === undefined || last === undefined) return restState();
  const segment =
    segments.find(
      (candidate) => timestampMs >= candidate.startMs && timestampMs < candidate.endMs,
    ) ?? (timestampMs < first.startMs ? first : last);
  const duration = Math.max(1, segment.endMs - segment.startMs);
  const progress = clamp01((timestampMs - segment.startMs) / duration);
  const eased = smoothstep(progress);
  return {
    phase: segment.phase,
    anchorKey: segment.anchorKey,
    technique: segment.technique,
    wristPosition: lerpVec3(segment.wristPosition, segment.targetWristPosition, eased),
    wristRotation: lerpEuler(segment.wristRotation, segment.targetWristRotation, eased),
    progress,
  };
}

function contactState(contact: FingerContactPlan, timestampMs: number): ContactState {
  if (timestampMs < contact.contactMs) return 'APPROACH';
  if (timestampMs < contact.holdEndMs) return 'CONTACT';
  return 'RELEASE';
}

function restState(): SampledHandState {
  return {
    phase: 'REST',
    anchorKey: null,
    technique: 'NORMAL',
    wristPosition: { x: 0, y: 0, z: 0 },
    wristRotation: { x: 0, y: 0, z: 0 },
    progress: 0,
  };
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function lerpEuler(a: Euler, b: Euler, t: number): Euler {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function smoothstep(t: number): number {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
