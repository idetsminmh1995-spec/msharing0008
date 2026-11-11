/**
 * fingeringCost.ts — what a fingering costs a player.
 *
 * Module 3's cost function, and nothing else. It does not search; it
 * says what a shape costs to hold and what it costs to get from one to
 * the next, and `fingeringSolver.ts` finds the cheapest way through.
 * Keeping the two apart is what lets a rule change without the search
 * noticing, which is the only way a cost model this fiddly stays
 * readable.
 *
 * Every number below is a WEIGHT, not a measurement. They are ordered
 * by how much a player would mind, and the ordering is the part that
 * matters: a stretch past the hand's maximum has to beat a thumb on a
 * black key, which has to beat an uncomfortable span, which has to beat
 * a slightly longer travel. Tuning one is safe; reordering two changes
 * what the engine thinks piano playing is.
 */

import type { Finger, Hand } from '../core/types.js';
import { keyDistanceMm, type Keyboard } from '../keyboard/keyPosition.js';
import { WHITE_KEY_WIDTH_MM, isBlackKey } from '../keyboard/pianoGeometry.js';
import { spanStrain, type Span, type FingerPair } from './handSpan.js';

/** One onset of one hand: a note, or the members of a chord, lowest first. */
export interface FingeringStage {
  readonly timeMs: number;
  readonly durationMs: number;
  readonly hand: Hand;
  /** Lowest pitch first, always -- the fingers put on them have to run the same way. */
  readonly notes: readonly { readonly id: string; readonly midi: number }[];
}

/** One way to play a stage: a finger per note, in the stage's own order. */
export interface FingeringState {
  readonly fingers: readonly Finger[];
}

export interface CostContext {
  readonly keyboard: Keyboard;
  readonly spans: Readonly<Record<FingerPair, Span>>;
}

/** Refused outright. The solver relaxes and asks again rather than failing. */
export const IMPOSSIBLE = Number.POSITIVE_INFINITY;

const WEIGHT = {
  /** Past what the hand reaches. Not a preference. */
  beyondReach: IMPOSSIBLE,
  /** Between comfort and the maximum, rising. */
  stretch: 6,
  /** The thumb on a black key: short, and it has to reach past the whites either side. */
  thumbOnBlack: 2.2,
  /** The little finger on a black key: shorter than its neighbours, so it has to over-reach. */
  pinkyOnBlack: 0.9,
  /** A long finger (2, 3, 4) on a white key between two blacks it has to thread. */
  longFingerBetweenBlacks: 0.25,
  /** How far the hand moved, per white key. */
  travel: 0.35,
  /** Moving faster than a hand moves, per millimetre per millisecond past the limit. */
  rush: 5,
  /** Changing finger on a key that is simply repeated. */
  pointlessChange: 1.1,
  /** Keeping the same finger on a repeat too fast to re-strike with it. */
  rushedRepeat: 3,
  /** 3 over 4, 2 over 3 -- a crossing that is not a thumb-under. */
  awkwardCross: 4.5,
  /** The thumb passing under, which is the ordinary way to continue a scale. */
  thumbUnder: 0.4,
  /** A finger crossing OVER the thumb, the other half of the same move. */
  fingerOverThumb: 0.5,
  /** A thumb-under that is not going anywhere -- the hand did not actually need it. */
  idleThumbUnder: 2,
} as const;

/**
 * How fast a hand can move along the keyboard and still land accurately,
 * in millimetres per millisecond.
 *
 * One metre a second. A fast leap in real playing, and the point past
 * which the cost climbs hard rather than being refused -- a player asked
 * to do the impossible does it badly rather than stopping, and so should
 * this.
 */
const COMFORTABLE_SPEED_MM_PER_MS = 1;

/**
 * What it costs to hold one shape.
 *
 * Span first, because it is the only thing here that can be impossible,
 * then the per-note awkwardnesses.
 */
export function stageCost(
  state: FingeringState,
  stage: FingeringStage,
  context: CostContext,
): number {
  const { notes } = stage;
  if (state.fingers.length !== notes.length) return IMPOSSIBLE;

  let cost = 0;

  // Two notes cannot share a finger, and the fingers have to run the
  // same way as the pitches -- a hand's fingers cannot cross inside one
  // chord however much it would help.
  const seen = new Set<Finger>();
  for (const finger of state.fingers) {
    if (seen.has(finger)) return IMPOSSIBLE;
    seen.add(finger);
  }
  if (!runsInOrder(state.fingers, stage.hand)) return IMPOSSIBLE;

  // Span: every pair, not just the outer two. A chord can be inside the
  // thumb-to-little reach and still ask 3 and 4 for a sixth.
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const a = notes[i];
      const b = notes[j];
      const fa = state.fingers[i];
      const fb = state.fingers[j];
      if (a === undefined || b === undefined || fa === undefined || fb === undefined) continue;
      const verdict = spanStrain(
        context.spans,
        fa,
        fb,
        keyDistanceMm(context.keyboard, a.midi, b.midi),
      );
      if (verdict.impossible) return IMPOSSIBLE;
      cost += verdict.strain * WEIGHT.stretch;
    }
  }

  // What each finger is being asked to stand on.
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const finger = state.fingers[i];
    if (note === undefined || finger === undefined) continue;
    const black = isBlackKey(note.midi);
    if (black && finger === 1) cost += WEIGHT.thumbOnBlack;
    if (black && finger === 5) cost += WEIGHT.pinkyOnBlack;
    if (!black && (finger === 2 || finger === 3 || finger === 4) && betweenBlacks(note.midi)) {
      cost += WEIGHT.longFingerBetweenBlacks;
    }
  }

  return cost;
}

/**
 * What it costs to get from one shape to the next.
 *
 * This is where most of real fingering lives. A shape that is cheap to
 * hold and impossible to leave is not a fingering a player would use,
 * and a per-note solver cannot tell the difference.
 */
export function transitionCost(
  from: FingeringState,
  to: FingeringState,
  fromStage: FingeringStage,
  toStage: FingeringStage,
  context: CostContext,
): number {
  const fromAnchor = anchorOf(from, fromStage);
  const toAnchor = anchorOf(to, toStage);
  if (fromAnchor === undefined || toAnchor === undefined) return 0;

  let cost = 0;

  // How far the HAND moved -- measured from where the thumb would sit
  // for each shape, not from the notes, because that is what actually
  // travels. A run up a scale under one hand position moves the hand
  // not at all even though every note is different.
  const shiftMm = Math.abs(
    keyDistanceMm(context.keyboard, fromAnchor.anchorMidi, toAnchor.anchorMidi),
  );
  cost += (shiftMm / WHITE_KEY_WIDTH_MM) * WEIGHT.travel;

  const gapMs = Math.max(1, toStage.timeMs - fromStage.timeMs);
  const speed = shiftMm / gapMs;
  if (speed > COMFORTABLE_SPEED_MM_PER_MS) {
    cost += (speed - COMFORTABLE_SPEED_MM_PER_MS) * WEIGHT.rush;
  }

  // A repeated note.
  if (fromStage.notes.length === 1 && toStage.notes.length === 1) {
    const a = fromStage.notes[0];
    const b = toStage.notes[0];
    const fa = from.fingers[0];
    const fb = to.fingers[0];
    if (a !== undefined && b !== undefined && fa !== undefined && fb !== undefined) {
      if (a.midi === b.midi) {
        // Slow enough to lift and re-strike with the same finger, so
        // changing finger is fussy. Fast, and the same finger cannot do
        // it -- which is why a repeated note at speed alternates.
        const canRestrike = gapMs >= 140;
        if (canRestrike && fa !== fb) cost += WEIGHT.pointlessChange;
        if (!canRestrike && fa === fb) cost += WEIGHT.rushedRepeat;
      }
    }
  }

  // Crossings, which is the part that makes a scale a scale.
  cost += crossingCost(from, to, fromStage, toStage, context);

  return cost;
}

/**
 * Thumb-under, finger-over, and the crossings that are neither.
 *
 * A scale continues past a five-finger position in exactly one way: the
 * thumb passes UNDER the hand to the next note up (going up, in the
 * right hand), or a finger crosses OVER the thumb going down. Both are
 * ordinary and both are cheap. Any other crossing -- a third finger
 * reaching past a fourth -- is a player doing something they would
 * rather not.
 *
 * The test for "did the hand actually need this" is whether the music
 * kept GOING in the same direction. A thumb-under that happens and then
 * turns straight back is the solver finding a cheap move rather than a
 * musical one, and it costs more than not doing it.
 */
function crossingCost(
  from: FingeringState,
  to: FingeringState,
  fromStage: FingeringStage,
  toStage: FingeringStage,
  context: CostContext,
): number {
  if (fromStage.notes.length !== 1 || toStage.notes.length !== 1) return 0;
  const a = fromStage.notes[0];
  const b = toStage.notes[0];
  const fa = from.fingers[0];
  const fb = to.fingers[0];
  if (a === undefined || b === undefined || fa === undefined || fb === undefined) return 0;

  const step = keyDistanceMm(context.keyboard, a.midi, b.midi);
  if (step === 0) return 0;

  // In the player's own frame: positive means "outward from the thumb",
  // which is upward for the right hand and downward for the left. That
  // one flip is the whole difference between the two hands.
  const outward = toStage.hand === 'right' ? step > 0 : step < 0;

  // Going outward, finger numbers should rise; coming back, they fall.
  const fingersRose = fb > fa;
  if (outward === fingersRose) return 0;

  // They disagree, so something crossed.
  if (outward && fb === 1) {
    // The thumb went under to carry on outward. The ordinary move --
    // unless the next note is barely a step away, which is the hand
    // doing it for nothing.
    const stepWhites = Math.abs(step) / WHITE_KEY_WIDTH_MM;
    return stepWhites <= 2.5 ? WEIGHT.thumbUnder : WEIGHT.idleThumbUnder;
  }
  if (!outward && fa === 1) {
    // A finger crossed over the thumb, coming back in. The other half
    // of the same move.
    return WEIGHT.fingerOverThumb;
  }
  return WEIGHT.awkwardCross;
}

/** Fingers must run the same way as the pitches they are on. */
function runsInOrder(fingers: readonly Finger[], hand: Hand): boolean {
  for (let i = 1; i < fingers.length; i++) {
    const previous = fingers[i - 1];
    const current = fingers[i];
    if (previous === undefined || current === undefined) continue;
    // The stage's notes are lowest first. For the right hand the thumb
    // is the low side, so fingers rise; for the left hand it is the
    // high side, so they fall.
    if (hand === 'right' ? current <= previous : current >= previous) return false;
  }
  return true;
}

/**
 * Where the hand sits for a shape, as the MIDI note the THUMB would be
 * on -- whether or not the thumb is playing.
 *
 * A hand position is not the note being played: a right hand playing
 * G with finger 3 is sitting around E, and a hand that moves from
 * "playing C with 1" to "playing G with 5" has not moved at all. The
 * whole travel cost depends on getting this right.
 */
function anchorOf(
  state: FingeringState,
  stage: FingeringStage,
): { readonly anchorMidi: number } | undefined {
  const note = stage.notes[0];
  const finger = state.fingers[0];
  if (note === undefined || finger === undefined) return undefined;
  // Each finger past the thumb sits about one white key further out.
  const steps = (finger - 1) * (stage.hand === 'right' ? -1 : 1);
  return { anchorMidi: shiftByWhites(note.midi, steps) };
}

/** Move a MIDI note by whole white keys, which is how a hand is spaced. */
function shiftByWhites(midi: number, whites: number): number {
  if (whites === 0) return midi;
  const direction = whites > 0 ? 1 : -1;
  let remaining = Math.abs(whites);
  let current = midi;
  while (remaining > 0) {
    current += direction;
    if (!isBlackKey(current)) remaining--;
  }
  return current;
}

/** True when a white key has a black key on both sides -- D, G, A. */
function betweenBlacks(midi: number): boolean {
  return !isBlackKey(midi) && isBlackKey(midi - 1) && isBlackKey(midi + 1);
}

export { WEIGHT as FINGERING_WEIGHTS, anchorOf as handAnchorOf };
