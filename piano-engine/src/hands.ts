/**
 * hands.ts — two hands on the keys.
 *
 * This file is the BRIDGE and nothing else: it turns a keyboard and a
 * fingering into the targets `hand/place.ts` fits, and turns what
 * `hand/draw.ts` gives back into the stage's own shapes. The hand
 * itself lives in `hand/`:
 *
 *   hand/artwork.ts  the owner's own drawing, in white keys
 *   hand/place.ts    where it goes to play what it is playing
 *   hand/draw.ts     that drawing, moved there
 *
 * None of those three knows about keyboards, notes, seconds or SVG,
 * and none of them can be wrong about a hand in a way a keyboard could
 * fix. That is the whole reason they are separate.
 *
 *
 * THE HAND IS DRAWN, NOT ASSEMBLED
 *
 * It used to be built here out of five posed fingers, and it looked
 * built. It is now one outline the owner drew, and the engine's job is
 * the part a program can do well: deciding where that outline goes.
 *
 * It MOVES, TURNS and OPENS to play. A hand asked for a key its thumb
 * cannot reach does not grow a thumb -- it shifts along the keys,
 * tilts, and spreads, and the other four fingers go with it, because a
 * hand is one object.
 *
 * Both hands are on the keyboard the whole time, the way a player's
 * are: the one that is not playing does not leave, it waits over the
 * keys it last used.
 */

import { darken } from './color.js';
import { keyboardGeometry } from './keyboard.js';
import { ALL_FINGERS, anchorAt, fingersDownAt } from './fingering.js';
import type { Finger, FingeredNote, HandAnchor } from './fingering.js';
import type { Hand, KeyboardSize, PianoKey, StageShape } from './types.js';
import { ARTWORK_TIPS, HAND_LENGTH } from './hand/artwork.js';
import { placeHand, placedTip, transformPoint } from './hand/place.js';
import type { FingerTarget, HandPlacement } from './hand/place.js';
import { handPath } from './hand/draw.js';

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

/**
 * How far inside the keyboard's front edge every fingertip must stay,
 * in white keys.
 *
 * The drawing holds its thumb low and out to the side -- a flat hand's
 * thumb, not a playing one's -- so it is the finger that falls off the
 * front of the keys first, and this is what stops it. The hand draws
 * itself back until the thumb is on the keyboard, exactly as it does
 * for a black key, and for the same reason: a fingertip pressing the
 * air in front of the keys is not playing anything.
 */
const TIP_INSIDE_FRONT = 0.3;

/**
 * How far in FRONT of the keys the wrist sits, in white keys.
 *
 * A hand at a keyboard does not have its wrist on the keys. Its
 * fingertips rest about 40mm up a white key and its wrist is about
 * 105mm forward of them, which is 65mm -- near enough three key widths
 * -- out over the key slip.
 *
 * 1.5 rather than 3 because `PLAY_SCALE_Y` has already foreshortened
 * the drawing, and because the number that has to come out right is
 * where the fingertips land: the long fingers at about a third of the
 * way up a white key, and the THUMB, which this drawing holds low and
 * out to the side, still on the key rather than off the front of it.
 */
const WRIST_IN_FRONT = 1.5;

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
  /** The keyboard's own top edge, so a badge cannot be pushed off it. */
  readonly boardTop: number;
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
        // has to be ON it, not out in front of where it ends. A white
        // key only has to keep its finger on the keyboard at all.
        depth: key.black
          ? board.y + board.height * BLACK_TIP_DEPTH
          : board.y + board.height - unit * TIP_INSIDE_FRONT,
      });
      continue;
    }
    const resting = hand === 'right' ? anchorWhite + (finger - 1) : anchorWhite - (finger - 1);
    const x = xAtWhite(whites, resting - offset);
    if (x === undefined) continue;
    targets.push({
      finger,
      x,
      playing: false,
      depth: board.y + board.height - unit * TIP_INSIDE_FRONT,
    });
  }
  if (targets.length === 0) return undefined;

  return {
    targets,
    unit,
    // Where the WRIST sits.
    //
    // NOT at the front edge of the keys, which is where this first put
    // it and which is wrong by about 65mm: a player's fingertips rest
    // roughly 40mm up a white key and their wrist is about 105mm
    // forward of those fingertips, so the wrist is out IN FRONT of the
    // keyboard, over the key slip. `WRIST_IN_FRONT` is that gap, and
    // it is what puts the fingertips on the front third of the keys
    // instead of up among the black ones.
    centreY: board.y + board.height + unit * WRIST_IN_FRONT,
    side: hand === 'right' ? -1 : 1,
    boardTop: board.y,
  };
}

function placementFor(
  hand: Hand,
  options: HandsOptions,
): { readonly placement: HandPlacement; readonly setting: HandSetting } | undefined {
  const setting = settingFor(hand, options);
  if (setting === undefined) return undefined;
  return {
    placement: placeHand(setting.targets, setting.side, setting.unit, setting.centreY),
    setting,
  };
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
  const placed = placementFor(hand, options);
  if (placed === undefined) return [];
  return placed.setting.targets.map((target) => {
    const tip = placedTip(placed.placement, target.finger);
    return {
      finger: target.finger,
      x: tip.x,
      y: tip.y,
      pressed: target.playing,
      onBlack: target.onBlack ?? false,
      ...(target.midi !== undefined ? { midi: target.midi } : {}),
    };
  });
}

/**
 * One hand, as shapes in paint order.
 *
 * Returns nothing at all when the hand has no notes in the piece --
 * drawing a hand for a part that does not exist would be inventing a
 * player.
 */
export function handShapes(hand: Hand, options: HandsOptions): readonly StageShape[] {
  const placed = placementFor(hand, options);
  if (placed === undefined) return [];
  const { placement, setting } = placed;

  const colors = options.colors[hand];
  const unit = setting.unit;
  const shapes: StageShape[] = [];

  // The hand itself: one path, filled in skin and outlined in the
  // hand's own colour so the left and the right read apart at a glance
  // without being two different people's hands.
  shapes.push({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fill: colors.skin,
    stroke: colors.edge,
    strokeWidth: round(unit * 0.09),
    path: handPath(placement),
  });

  // The knuckle creases. The drawing has none -- it is a silhouette --
  // and a silhouette on a keyboard reads as a glove. Three short marks
  // at the BASE of the long fingers, where a hand creases when it
  // curls, is the least that says "there are joints here". They are
  // struck from the artwork's own fingertip positions rather than
  // invented, so they move with the hand's spread and turn exactly as
  // the fingers do.
  for (const finger of [2, 3, 4] as const) {
    const tip = ARTWORK_TIPS[finger];
    const from = transformPoint(placement, tip.x * 0.74, tip.y * 0.52);
    const to = transformPoint(placement, tip.x * 0.74, tip.y * 0.42);
    shapes.push({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill: 'none',
      stroke: darken(colors.skin, 0.13),
      strokeWidth: round(unit * 0.045),
      path: `M ${round(from.x)} ${round(from.y)} L ${round(to.x)} ${round(to.y)}`,
    });
  }

  // The finger doing the work. A silhouette cannot press a key, so the
  // pressing fingertip is marked instead -- in the hand's own note
  // colour, which is the colour of the bar that fell onto that key.
  for (const target of setting.targets) {
    if (!target.playing) continue;
    const tip = placedTip(placement, target.finger);
    const r = unit * 0.3;
    shapes.push({
      x: round(tip.x - r),
      y: round(tip.y - r),
      width: round(r * 2),
      height: round(r * 2),
      fill: colors.tip,
      radius: round(r),
    });
  }

  // The finger's number on the key it is playing.
  //
  // Last of everything, and up at the fingertip rather than down at the
  // key's front, because the front of the keyboard is where the palm
  // is. A number under the hand is a number nobody reads.
  if (options.fingerNumbers !== false) {
    for (const target of setting.targets) {
      if (!target.playing) continue;
      const tip = placedTip(placement, target.finger);
      const badge = unit * 0.34;
      shapes.push({
        x: round(tip.x - badge),
        // Above the fingertip, where the hand is not -- but never off
        // the back of the keyboard, which is where a finger playing a
        // key near the top would otherwise push it.
        y: round(Math.max(setting.boardTop + badge * 0.2, tip.y - unit * 1.05 - badge)),
        width: round(badge * 2),
        height: round(badge * 2),
        fill: colors.tip,
        stroke: colors.edge,
        strokeWidth: round(unit * 0.07),
        radius: round(badge),
        label: String(target.finger),
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

/**
 * The strip the stage keeps in FRONT of the keys for the hands, in
 * white keys: the wrist, which sits out there, plus enough forearm
 * behind it that the hand is not cut off at the wrist. The rest of the
 * arm runs off the bottom of the frame, which is where an arm comes
 * from.
 */
export const HAND_REACH_PAST_KEYS = WRIST_IN_FRONT + 0.6;

/** How far UP the keys a hand covers, wrist to fingertip, in white keys. */
export const HAND_REACH_UP_KEYS = HAND_LENGTH;
