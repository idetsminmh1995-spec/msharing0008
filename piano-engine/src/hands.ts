/**
 * hands.ts — two hands on the keys.
 *
 * This file is the BRIDGE and nothing else: it turns a keyboard and a
 * fingering into the targets `hand/pose.ts` solves, and turns the
 * shapes `hand/draw.ts` gives back into the stage's own rectangles and
 * paths. The hand itself lives in `hand/`:
 *
 *   hand/anatomy.ts  what a hand is, measured in white keys
 *   hand/pose.ts     where it puts itself to play what it is playing
 *   hand/draw.ts     that pose, as one smooth shape
 *
 * None of those three know about keyboards, notes, seconds or SVG, and
 * none of them can be wrong about a hand in a way a keyboard could
 * fix. That is the whole reason they are separate.
 *
 *
 * WHAT A HAND DOES THAT THE FIRST VERSIONS DID NOT
 *
 * It MOVES AND TURNS to play. A hand asked for a key its thumb cannot
 * reach does not grow a thumb -- it shifts along the keys and tilts,
 * and the other four fingers go with it, because a hand is one object.
 * Posing fingers one at a time is what produced a tentacle thumb and
 * fingers crossing their neighbours; posing the HAND once and letting
 * the fingers follow is what a player does.
 *
 * Both hands are on the keyboard the whole time, the way a player's
 * are: the one that is not playing does not leave, it waits over the
 * keys it last used.
 */

import { darken } from './color.js';
import { keyboardGeometry } from './keyboard.js';
import { anchorAt, fingersDownAt } from './fingering.js';
import type { Finger, FingeredNote, HandAnchor } from './fingering.js';
import type { Hand, KeyboardSize, PianoKey, StageShape } from './types.js';
import { ALL_FINGERS, KNUCKLE_FROM_FRONT, PALM_LENGTH } from './hand/anatomy.js';
import { poseFingers, solvePose } from './hand/pose.js';
import type { FingerTarget, PosedFinger } from './hand/pose.js';
import { drawHand } from './hand/draw.js';

/**
 * The furthest forward a finger on a BLACK key may be, down the key.
 *
 * A black key ENDS part way down the board, so a finger on one cannot
 * be out in front of it. For the four long fingers this never binds --
 * their natural reach is already up among the black keys, which is why
 * a player leaves them there. It is the thumb, which plays out at the
 * front, that has to come back for a black key, and the hand with it.
 */
const BLACK_TIP_DEPTH = 0.45;

export interface HandColors {
  /** The hand itself. */
  readonly skin: string;
  /** Its edge, and the creases. Darker than the skin, not black. */
  readonly edge: string;
  /** A pressed fingertip, so the finger doing the work is readable. */
  readonly tip: string;
}

/**
 * The hands as they are drawn unless a caller says otherwise.
 *
 * Both hands share one skin, because they are the same player's; what
 * tells them apart is the edge and the pressing fingertip, each tinted
 * to that hand's note colour (`leftHand` / `rightHand` on the stage).
 * So a viewer who has learnt that the amber bars are the left hand
 * reads the amber-edged hand as the left one without being told.
 */
export const DEFAULT_HAND_COLORS: Readonly<Record<Hand, HandColors>> = {
  left: { skin: '#E8C6A0', edge: '#B3800E', tip: '#FFC400' },
  right: { skin: '#E8C6A0', edge: '#2E6DA8', tip: '#4FA3FF' },
};

/**
 * Hands that match the notes they are playing.
 *
 * The page lets a user pick a colour per hand, and the falling bars
 * are drawn in it. The hands take the same two colours -- on the
 * fingertip that is pressing and on the outline -- so the hand playing
 * the amber notes is the amber-edged one without a legend. The skin
 * itself stays neutral, because two differently coloured hands read as
 * two different people.
 */
export function handColorsFor(colors: {
  readonly leftHand: string;
  readonly rightHand: string;
  /** The hands themselves, when the default does not suit the frame. */
  readonly skin?: string;
}): Readonly<Record<Hand, HandColors>> {
  const skin = colors.skin ?? DEFAULT_HAND_COLORS.left.skin;
  return {
    left: { skin, edge: darken(colors.leftHand, 0.42), tip: colors.leftHand },
    right: { skin, edge: darken(colors.rightHand, 0.42), tip: colors.rightHand },
  };
}

export interface HandsOptions {
  readonly size: KeyboardSize;
  /** The keyboard's own box, as `keyboardGeometry` was given it. */
  readonly board: { x: number; y: number; width: number; height: number };
  readonly seconds: number;
  readonly notes: readonly FingeredNote[];
  readonly anchors: Readonly<Record<Hand, readonly HandAnchor[]>>;
  /** Per hand, so the left and right read apart at a glance. */
  readonly colors: Readonly<Record<Hand, HandColors>>;
  /** 1 is the size that fits the keys; below 1 draws smaller hands. */
  readonly scale?: number;
  /**
   * A numbered badge on each key being played. Default true.
   *
   * This is the one thing a hand on a keyboard cannot say by itself:
   * you can see WHICH key is down, but not which finger a learner
   * should use, because the hand covering it is the thing in the way.
   * Every piano lesson video puts the number on the key for exactly
   * that reason.
   */
  readonly fingerNumbers?: boolean;
}

/** Where one finger ends up, in the keyboard's own coordinates. */
export interface Fingertip {
  readonly finger: Finger;
  readonly x: number;
  readonly y: number;
  readonly pressed: boolean;
  readonly onBlack: boolean;
  /** The key it is pressing, when it is pressing one. */
  readonly midi?: number;
}

/** The white keys, in order, so a hand can be placed by counting them. */
function whiteKeys(keys: readonly PianoKey[]): readonly PianoKey[] {
  return keys.filter((key) => !key.black).sort((a, b) => a.x - b.x);
}

/**
 * The x of a white-key position, including the half-steps between two
 * of them -- a hand sits where it sits, not only on whole keys.
 */
function xAtWhite(whites: readonly PianoKey[], index: number): number | undefined {
  if (whites.length === 0) return undefined;
  const clamped = Math.max(0, Math.min(whites.length - 1, index));
  const low = whites[Math.floor(clamped)];
  const high = whites[Math.min(whites.length - 1, Math.ceil(clamped))];
  if (low === undefined || high === undefined) return undefined;
  const t = clamped - Math.floor(clamped);
  return low.x + low.width / 2 + (high.x + high.width / 2 - (low.x + low.width / 2)) * t;
}

/** The same white-key ruler `fingering.ts` counts with. */
function whiteIndexOfKey(midi: number): number {
  const WHITES_BELOW_C = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const octave = Math.floor(midi / 12);
  const step = ((midi % 12) + 12) % 12;
  return octave * 7 + (WHITES_BELOW_C[step] ?? 0);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Everything one hand needs from the keyboard and the music. */
interface HandSetting {
  readonly targets: readonly FingerTarget[];
  readonly unit: number;
  readonly centreY: number;
  readonly side: -1 | 1;
}

/**
 * What each finger is being asked to do: its own key if it is playing,
 * and the key the hand is sitting over if it is not.
 */
function settingFor(hand: Hand, options: HandsOptions): HandSetting | undefined {
  const keys = keyboardGeometry(options.size, options.board);
  const whites = whiteKeys(keys);
  const firstWhite = whites[0];
  if (firstWhite === undefined) return undefined;

  const anchorWhite = anchorAt(options.anchors[hand], options.seconds);
  if (anchorWhite === undefined) return undefined;
  const offset = whiteIndexOfKey(firstWhite.midi);

  const board = options.board;
  const unit = firstWhite.width * (options.scale ?? 1);
  const down = fingersDownAt(options.notes, hand, options.seconds);
  const byMidi = new Map(keys.map((key) => [key.midi, key]));

  const targets: FingerTarget[] = [];
  for (const finger of ALL_FINGERS) {
    const held = down.get(finger);
    const key = held === undefined ? undefined : byMidi.get(held);
    if (key !== undefined) {
      targets.push({
        finger,
        x: key.x + key.width / 2,
        playing: true,
        midi: held as number,
        onBlack: key.black,
        // A black key is shorter and set further back: a finger on one
        // has to be ON it, not out in front of where it ends.
        ...(key.black ? { depth: board.y + board.height * BLACK_TIP_DEPTH } : {}),
      });
      continue;
    }
    const resting = hand === 'right' ? anchorWhite + (finger - 1) : anchorWhite - (finger - 1);
    const x = xAtWhite(whites, resting - offset);
    if (x === undefined) continue;
    targets.push({ finger, x, playing: false });
  }
  if (targets.length === 0) return undefined;

  return {
    targets,
    unit,
    // A player's hand rests a fixed distance in from the front edge of
    // the keys. The keys being long or short behind it changes nothing.
    centreY: board.y + board.height - unit * KNUCKLE_FROM_FRONT,
    side: hand === 'right' ? -1 : 1,
  };
}

function posedFor(hand: Hand, options: HandsOptions): readonly PosedFinger[] {
  const setting = settingFor(hand, options);
  if (setting === undefined) return [];
  const pose = solvePose(setting.targets, setting.side, setting.unit, setting.centreY);
  return poseFingers(pose, setting.targets);
}

/**
 * Where each finger of one hand is at this moment.
 *
 * The same answer `handShapes` draws from, offered on its own so that
 * a caller -- or a test -- can ask where a finger IS without reading
 * it back out of a path string. Nothing in the drawing is the source
 * of truth about the hand; the pose is.
 */
export function handFingertips(hand: Hand, options: HandsOptions): readonly Fingertip[] {
  return posedFor(hand, options).map((finger) => ({
    finger: finger.finger,
    x: finger.tip.x,
    y: finger.tip.y,
    pressed: finger.playing,
    onBlack: finger.onBlack ?? false,
    ...(finger.midi !== undefined ? { midi: finger.midi } : {}),
  }));
}

/**
 * One hand, as shapes in paint order.
 *
 * Returns nothing at all when the hand has no notes in the piece --
 * drawing a hand for a part that does not exist would be inventing a
 * player.
 */
export function handShapes(hand: Hand, options: HandsOptions): readonly StageShape[] {
  const setting = settingFor(hand, options);
  if (setting === undefined) return [];
  const pose = solvePose(setting.targets, setting.side, setting.unit, setting.centreY);
  const fingers = poseFingers(pose, setting.targets);
  if (fingers.length === 0) return [];

  const drawing = drawHand(pose, fingers);
  if (drawing.outline === '') return [];

  const colors = options.colors[hand];
  const unit = setting.unit;
  const grow = unit * 0.07;
  const shapes: StageShape[] = [];

  // The hand is painted in two passes: every part in the edge colour
  // and a little fatter, then every part in skin at its true size.
  // What shows of the first pass is the outline of the two together,
  // and nothing else -- so the thumb can overlap the palm without a
  // seam where it meets it.
  const pass = (fill: string, extra: number): void => {
    shapes.push({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill,
      ...(extra > 0 ? { stroke: fill, strokeWidth: round(extra * 2) } : {}),
      path: drawing.outline,
    });
    if (drawing.thumb !== undefined) {
      shapes.push({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: 'none',
        stroke: fill,
        strokeWidth: round(drawing.thumb.width + extra * 2),
        path: drawing.thumb.path,
      });
    }
  };
  pass(colors.edge, grow);
  pass(colors.skin, 0);

  // The creases: what separates two fingers below the point where the
  // gap between them closes. A hand is webbed, and what tells its
  // fingers apart lower down is a line, not a hole.
  for (const crease of drawing.creases) {
    shapes.push({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill: 'none',
      stroke: darken(colors.skin, 0.2),
      strokeWidth: round(unit * 0.045),
      path: crease,
    });
  }

  // And a nail on each fingertip, which is the one detail nobody
  // notices until it is missing.
  for (const nail of drawing.nails) {
    shapes.push({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill: darken(colors.skin, 0.1),
      path: nail.path,
    });
  }

  // The finger's number on the key it is playing.
  //
  // Last of everything, and up at the fingertip rather than down at the
  // key's front, because the front of the keyboard is where the palm
  // is. A number under the hand is a number nobody reads.
  if (options.fingerNumbers !== false) {
    for (const finger of fingers) {
      if (!finger.playing) continue;
      const badge = unit * 0.34;
      shapes.push({
        x: round(finger.tip.x - badge),
        y: round(finger.tip.y + unit * 0.95 - badge),
        width: round(badge * 2),
        height: round(badge * 2),
        fill: colors.tip,
        stroke: colors.edge,
        strokeWidth: round(unit * 0.07),
        radius: round(badge),
        label: String(finger.finger),
        labelSize: round(badge * 1.35),
        labelColor: colors.edge,
      });
    }
  }

  return shapes;
}

/** Both hands, left first so the right draws over it where they meet. */
export function handsShapes(options: HandsOptions): readonly StageShape[] {
  return [...handShapes('left', options), ...handShapes('right', options)];
}

/** How far past the front edge of the keys a hand's heel reaches. */
export const HAND_REACH_PAST_KEYS = PALM_LENGTH - KNUCKLE_FROM_FRONT;
