/**
 * types.ts — the data model the whole engine agrees on.
 *
 *
 * THE COORDINATE SYSTEM, ONCE, HERE
 *
 * Everything in this engine is in MILLIMETRES on a real piano, not in
 * pixels of a drawing. That is the one decision the rest of it rests
 * on: a hand's reach is 200mm whatever size the video is, a thumb
 * passing under the middle finger travels about three white keys, and a
 * black key stands 11mm proud of its neighbours. None of that can be
 * said in "fractions of a box", which is how `piano-engine`'s drawn
 * keyboard necessarily works, so this engine keeps its own geometry and
 * the renderer maps millimetres to whatever box it was given.
 *
 *   x  ALONG the keyboard, rising to the player's RIGHT.
 *      0 is the left edge of the lowest key of the instrument.
 *   y  UP. 0 is the playing surface of a white key at rest; a black
 *      key's surface is positive, a pressed key's is negative.
 *   z  AWAY from the player. 0 is the front edge of the white keys, so
 *      a fingertip resting on the front third of a white key is at a
 *      small positive z and the fallboard is at the far end.
 *
 * Right-handed, y up: the same convention WebGL uses, so a renderer can
 * take these numbers as they are.
 */

/** A point or a direction in millimetres. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Radians, applied X then Y then Z, which is what a renderer's default Euler order expects. */
export interface Euler {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type Hand = 'left' | 'right';

/** Thumb, index, middle, ring, little -- the numbers a pianist uses, in both hands. */
export type Finger = 1 | 2 | 3 | 4 | 5;

export const ALL_FINGERS: readonly Finger[] = [1, 2, 3, 4, 5];

/** The anatomical name for each, for anything that reads better that way. */
export const FINGER_NAMES: Readonly<
  Record<Finger, 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'>
> = {
  1: 'thumb',
  2: 'index',
  3: 'middle',
  4: 'ring',
  5: 'pinky',
};

/**
 * One key of the instrument, as a solid object rather than a rectangle
 * on a screen.
 *
 * `x`/`y`/`z` is the NEAR LEFT corner of the key's playing surface --
 * the corner closest to the player, on its left -- and `width`/`depth`
 * run from there. `y` is that surface's height, which is 0 for a white
 * key and `BLACK_KEY_RISE` for a black one; a key is a solid below it
 * and nothing above.
 *
 * A corner and not a centre because that is the thing two adjacent keys
 * share: a black key's left edge is a fact about where it sits between
 * its neighbours, while its centre is a number computed from it.
 * `keyStrikePoint` gives the centre, and where along the key a finger
 * actually presses, which is not the middle.
 */
export interface PianoKey3D {
  readonly midi: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly isBlack: boolean;
}

/**
 * One joint of one finger, as an angle rather than a position.
 *
 * Angles and not points because a finger is a chain: the tip's position
 * is whatever the three joints before it put it at, and storing both
 * invites them to disagree. `handPose.ts` turns these into points.
 *
 * All in radians, all FLEXION-positive -- a larger number curls the
 * finger further toward the palm, which is the only direction these
 * joints really go. `spread` is the one exception: it is abduction at
 * the knuckle, positive AWAY from the thumb side of the hand, and it is
 * the joint that opens a hand from a fifth to an octave.
 */
export interface FingerState {
  /** Metacarpophalangeal: the knuckle, where the finger meets the hand. */
  readonly mcp: number;
  /** Proximal interphalangeal: the middle joint. */
  readonly pip: number;
  /** Distal interphalangeal: the one nearest the nail. */
  readonly dip: number;
  /** Abduction at the knuckle: how far this finger is fanned out from its neighbours. */
  readonly spread: number;
}

export type MovementState =
  | 'REST'
  | 'PREPARE'
  | 'TRAVEL'
  | 'ALIGN'
  | 'PRESS'
  | 'HOLD'
  | 'RELEASE'
  | 'SHIFT'
  | 'CROSS'
  | 'RESET';

/**
 * One hand at one instant.
 *
 * It is a STATE and not a description of a note: the planner carries
 * one of these forward through the piece and the renderer reads it at
 * whatever millisecond it is drawing. `currentAnchorKey` is the key the
 * hand is organised around -- for a five-finger position, the one under
 * the thumb -- and it is what makes a hand shift read as a shift rather
 * than as five fingers independently deciding to move.
 */
export interface HandState {
  readonly hand: Hand;
  readonly wristPosition: Vec3;
  readonly wristRotation: Euler;
  readonly palmPosition: Vec3;
  readonly palmRotation: Euler;
  readonly fingers: Readonly<Record<Finger, FingerState>>;
  readonly currentAnchorKey: number | null;
  readonly targetKey: number | null;
  readonly movementState: MovementState;
}

/** What a passage is doing, which decides how the hand should move through it. */
export type Technique =
  | 'NORMAL'
  | 'CHORD'
  | 'ARPEGGIO'
  | 'SCALE'
  | 'THUMB_UNDER'
  | 'CROSS'
  | 'SHIFT'
  | 'REPEAT'
  | 'OCTAVE';

/**
 * A note as it ARRIVES, before this engine has decided anything.
 *
 * Deliberately wider than `piano-engine`'s `PianoNote`, which carries
 * only pitch, time and a hand. Everything here beyond those is evidence
 * the source already holds and the current piano page throws away at
 * `buildPianoNotes()`: which staff the note was written on, which voice
 * it belongs to, whether the file states a fingering, whether it is
 * part of a chord. Module 2's hand split and Module 3's fingering both
 * need it, and neither can recover it from a pitch.
 */
export interface PerformanceNote {
  /** Stable, and carried through to the output so a frame can be traced to a note on the staff. */
  readonly id: string;
  readonly midi: number;
  readonly timeMs: number;
  readonly durationMs: number;
  /** 1..127. Absent where the source has no dynamics at all. */
  readonly velocity?: number;
  /** MusicXML `<staff>`: 1 is the upper staff of a grand staff. The strongest evidence of hand there is. */
  readonly staff?: number;
  /** MusicXML `<voice>`, or a MIDI track. Two voices on one staff are usually two things one hand is doing. */
  readonly voice?: number;
  /** A MIDI file's track index, where that is all there is. */
  readonly track?: number;
  /** `<technical><fingering>`, when the file states one. The engine must not overrule it. */
  readonly statedFinger?: Finger;
  /** Stated by the source, not inferred: a `<direction>` or a track name that names a hand. */
  readonly statedHand?: Hand;
  /** Notes sharing one id sound together; a chord's members all carry the same one. */
  readonly chordId?: string;
}

/**
 * One note, fully solved: which hand, which finger, where that key is,
 * and where the hand has to be for the finger to reach it.
 *
 * This is the engine's intermediate representation -- serialisable,
 * inspectable, and produced in full BEFORE any frame is drawn. A
 * renderer that cannot read this is a renderer this engine cannot
 * drive, which is the point: the motion is a fact about the music, not
 * a property of one drawing of it.
 */
export interface PianoPerformanceEvent {
  readonly id: string;
  readonly timeMs: number;
  readonly durationMs: number;
  readonly midi: number;
  readonly velocity: number;
  readonly hand: Hand;
  readonly finger: Finger;
  readonly keyPosition: Vec3;
  readonly handTarget: Vec3;
  readonly wristTarget: Vec3;
  readonly technique: Technique;
  /**
   * How sure the engine is, 0 to 1.
   *
   * 1 where the source stated the answer outright -- a `<fingering>`, a
   * staff that says which hand -- and lower where the engine inferred
   * it. A renderer may ignore it; a teacher reviewing a generated
   * lesson should not have to guess which notes were guesses.
   */
  readonly confidence: number;
}
