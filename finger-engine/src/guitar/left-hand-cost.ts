/**
 * left-hand-cost.ts — how hard a fingering is (Plan Part 06 §3/§4).
 *
 * Two numbers decide everything the solver does: what a hand shape
 * costs to hold, and what it costs to get there from the one before.
 * Both are weighted sums of named features, and every feature is kept
 * on the state -- so the debug report can say WHY a fingering won, and
 * so the weights could one day be learned from real tablature (SV-25).
 */
import type { GeometryConfig } from '../core/geometry.js';
import { fingertipXMm } from '../core/geometry.js';
import type { InstrumentSpec, LHFinger, NoteEvent, Placement } from '../core/types.js';
import type { LeftHandConfig } from './left-hand-rules.js';
import { frettedOf, placementDistanceMm, spanLimit } from './left-hand-rules.js';
import type { SolveStage } from './stages.js';

export interface CostWeights {
  readonly span: number;
  readonly fingerDifficulty: number;
  readonly crossing: number;
  readonly barreBase: number;
  readonly barrePerString: number;
  readonly barreLowFretExtra: number;
  readonly openStrings: number;
  readonly highFret: number;
  readonly bendFinger: number;
  readonly techniqueFinger: number;
  readonly shift: number;
  readonly shiftCount: number;
  readonly guideFinger: number;
  readonly stringChange: number;
  readonly sameFingerJump: number;
  readonly roll: number;
  readonly relift: number;
  readonly sustainCut: number;
}

export interface SolverConfig {
  readonly onsetToleranceSec: number;
  readonly segmentGapSec: number;
  readonly beamWidth: number;
  readonly maxStaticCost: number;
  readonly hardMoveExponent: number;
  readonly shiftRefMm: number;
  readonly minFreeTimeSec: number;
  readonly confidenceScale: number;
  readonly relaxSpanFactor: number;
}

export interface CostContext {
  readonly instrument: InstrumentSpec;
  readonly geometry: GeometryConfig;
  readonly leftHand: LeftHandConfig;
  readonly solver: SolverConfig;
  readonly weights: CostWeights;
  /** [LH-30] pitches that come back soon, so lifting off them is wasteful. */
  readonly pitchReturnsSoon: ReadonlySet<number>;
  readonly noteById: ReadonlyMap<string, NoteEvent>;
}

/** Every feature the static cost is made of, by name (SV-25 keeps them for weight learning). */
export interface StaticFeatures {
  span: number;
  fingerDifficulty: number;
  crossing: number;
  openStrings: number;
  highFret: number;
}

/** Every feature the transition cost is made of. */
export interface TransitionFeatures {
  shift: number;
  shiftCount: number;
  guideFinger: number;
  stringChange: number;
  sameFingerJump: number;
  roll: number;
  relift: number;
  sustainCut: number;
}

export type Features = StaticFeatures | TransitionFeatures;

/** [LH-08] the pinky is the weakest finger, and the cost says so: −ln(p). */
function fingerDifficulty(config: LeftHandConfig, finger: LHFinger): number {
  const probability = config.fingerProb[String(finger)] ?? 0.1;
  return -Math.log(Math.max(1e-6, probability));
}

/** [Part 06 §3] What this hand shape costs to hold, and every feature behind it. */
export function staticFeatures(
  placements: readonly Placement[],
  context: CostContext,
): { cost: number; features: StaticFeatures } {
  const fretted = frettedOf(placements);
  const features: StaticFeatures = {
    span: 0,
    fingerDifficulty: 0,
    crossing: 0,
    openStrings: 0,
    highFret: 0,
  };

  // [LH-04] a stretch past comfortable costs more the further it goes,
  // squared, so two slightly awkward reaches never add up to one
  // impossible one.
  for (let i = 0; i < fretted.length; i++) {
    for (let j = i + 1; j < fretted.length; j++) {
      const a = fretted[i] as Placement;
      const b = fretted[j] as Placement;
      const limit = spanLimit(context.leftHand, a.finger as LHFinger, b.finger as LHFinger);
      if (limit === undefined) continue;
      const distance = placementDistanceMm(context.instrument, context.geometry, a, b);
      const over = Math.max(0, distance - limit.comfort);
      features.span += (over * over) / 100;
    }
  }

  for (const placement of fretted) {
    features.fingerDifficulty += fingerDifficulty(context.leftHand, placement.finger as LHFinger);
    // [LH-09] high positions are a style choice, not a difficulty, so
    // the cost is small and a lead preset can turn it off.
    features.highFret += Math.max(0, placement.fret - context.leftHand.preferredMaxFret);
  }

  // [LH-06] a reverse diagonal: a higher finger on the bass side of a
  // lower one, at neighbouring frets. Real shapes lean the other way.
  for (const a of fretted) {
    for (const b of fretted) {
      if (a === b || a.finger === 'T' || b.finger === 'T') continue;
      const fa = a.finger as number;
      const fb = b.finger as number;
      if (fb > fa && b.string < a.string && Math.abs(a.fret - b.fret) <= 1) features.crossing += 1;
    }
  }

  // [LH-13] an open string costs the left hand nothing at all -- the
  // weight is negative by default, because a beginner reaches for them.
  features.openStrings = placements.filter((placement) => placement.finger === null).length;

  const weights = context.weights;
  const cost =
    weights.span * features.span +
    weights.fingerDifficulty * features.fingerDifficulty +
    weights.crossing * features.crossing +
    weights.openStrings * features.openStrings +
    weights.highFret * features.highFret;

  return { cost, features };
}

export interface TransitionInput {
  readonly previous: readonly Placement[];
  readonly previousHandPos: number;
  readonly next: readonly Placement[];
  readonly nextHandPos: number;
  readonly stage: SolveStage;
}

/**
 * [Part 06 §4] What it costs to get from one hand shape to the next.
 *
 * The features that matter are all about TIME: the same shift is easy
 * with half a second to make it and impossible in a semiquaver, so
 * every movement feature is divided by the time the hand actually has
 * (SV-03). Returns Infinity for a move that breaks a legato link,
 * which discards the candidate outright.
 */
export function transitionFeatures(
  input: TransitionInput,
  context: CostContext,
): { cost: number; features: TransitionFeatures } {
  const features: TransitionFeatures = {
    shift: 0,
    shiftCount: 0,
    guideFinger: 0,
    stringChange: 0,
    sameFingerJump: 0,
    roll: 0,
    relift: 0,
    sustainCut: 0,
  };
  const cost = accumulate(input, context, features);
  return { cost, features };
}

/**
 * The same number, without building the feature list.
 *
 * The solver asks for this hundreds of thousands of times in one song
 * and throws the features away every time; `transitionFeatures` is
 * the same walk with somewhere to write them down. Both go through
 * `accumulate`, so the two can never drift apart.
 */
export function transitionCost(input: TransitionInput, context: CostContext): number {
  return accumulate(input, context, undefined);
}

function accumulate(
  input: TransitionInput,
  context: CostContext,
  out: TransitionFeatures | undefined,
): number {
  const { previous, next, stage } = input;
  const weights = context.weights;

  // [LH-13/SV-03] how long the hand really had. An all-open previous
  // stage lets the window reach back to the last fretted moment: the
  // strings keep ringing while the hand travels.
  let frettedBefore = 0;
  for (const placement of previous) {
    if (placement.finger !== null && placement.fret > 0) frettedBefore++;
  }
  const freeTime =
    frettedBefore === 0 && Number.isFinite(stage.openWindow)
      ? Math.max(stage.freeTime, stage.openWindow)
      : stage.freeTime;
  const time = Math.max(freeTime, context.solver.minFreeTimeSec);

  // [MP-04 feature] the hand's own movement, in millimetres, divided
  // by the time it had to make it.
  const fromX = fingertipXMm(context.instrument, context.geometry, input.previousHandPos);
  const toX = fingertipXMm(context.instrument, context.geometry, input.nextHandPos);
  const shift = Math.abs(toX - fromX) / context.solver.shiftRefMm / time;
  const shiftCount = Math.abs(input.nextHandPos - input.previousHandPos) > 0.5 ? 1 : 0;

  // A finger that stays on its string through the shift is a guide
  // finger: the hand slides along it and lands in the right place.
  let guideFinger = 0;
  if (shiftCount === 1) {
    for (const placement of next) {
      if (placement.finger === null) continue;
      for (const before of previous) {
        if (before.finger === placement.finger && before.string === placement.string) {
          guideFinger = 1;
          break;
        }
      }
      if (guideFinger === 1) break;
    }
  }

  // [Hori & Sagayama] crossing strings costs something even when the
  // hand does not move: the picking hand has to find the new one.
  const fromString = previous[previous.length - 1]?.string;
  const toString = next[next.length - 1]?.string;
  const stringChange =
    fromString === undefined || toString === undefined
      ? 0
      : Math.log(1 + Math.abs(toString - fromString));

  let sameFingerJump = 0;
  let roll = 0;
  for (const placement of next) {
    if (placement.finger === null) continue;
    const before = previous.find((other) => other.finger === placement.finger);
    if (before === undefined) continue;
    if (before.string === placement.string && before.fret === placement.fret) continue;
    if (before.fret === placement.fret && Math.abs(before.string - placement.string) === 1) {
      // [LH-32] rolling a finger onto the neighbouring string at the
      // same fret is one movement of one knuckle: almost free.
      roll += 1;
    } else {
      sameFingerJump += 1 / Math.max(stage.dt, context.solver.minFreeTimeSec);
    }
  }

  let sustainCut = 0;
  let relift = 0;
  for (const placement of previous) {
    const note = context.noteById.get(placement.noteId);
    if (note === undefined) continue;

    // [LH-31] cutting a note that is still meant to be ringing.
    const end = note.time + note.duration;
    if (end > stage.time + 1e-6) {
      let kept = false;
      for (const other of next) {
        if (other.noteId === placement.noteId) {
          kept = true;
          break;
        }
      }
      if (!kept) sustainCut += note.duration > 0 ? (end - stage.time) / note.duration : 1;
    }

    // [LH-30] taking a finger off a note that comes back in a moment.
    // Phase 1 judges "comes back" by pitch: which spot a future note
    // will use is not decided until the solver reaches it. CALIBRATE.
    if (placement.finger !== null && context.pitchReturnsSoon.has(note.pitch)) {
      let stays = false;
      for (const other of next) {
        if (other.string === placement.string && other.fret === placement.fret) {
          stays = true;
          break;
        }
      }
      if (!stays) relift += 1;
    }
  }

  // [LH-20/22] a hammer-on, pull-off or slide is physically tied to
  // the note before it: same string, and for a slide the same finger.
  for (const placement of next) {
    const note = context.noteById.get(placement.noteId);
    const links = note?.techniqueLinks;
    if (links === undefined) continue;
    for (const link of links) {
      if (link.fromNoteId === undefined) continue;
      const source = previous.find((other) => other.noteId === link.fromNoteId);
      if (source === undefined) continue;
      if (source.string !== placement.string) return Infinity;
      if (link.type === 'slide' && source.finger !== placement.finger) return Infinity;
    }
  }

  if (out !== undefined) {
    out.shift = shift;
    out.shiftCount = shiftCount;
    out.guideFinger = guideFinger;
    out.stringChange = stringChange;
    out.sameFingerJump = sameFingerJump;
    out.roll = roll;
    out.relift = relift;
    out.sustainCut = sustainCut;
  }

  const raw =
    weights.shift * shift +
    weights.shiftCount * shiftCount +
    weights.guideFinger * guideFinger +
    weights.stringChange * stringChange +
    weights.sameFingerJump * sameFingerJump +
    weights.roll * roll +
    weights.relift * relift +
    weights.sustainCut * sustainCut;

  // [Ct'] The hardest-move emphasis. Raising the cost to a power above
  // one makes the solver avoid a single very hard move even when the
  // total would be slightly lower with it -- which is what makes a
  // fingering feel human rather than merely cheap.
  return raw <= 0 ? raw : Math.pow(raw, context.solver.hardMoveExponent);
}

/**
 * [LH-30] The pitches that come back within the persistence window.
 *
 * Worked out once for the whole part rather than per state, because
 * it depends on the music, not on how the music is being played.
 */
export function pitchesReturningSoon(
  notes: readonly NoteEvent[],
  windowSec: number,
): ReadonlySet<number> {
  const returns = new Set<number>();
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i] as NoteEvent;
    for (let j = i + 1; j < notes.length; j++) {
      const later = notes[j] as NoteEvent;
      if (later.time - note.time > windowSec) break;
      if (later.pitch === note.pitch) {
        returns.add(note.pitch);
        break;
      }
    }
  }
  return returns;
}
