/**
 * keyPosition.ts — a MIDI note to the place a finger has to be.
 *
 * Module 1's second half, and Phase 2 of the build: every note the
 * music contains becomes an exact point in millimetres on the
 * instrument. Nothing here knows about fingering, hands or motion -- it
 * answers "where is that key, and where on it does a finger land",
 * which is the question everything downstream starts from.
 */

import type { PerformanceNote, PianoKey3D, Vec3 } from '../core/types.js';
import {
  BLACK_KEY_RISE_MM,
  KEY_DIP_MM,
  WHITE_KEY_DEPTH_MM,
  WHITE_KEY_WIDTH_MM,
  isBlackKey,
  keyboardGeometry3D,
  keyboardRange,
  whiteIndex,
  type KeyboardRange,
  type KeyboardSize,
} from './pianoGeometry.js';

/**
 * Where along a WHITE key a finger actually presses, as a fraction of
 * its depth from the front edge.
 *
 * Not the middle. A pianist plays a white key on the part in front of
 * the black keys, because that is the only part of it a hand can reach
 * without the fingers having to thread between the blacks -- and the
 * whites' front section is 55mm of a 150mm key. A third of the way back
 * is the middle of that section, which is where a relaxed hand lands.
 */
const WHITE_STRIKE_FRACTION = 0.3;

/**
 * And where along a BLACK key, as a fraction of its depth from ITS
 * front edge.
 *
 * Further back proportionally than a white key's, and for the opposite
 * reason: a black key's front end is the end that is in among the white
 * keys' tails, and a finger that presses it right at the tip is a
 * finger that will catch the white key beside it. Two fifths back puts
 * the contact on the flat of the key.
 */
const BLACK_STRIKE_FRACTION = 0.4;

/** A keyboard, indexed, so a lookup is not a scan. */
export interface Keyboard {
  readonly size: KeyboardSize | KeyboardRange;
  readonly keys: readonly PianoKey3D[];
  readonly byMidi: ReadonlyMap<number, PianoKey3D>;
  readonly first: number;
  readonly last: number;
}

export function buildKeyboard(size: KeyboardSize | KeyboardRange = 88, originX = 0): Keyboard {
  const keys = keyboardGeometry3D({ size, originX });
  const byMidi = new Map<number, PianoKey3D>();
  for (const key of keys) byMidi.set(key.midi, key);
  const { first, last } = keyboardRange(size);
  return { size, keys, byMidi, first, last };
}

export function keyOf(keyboard: Keyboard, midi: number): PianoKey3D | undefined {
  return keyboard.byMidi.get(midi);
}

/**
 * The point a fingertip touches to sound a key, with the key at rest.
 *
 * Centred across the key's width, at the strike fraction along its
 * depth, on its playing surface. `pressDepthMm` lowers it by however
 * far the key has gone down, so a renderer animating a key's travel can
 * keep the fingertip on it instead of letting the key sink away.
 */
export function keyStrikePoint(key: PianoKey3D, pressDepthMm = 0): Vec3 {
  const fraction = key.isBlack ? BLACK_STRIKE_FRACTION : WHITE_STRIKE_FRACTION;
  return {
    x: key.x + key.width / 2,
    y: key.y - clamp(pressDepthMm, 0, KEY_DIP_MM),
    z: key.z + key.depth * fraction,
  };
}

/**
 * How far above a key a finger has to be to clear everything on the way
 * there, in millimetres above the white keys' surface.
 *
 * A black key stands 11mm proud, so a finger travelling across one has
 * to be above that or it is dragging through it. The extra 4mm is the
 * fingertip's own thickness plus enough that a near miss still looks
 * like a miss rather than a graze.
 */
export const TRAVEL_CLEARANCE_MM = BLACK_KEY_RISE_MM + 4;

/** The same strike point, lifted clear for travel. */
export function keyApproachPoint(key: PianoKey3D): Vec3 {
  const strike = keyStrikePoint(key);
  return { ...strike, y: TRAVEL_CLEARANCE_MM };
}

/**
 * How far apart two keys are ALONG the keyboard, in millimetres.
 *
 * Signed, left to right, measured centre to centre: this is the number
 * a hand shift costs and the number a span has to cover, and it is not
 * the interval in semitones -- an octave is seven white keys wide
 * whatever accidentals are in it, and C to C# is barely any distance at
 * all while E to F is a whole key.
 */
export function keyDistanceMm(keyboard: Keyboard, fromMidi: number, toMidi: number): number {
  const from = keyOf(keyboard, fromMidi);
  const to = keyOf(keyboard, toMidi);
  if (from === undefined || to === undefined) {
    // Off the instrument: fall back to the white-key ruler, which is
    // defined for every MIDI number rather than only for keys that
    // exist. A note out of range is a warning for the caller, not a
    // reason for the geometry to throw.
    return (whiteIndex(toMidi) - whiteIndex(fromMidi)) * WHITE_KEY_WIDTH_MM;
  }
  return to.x + to.width / 2 - (from.x + from.width / 2);
}

/** The same distance in white keys, which is how a hand's span is stated. */
export function keyDistanceWhites(keyboard: Keyboard, fromMidi: number, toMidi: number): number {
  return keyDistanceMm(keyboard, fromMidi, toMidi) / WHITE_KEY_WIDTH_MM;
}

/**
 * A note that is not on this instrument.
 *
 * Reported rather than thrown, and rather than silently clamped: a
 * score written for 88 keys played on a 61 is a real thing that
 * happens, and the caller has to decide whether to transpose it, drop
 * the note or widen the keyboard. The engine's job is to say which
 * notes are the problem.
 */
export interface OutOfRangeNote {
  readonly id: string;
  readonly midi: number;
  readonly nearest: number;
}

export interface KeyPositionResult {
  /** One entry per note that IS on the instrument, in the order it was given. */
  readonly positions: readonly NoteKeyPosition[];
  readonly outOfRange: readonly OutOfRangeNote[];
}

/** A note and the key it sounds, with everything a motion planner needs about that key. */
export interface NoteKeyPosition {
  readonly id: string;
  readonly midi: number;
  readonly timeMs: number;
  readonly durationMs: number;
  readonly key: PianoKey3D;
  /** Where the fingertip meets the key. */
  readonly strike: Vec3;
  /** The same point, lifted to travel height -- where a finger is just before and just after. */
  readonly approach: Vec3;
}

/**
 * Phase 2: every note of a performance, placed on the instrument.
 *
 * Order is preserved exactly, including simultaneous notes: a chord's
 * members come out in the order they went in, because the hand split
 * and the fingering solver both look at chords as groups and a
 * reordered group is a different chord shape.
 */
export function keyPositionsFor(
  notes: readonly PerformanceNote[],
  keyboard: Keyboard,
): KeyPositionResult {
  const positions: NoteKeyPosition[] = [];
  const outOfRange: OutOfRangeNote[] = [];

  for (const note of notes) {
    const key = keyOf(keyboard, note.midi);
    if (key === undefined) {
      outOfRange.push({
        id: note.id,
        midi: note.midi,
        nearest: clamp(note.midi, keyboard.first, keyboard.last),
      });
      continue;
    }
    positions.push({
      id: note.id,
      midi: note.midi,
      timeMs: note.timeMs,
      durationMs: note.durationMs,
      key,
      strike: keyStrikePoint(key),
      approach: keyApproachPoint(key),
    });
  }

  return { positions, outOfRange };
}

/**
 * How far down a key is at one instant, in millimetres.
 *
 * A key is not a switch: it takes a few milliseconds to go down and
 * rather longer to come back up, and a hand drawn on a key that snapped
 * to the bottom reads as a machine. The attack is fast because the
 * finger drives it and the release is slower because a spring does.
 *
 * Outside the note it is zero, which is what makes this safe to call
 * for every key on every frame.
 */
export function keyPressDepthMm(
  timeMs: number,
  note: { readonly timeMs: number; readonly durationMs: number },
  options: { readonly attackMs?: number; readonly releaseMs?: number } = {},
): number {
  const attack = options.attackMs ?? 28;
  const release = options.releaseMs ?? 70;
  const start = note.timeMs;
  const end = note.timeMs + note.durationMs;
  if (timeMs <= start) return 0;
  if (timeMs < start + attack) {
    return KEY_DIP_MM * easeOutQuad((timeMs - start) / attack);
  }
  if (timeMs <= end) return KEY_DIP_MM;
  if (timeMs < end + release) {
    return KEY_DIP_MM * (1 - easeOutQuad((timeMs - end) / release));
  }
  return 0;
}

/** Fast at first, settling at the end: a key driven down, and a key let up. */
function easeOutQuad(t: number): number {
  const u = clamp(t, 0, 1);
  return 1 - (1 - u) * (1 - u);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** Re-exported so a caller placing notes does not also have to import the geometry module. */
export { isBlackKey, WHITE_KEY_WIDTH_MM, WHITE_KEY_DEPTH_MM, KEY_DIP_MM };
