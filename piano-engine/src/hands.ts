/**
 * hands.ts — two hands on the keys.
 *
 * Both hands are on the keyboard the whole time, the way a player's
 * are: the one that is not playing does not leave, it waits over the
 * keys it last used. Fingers press one at a time, each onto its own
 * key, and the hand slides along the board when the music asks it to.
 *
 * Drawn as PATHS rather than as rectangles, which is the one thing
 * this engine could not do before. A finger is a tapered, rounded
 * stroke and a palm is a soft shape; both come out of the same
 * description the SVG preview and the video canvas already share, so
 * the picture on the page and the picture in the file stay one
 * drawing. (A `Path2D` is what the canvas takes, and it parses the
 * same `d` the SVG does.)
 *
 *
 * WHAT MAKES IT READ AS A HAND
 *
 * Three things, none of them detail:
 *
 *  - the fingers are not the same length. Middle is longest, thumb
 *    shortest and lowest on the hand, and the little finger is short
 *    AND set back. A row of five equal bars reads as a comb.
 *  - a pressed finger goes DOWN and the others do not. That is the
 *    whole of the animation, and without it the hand is a sticker.
 *  - the hand leans. The thumb side sits lower and further forward
 *    than the little-finger side, which is what makes a left hand look
 *    like a left hand rather than a mirrored right one.
 */

import { darken } from './color.js';
import { keyboardGeometry } from './keyboard.js';
import { anchorAt, fingersDownAt, FINGERS } from './fingering.js';
import type { Finger, FingeredNote, HandAnchor } from './fingering.js';
import type { Hand, KeyboardSize, PianoKey, StageShape } from './types.js';

/**
 * Each finger's length and its set-back, as fractions of the hand's
 * own size. Index 0 is the thumb.
 *
 * `reach` is how far down the key the fingertip sits; `back` is how far
 * the knuckle is from the palm's front edge. The numbers are a hand's
 * real proportions rounded to something a drawing can use: the middle
 * finger is longest, the thumb is much shorter and comes off the side
 * rather than the front.
 */
const FINGER_SHAPE: readonly { reach: number; back: number; width: number }[] = [
  { reach: 0.62, back: 0.5, width: 1.15 }, // thumb -- short, thick, low
  { reach: 0.92, back: 0.08, width: 0.95 }, // index
  { reach: 1.0, back: 0.0, width: 0.95 }, // middle -- the longest
  { reach: 0.94, back: 0.06, width: 0.9 }, // ring
  { reach: 0.78, back: 0.22, width: 0.8 }, // little -- short and set back
];

/** How far a pressed fingertip drops, as a fraction of the white key's height. */
const PRESS_DROP = 0.1;

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
}

/** Where one finger ends up, in the keyboard's own coordinates. */
interface Fingertip {
  readonly finger: Finger;
  readonly x: number;
  readonly y: number;
  readonly pressed: boolean;
  readonly onBlack: boolean;
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

/**
 * Where every finger of one hand is at this moment.
 *
 * A finger that is playing goes to its OWN key, wherever that is; the
 * rest sit where the hand's position puts them. That is the difference
 * between a hand resting on the keys and a hand reaching for a chord,
 * and it comes out of the fingering rather than being posed.
 */
function fingertips(
  hand: Hand,
  options: HandsOptions,
  keys: readonly PianoKey[],
  whites: readonly PianoKey[],
): readonly Fingertip[] {
  const path = options.anchors[hand];
  const anchorWhite = anchorAt(path, options.seconds);
  if (anchorWhite === undefined) return [];

  // `anchorAt` counts in absolute white keys; the drawing counts from
  // this keyboard's own first white key.
  const firstWhite = whites[0];
  if (firstWhite === undefined) return [];
  const offset = whiteIndexOfKey(firstWhite.midi);

  const down = fingersDownAt(options.notes, hand, options.seconds);
  const byMidi = new Map(keys.map((key) => [key.midi, key]));
  const board = options.board;

  const tips: Fingertip[] = [];
  for (const finger of FINGERS) {
    const held = down.get(finger);
    const shape = FINGER_SHAPE[finger - 1];
    if (shape === undefined) continue;

    let x: number | undefined;
    let onBlack = false;
    if (held !== undefined) {
      const key = byMidi.get(held);
      if (key !== undefined) {
        x = key.x + key.width / 2;
        onBlack = key.black;
      }
    }
    if (x === undefined) {
      const resting = hand === 'right' ? anchorWhite + (finger - 1) : anchorWhite - (finger - 1);
      x = xAtWhite(whites, resting - offset);
    }
    if (x === undefined) continue;

    // Down the key: a black key is shorter and further back, so a
    // finger on one stops higher up the board than one on a white.
    const depth = onBlack ? 0.42 : 0.66;
    const y =
      board.y +
      board.height * depth * shape.reach +
      (held !== undefined ? board.height * PRESS_DROP : 0);
    tips.push({ finger, x, y, pressed: held !== undefined, onBlack });
  }
  return tips;
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

/**
 * One finger, from its knuckle to its tip.
 *
 * Drawn as a stroked path rather than a filled outline: a stroke with a
 * round cap IS a finger shape -- a rounded bar that narrows where it is
 * told to -- and it costs one path instead of eight curves.
 */
function fingerPath(fromX: number, fromY: number, toX: number, toY: number): string {
  // A slight bow, so the finger curves towards the key instead of
  // spearing it. The control point leans along the finger's own
  // direction, which is what makes a reaching finger look reached.
  const midX = (fromX + toX) / 2 + (toX - fromX) * 0.08;
  const midY = (fromY + toY) / 2 - Math.abs(toY - fromY) * 0.12;
  return `M ${round(fromX)} ${round(fromY)} Q ${round(midX)} ${round(midY)} ${round(toX)} ${round(toY)}`;
}

/**
 * One hand, as shapes in paint order.
 *
 * Returns nothing at all when the hand has no notes in the piece --
 * drawing a hand for a part that does not exist would be inventing a
 * player.
 */
export function handShapes(hand: Hand, options: HandsOptions): readonly StageShape[] {
  const keys = keyboardGeometry(options.size, options.board);
  const whites = whiteKeys(keys);
  const tips = fingertips(hand, options, keys, whites);
  if (tips.length === 0) return [];

  const scale = options.scale ?? 1;
  const colors = options.colors[hand];
  const board = options.board;
  const whiteWidth = whites[0]?.width ?? board.width / 52;
  const unit = whiteWidth * scale;

  // The palm sits behind the fingers, over the back of the keys, and
  // leans: the thumb side forward, the little-finger side back.
  const xs = tips.map((t) => t.x);
  const thumb = tips.find((t) => t.finger === 1);
  const little = tips.find((t) => t.finger === 5);
  const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const palmY = board.y - unit * 0.15;
  // The palm grows with the fingers but only so far: a hand stretching
  // two octaves does not get a two-octave palm, it keeps the same palm
  // and spreads its fingers. Letting the palm follow the span is what
  // turns a wide chord into a slab.
  const spread = Math.abs(Math.max(...xs) - Math.min(...xs));
  const palmWidth = Math.min(unit * 4.8, Math.max(unit * 3.4, spread * 0.92));
  const palmHeight = unit * 1.5;
  const lean = thumb !== undefined && little !== undefined ? (thumb.x - little.x) * 0.06 : 0;

  const shapes: StageShape[] = [];

  // The forearm first, running back off the top of the keyboard, so
  // the hand is attached to someone. Narrower than the palm and long
  // enough to read as an arm: a short wide stub behind a hand looks
  // like a head rather than a wrist.
  shapes.push({
    x: round(centreX + lean - unit * 0.78),
    y: round(palmY - unit * 2.9),
    width: round(unit * 1.56),
    height: round(unit * 3.4),
    fill: colors.skin,
    stroke: colors.edge,
    strokeWidth: round(unit * 0.06),
    radius: round(unit * 0.6),
  });

  // Then each finger, as a stroke from the knuckle to the tip.
  for (const tip of tips) {
    const shape = FINGER_SHAPE[tip.finger - 1];
    if (shape === undefined) continue;
    // The knuckles sit nearly as wide apart as the tips: fingers on
    // five keys are near enough parallel, and compressing the knuckles
    // towards the middle turns a hand into a fan.
    // The knuckles sit nearly as wide apart as the tips, but never
    // outside the palm they belong to: fingers on five keys are near
    // enough parallel, and a stretched hand fans out from the palm's
    // own edge rather than growing a wider one.
    const reachX = (tip.x - centreX) * 0.78;
    const limit = palmWidth * 0.42;
    const knuckleX =
      centreX +
      lean +
      Math.max(-limit, Math.min(limit, reachX)) +
      (tip.finger === 1 ? -lean * 2 : 0);
    const knuckleY = palmY + palmHeight * (0.22 + shape.back * 0.5);
    const d = fingerPath(knuckleX, knuckleY, tip.x, tip.y);
    const thickness = unit * 0.46 * shape.width;
    // The edge first and a touch wider, so what shows of it is an
    // outline. Per finger rather than all edges then all skins: that
    // way the finger drawn later covers the one beside it, which is
    // what tells five fingers apart instead of one webbed paddle.
    shapes.push({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill: 'none',
      stroke: colors.edge,
      strokeWidth: round(thickness + unit * 0.11),
      path: d,
    });
    shapes.push({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill: 'none',
      stroke: colors.skin,
      strokeWidth: round(thickness),
      path: d,
    });
  }

  // The palm over the knuckles, so the fingers come out from under it.
  shapes.push({
    x: round(centreX + lean - palmWidth / 2),
    y: round(palmY),
    width: round(palmWidth),
    height: round(palmHeight),
    fill: colors.skin,
    stroke: colors.edge,
    strokeWidth: round(unit * 0.06),
    radius: round(palmHeight * 0.42),
  });

  // And a dot on each fingertip that is pressing, which is the thing a
  // viewer is actually following.
  for (const tip of tips) {
    if (!tip.pressed) continue;
    // Wider than the finger it caps, or the finger's own round end
    // swallows it and nothing shows that this is the one playing.
    //
    // DARK, not the note's own colour: the key under a pressed finger
    // is lit in that colour, so an amber dot on an amber key is
    // camouflage. The dark edge of the same colour reads on the lit
    // key AND on the white one next to it, and the pale ring keeps it
    // off the finger it sits on.
    const r = unit * 0.3;
    shapes.push({
      x: round(tip.x - r),
      y: round(tip.y - r),
      width: round(r * 2),
      height: round(r * 2),
      fill: colors.edge,
      stroke: colors.skin,
      strokeWidth: round(unit * 0.07),
      radius: round(r),
    });
  }

  return shapes;
}

/** Both hands, left first so the right draws over it where they meet. */
export function handsShapes(options: HandsOptions): readonly StageShape[] {
  return [...handShapes('left', options), ...handShapes('right', options)];
}
