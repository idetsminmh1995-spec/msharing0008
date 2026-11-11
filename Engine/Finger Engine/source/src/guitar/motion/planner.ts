/**
 * planner.ts — turning a fingering into movement (Plan Part 08).
 *
 * The solver says WHERE each note is played. This says WHEN each
 * finger sets off, when it arrives, how long it stays and when it
 * lifts -- which is the whole difference between dots that blink from
 * note to note and a hand that looks like it is playing (D-003).
 *
 * Two ideas carry most of it. A finger ARRIVES BEFORE THE SOUND
 * (MP-01): a real player's left hand is already on the string when
 * the pick gets there, so a dot that lands exactly on the beat looks
 * late. And a MOVE TAKES TIME that depends on how far it goes
 * (MP-02, Fitts's law): a jump across the neck is visibly slower than
 * a shift of one fret, and making both instant is what makes animation
 * look robotic.
 */
import type { GeometryConfig } from '../../core/geometry.js';
import { fingertipPoint, fingertipDistanceMm } from '../../core/geometry.js';
import type { FingerKey, FingerKeyframe, HandKeyframe } from '../../core/timeline-schema.js';
import { emptyFingerTracks } from '../../core/timeline-schema.js';
import type { HandConfig, InstrumentSpec, LHFinger, NoteEvent } from '../../core/types.js';
import { jitter } from '../../core/rng.js';
import type { SolveStage } from '../stages.js';

export interface MotionConfig {
  readonly holdPolicy: 'realistic' | 'noteDuration';
  readonly idleLiftSec: number;
  readonly leadFraction: number;
  readonly minLeadSec: number;
  readonly maxLeadSec: number;
  readonly fitts: {
    readonly aSec: number;
    readonly bSecPerBit: number;
    readonly targetWidthMm: number;
  };
  readonly slideMaxSec: number;
  readonly bendRiseSec: number;
  readonly harmonicReleaseSec: number;
}

export interface HumanizeConfig {
  readonly enabled: boolean;
  readonly timeJitterSec: number;
  readonly posJitterFret: number;
}

export interface PlannerInput {
  readonly stages: readonly SolveStage[];
  readonly path: readonly HandConfig[];
  readonly instrument: InstrumentSpec;
  readonly geometry: GeometryConfig;
  readonly motion: MotionConfig;
  readonly humanize: HumanizeConfig;
  readonly noteById: ReadonlyMap<string, NoteEvent>;
  readonly rng: () => number;
}

export interface PlannerResult {
  readonly hand: readonly HandKeyframe[];
  readonly fingers: Readonly<Record<FingerKey, readonly FingerKeyframe[]>>;
  readonly rushed: readonly { readonly noteId: string; readonly time: number }[];
}

/** One spell of a finger pressing one spot: what the keyframes are built from. */
interface Job {
  readonly finger: LHFinger;
  readonly noteId: string;
  readonly string: number;
  readonly fret: number;
  readonly onset: number;
  /** When the note it serves stops sounding. */
  end: number;
  readonly stageIndex: number;
}

/** [MP-02] Fitts's law: a longer move takes longer, but not proportionally. */
export function travelSeconds(distanceMm: number, motion: MotionConfig): number {
  const width = Math.max(1e-6, motion.fitts.targetWidthMm);
  return motion.fitts.aSec + motion.fitts.bSecPerBit * Math.log2(1 + Math.abs(distanceMm) / width);
}

/** [MP-01] How early the finger is on the string. */
export function leadSeconds(freeTime: number, motion: MotionConfig): number {
  const wanted = Number.isFinite(freeTime) ? freeTime * motion.leadFraction : motion.maxLeadSec;
  return Math.min(motion.maxLeadSec, Math.max(motion.minLeadSec, wanted));
}

export function planMotion(input: PlannerInput): PlannerResult {
  const { stages, path, motion, humanize } = input;
  const k = input.geometry.fingertipBehindFret;
  const jobs = buildJobs(stages, path, input.noteById);
  const fingers = emptyFingerTracks();
  const rushed: { noteId: string; time: number }[] = [];

  // [MP-04] every shift of the hand, so a finger with nothing to do
  // knows when the hand it belongs to has moved out from under it.
  const handMoves = handKeyframes(stages, path, motion);

  for (const [finger, list] of jobs) {
    const track: FingerKeyframe[] = [];
    let previous: Job | undefined;

    for (const [index, job] of list.entries()) {
      const stage = stages[job.stageIndex];
      const lead = leadSeconds(stage?.freeTime ?? Infinity, motion);
      // [MP-21] humanised, but never late: a finger that arrives after
      // the pick has already sounded the note is simply wrong.
      const wobble = humanize.enabled ? jitter(input.rng, humanize.timeJitterSec) : 0;
      const arrive = Math.min(job.onset - 0.005, job.onset - lead + wobble);

      const from =
        previous === undefined
          ? hoverPoint(job, path[job.stageIndex], input)
          : { string: previous.string, fret: previous.fret };
      const distance = fingertipDistanceMm(
        fingertipPoint(input.instrument, input.geometry, from.string, from.fret),
        fingertipPoint(input.instrument, input.geometry, job.string, job.fret),
      ).distanceMm;
      const travel = travelSeconds(distance, motion);

      // [MP-03] it cannot leave before the note it was holding is over.
      const earliest = previous === undefined ? arrive - travel : Math.min(previous.end, job.onset);
      let depart = Math.max(arrive - travel, earliest);
      if (depart > arrive) depart = arrive;
      if (arrive - depart + 1e-9 < travel && distance > 1) {
        // [MP-02] the move has been squeezed into less time than it
        // takes. It still happens -- a player would rush it -- and it
        // is reported so the video's owner knows where.
        rushed.push({ noteId: job.noteId, time: job.onset });
      }

      const posWobble = humanize.enabled ? jitter(input.rng, humanize.posJitterFret) : 0;
      const fretValue = job.fret <= 0 ? 0 : job.fret - k + posWobble;
      const fromFret = from.fret <= 0 ? 0 : from.fret - k;

      // The approach: the dot travels from where the finger was to
      // where the note is, and is not pressing yet.
      pushFrame(track, {
        t: depart,
        string: from.string,
        fret: fromFret,
        pressed: false,
        visible: true,
        ease: 'easeInOut',
      });
      pushFrame(track, {
        t: arrive,
        string: job.string,
        fret: fretValue,
        pressed: true,
        visible: true,
        ease: 'step',
        noteId: job.noteId,
      });

      const next = list[index + 1];
      const lift = liftTime(job, next, handMoves, motion);
      if (job.end > arrive) {
        pushFrame(track, {
          t: job.end,
          string: job.string,
          fret: fretValue,
          pressed: true,
          visible: true,
          ease: 'step',
        });
      }
      if (lift !== undefined) {
        pushFrame(track, {
          t: lift,
          string: job.string,
          fret: fretValue,
          pressed: false,
          visible: false,
        });
      }
      previous = job;
    }

    fingers[finger] = track;
  }

  return { hand: handMoves, fingers, rushed };
}

/**
 * [MP-05] When the finger actually comes off.
 *
 * `realistic` keeps it down after the note has stopped, the way a
 * hand does, until the finger is needed somewhere else, the hand
 * shifts out from under it, or it has simply been idle too long. Only
 * `noteDuration` lifts it the instant the note ends, which is useful
 * for a teaching video and looks like a machine everywhere else.
 */
function liftTime(
  job: Job,
  next: Job | undefined,
  handMoves: readonly HandKeyframe[],
  motion: MotionConfig,
): number | undefined {
  if (motion.holdPolicy === 'noteDuration') {
    return next !== undefined && next.onset <= job.end ? undefined : job.end;
  }
  const idle = job.end + motion.idleLiftSec;
  const shift = handMoves.find(
    (move) =>
      move.t > job.end + 1e-6 &&
      Math.abs(move.fret - (job.fret - (job.finger === 'T' ? 0 : Number(job.finger) - 1))) > 0.5,
  )?.t;
  const limit = Math.min(idle, shift ?? Infinity);
  if (next !== undefined && next.onset <= limit) return undefined; // straight on to the next note
  return limit;
}

/**
 * [MP-06] Where a finger waits before its first note.
 *
 * Hovering over its own place in the hand's position, so the approach
 * is a short move from somewhere plausible rather than a jump in from
 * off-screen.
 */
function hoverPoint(
  job: Job,
  hand: HandConfig | undefined,
  input: PlannerInput,
): { string: number; fret: number } {
  const handPos = hand?.handPos ?? job.fret;
  const offset = job.finger === 'T' ? 0 : Number(job.finger) - 1;
  const fret = Math.max(0, Math.min(input.instrument.numFrets, handPos + offset));
  return { string: job.string, fret };
}

/** [OUT-01] Keyframes must go strictly forward; two at one instant are one keyframe. */
function pushFrame(track: FingerKeyframe[], frame: FingerKeyframe): void {
  const last = track[track.length - 1];
  if (last !== undefined && frame.t <= last.t) {
    track[track.length - 1] = { ...frame, t: last.t };
    return;
  }
  track.push(frame);
}

/** One job per spell of pressing; a note held across stages stays one job. */
function buildJobs(
  stages: readonly SolveStage[],
  path: readonly HandConfig[],
  noteById: ReadonlyMap<string, NoteEvent>,
): Map<FingerKey, Job[]> {
  const jobs = new Map<FingerKey, Job[]>();
  const openJob = new Map<string, Job>();

  for (const [index, state] of path.entries()) {
    const stage = stages[index];
    if (state === undefined || stage === undefined) continue;
    for (const placement of state.placements) {
      if (placement.finger === null || placement.fret <= 0) continue;
      const finger = String(placement.finger) as FingerKey;
      const note = noteById.get(placement.noteId);
      const end = note === undefined ? stage.time : note.time + note.duration;
      const held = openJob.get(placement.noteId);
      if (
        held !== undefined &&
        held.finger === placement.finger &&
        held.string === placement.string &&
        held.fret === placement.fret
      ) {
        held.end = Math.max(held.end, end);
        continue;
      }
      const job: Job = {
        finger: placement.finger,
        noteId: placement.noteId,
        string: placement.string,
        fret: placement.fret,
        onset: note?.time ?? stage.time,
        end,
        stageIndex: index,
      };
      openJob.set(placement.noteId, job);
      const list = jobs.get(finger);
      if (list === undefined) jobs.set(finger, [job]);
      else list.push(job);
    }
  }

  for (const list of jobs.values()) list.sort((a, b) => a.onset - b.onset);
  return jobs;
}

/**
 * [MP-04] The hand's own position over time.
 *
 * One keyframe per shift, timed to arrive just before the note that
 * needs it -- the fingers that move with the hand get their own
 * keyframes from their jobs, so this track is what a renderer uses to
 * draw the hand itself, or a position marker.
 */
function handKeyframes(
  stages: readonly SolveStage[],
  path: readonly HandConfig[],
  motion: MotionConfig,
): readonly HandKeyframe[] {
  const out: HandKeyframe[] = [];
  for (const [index, state] of path.entries()) {
    const stage = stages[index];
    if (state === undefined || stage === undefined) continue;
    const previous = out[out.length - 1];
    if (previous !== undefined && Math.abs(previous.fret - state.handPos) < 0.01) continue;
    const t = stage.time - leadSeconds(stage.freeTime, motion);
    if (previous !== undefined && t <= previous.t) {
      out[out.length - 1] = { t: previous.t, fret: state.handPos, ease: 'easeInOut' };
      continue;
    }
    out.push({ t, fret: state.handPos, ease: 'easeInOut' });
  }
  return out;
}
