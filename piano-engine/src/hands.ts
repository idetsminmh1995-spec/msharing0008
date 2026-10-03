/**
 * hands.ts — two hands on the keys.
 *
 * Both hands are on the keyboard the whole time, the way a player's
 * are: the one that is not playing does not leave, it waits over the
 * keys it last used. Fingers press one at a time, each onto its own
 * key, and the hand slides along the board when the music asks it to.
 *
 *
 * WHICH WAY ROUND A HAND GOES
 *
 * The player sits at the FRONT of the keys, which in this picture is
 * the bottom of the frame. So the hands come up from the bottom: the
 * heel of the palm is nearest the viewer, the fingers point away, up
 * the keys, and a finger reaching a black key reaches FURTHER up than
 * one on a white. Drawing it the other way round -- an arm coming down
 * out of the sky with fingers pointing at the viewer -- is the single
 * thing that stops a drawn hand reading as a hand.
 *
 *
 * ONE SILHOUETTE, NOT SEVEN PARTS
 *
 * A hand is drawn twice: once in the edge colour, every part a little
 * fatter, and then again in the skin colour at its true size. The
 * parts overlap, so the first pass shows only where nothing covers it
 * -- which is exactly the outline of the whole hand. There is no line
 * between the palm and a finger, or between two fingers that touch,
 * because there is nothing there to draw a line with. Outlining each
 * part separately is what made the first attempt look like a rake.
 *
 *
 * WHAT MAKES IT READ AS A HAND
 *
 * Three things, none of them detail:
 *
 *  - the fingers are not the same length. Middle is longest, thumb
 *    shortest and off the SIDE of the palm rather than the front, and
 *    the little finger is short AND set back. A row of five equal bars
 *    reads as a comb.
 *  - a finger that is playing reaches its own key and the others stay
 *    curled over theirs. That is the whole of the animation, and
 *    without it the hand is a sticker.
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
 * A hand's proportions, in white-key widths.
 *
 * Measured, not chosen. A white key is 23mm wide, so everything a hand
 * does on a keyboard can be stated in those: a palm is about three and
 * a third keys across and three deep as seen from above, and a curled
 * middle finger reaches two. That is why a hand covers five white keys
 * -- not because five is a convenient number, but because a hand is
 * 90mm wide.
 *
 * Driving the drawing from these rather than from the box it is in is
 * what keeps a hand a hand when the keyboard has to be drawn deeper or
 * shallower than a real one.
 */
const PALM_WIDTH = 3.3;
const PALM_LENGTH = 3.0;
const FINGER_LENGTH = 2.35;
const FINGER_THICK = 0.64;

/**
 * Where a resting middle fingertip sits, down the key.
 *
 * A fraction of the keyboard's DEPTH, because that is a fact about
 * keys rather than about hands: a player's fingers sit up among the
 * black keys, not out at the front edge, so that the black ones are
 * there to be reached without moving the hand.
 */
const TIP_DEPTH = 0.29;

/**
 * The furthest forward a finger on a BLACK key may be, down the key.
 *
 * A ceiling rather than a target: a black key ENDS part way down the
 * board, so a finger on one cannot be out in front of it. For the four
 * long fingers this never binds -- their natural reach is already up
 * among the black keys, which is why a player leaves them there. It is
 * the thumb, which plays out at the front, that has to come back for a
 * black key, and the hand with it.
 */
const BLACK_TIP_DEPTH = 0.45;

/**
 * How far a finger may be stretched past its own length before the
 * HAND moves instead.
 *
 * A finger reaching a black key does stretch -- but only so far, and
 * then the player moves their whole hand back rather than growing a
 * finger. Without this the one rule "a black key is played up there"
 * turns a thumb into a tentacle on a deep keyboard.
 */
const MAX_STRETCH = 1.3;

/**
 * Each finger's length, where it comes off the palm, and how thick it
 * is -- all as fractions of the middle finger's. Index 0 is the thumb.
 *
 * `drop` is how far below the knuckle line a finger starts, in half
 * white keys: it is what sets the thumb off the SIDE of the hand,
 * well down towards the heel, rather than off the front with the rest.
 */
const FINGER_SHAPE: readonly { reach: number; drop: number; width: number }[] = [
  { reach: 0.9, drop: 1.6, width: 1.42 }, // thumb -- short, thick, low, off the side
  { reach: 0.93, drop: 0.1, width: 1.0 }, // index
  { reach: 1.0, drop: 0.0, width: 1.0 }, // middle -- the longest
  { reach: 0.94, drop: 0.08, width: 0.96 }, // ring
  { reach: 0.72, drop: 0.4, width: 0.86 }, // little -- short and set back
];

/** How much a finger that is not playing curls back off its key. */
const CURL = 0.07;

/** And how far one that IS playing straightens past its easy reach. */
const REACH = 0.03;

/** How far the outline bleeds out from under the skin. */
const OUTLINE = 0.08;

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
  /**
   * The stretch of keyboard actually drawn, when it is not the whole
   * instrument.
   *
   * The hands design shows a window of the keyboard in a narrow frame,
   * and a hand has to be laid out on THE KEYS THAT ARE THERE -- given
   * the full 88 while the stage drew two octaves, every finger would
   * be on the wrong key by a third of the keyboard.
   */
  readonly range?: { readonly first: number; readonly last: number };
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
interface Fingertip {
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

/** Everything one hand's drawing is measured from. */
interface HandFrame {
  readonly unit: number;
  readonly knuckleY: number;
  readonly centreX: number;
  readonly lean: number;
  readonly palmWidth: number;
  /** -1 if the thumb is on the left of this hand, +1 if on the right. */
  readonly thumbSide: -1 | 1;
}

/**
 * Where every finger of one hand is at this moment.
 *
 * A finger that is playing goes to its OWN key, at the depth that key
 * is played at; the rest stay curled over where the hand is sitting.
 * That is the difference between a hand resting on the keys and a hand
 * reaching for a chord, and it comes out of the fingering rather than
 * being posed.
 */
function fingertips(
  hand: Hand,
  options: HandsOptions,
  keys: readonly PianoKey[],
  whites: readonly PianoKey[],
  frame: HandFrame,
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

    // How far up the key the tip goes.
    //
    // Its OWN length decides it, not the key: that is what staggers the
    // five tips the way a hand's are, and why the thumb plays near the
    // front of the keys and the middle finger further back. A finger
    // that is not playing curls a little short of its reach, and one
    // that is playing straightens past it, so pressing always moves a
    // finger AWAY from the player rather than back towards them.
    //
    // A black key is the one thing that overrides the hand: it is
    // shorter and set back, so a finger on one has to reach at least
    // that far. How much of that reach is the finger's and how much is
    // the whole hand moving back is settled by `blackKeyShift`.
    const length = frame.unit * FINGER_LENGTH * shape.reach;
    const from = frame.knuckleY + frame.unit * shape.drop * 0.5;
    const resting = from - length * (1 - CURL);
    const reaching = from - length * (1 + REACH);
    const y =
      held === undefined
        ? resting
        : onBlack
          ? Math.min(reaching, board.y + board.height * BLACK_TIP_DEPTH)
          : reaching;

    tips.push({
      finger,
      x,
      y,
      pressed: held !== undefined,
      onBlack,
      ...(held !== undefined ? { midi: held } : {}),
    });
  }
  return tips;
}

/**
 * How far back the whole hand has to move for its black keys.
 *
 * A finger reaching a black key stretches, but a finger can only
 * stretch so far; past that a player moves their hand instead. This
 * asks every finger that is playing a black key how much more than its
 * own stretch it would need, and gives the hand the largest answer --
 * so one finger on a black key takes the other four with it, which is
 * what a hand does and what keeps the five of them a hand.
 */
function blackKeyShift(
  hand: Hand,
  options: HandsOptions,
  keys: readonly PianoKey[],
  whites: readonly PianoKey[],
  frame: HandFrame,
): number {
  const board = options.board;
  const black = new Set(keys.filter((key) => key.black).map((key) => key.midi));
  const down = fingersDownAt(options.notes, hand, options.seconds);
  let shift = 0;
  for (const [finger, midi] of down) {
    if (!black.has(midi)) continue;
    const shape = FINGER_SHAPE[finger - 1];
    if (shape === undefined) continue;
    const length = frame.unit * FINGER_LENGTH * shape.reach;
    const from = frame.knuckleY + frame.unit * shape.drop * 0.5;
    const target = board.y + board.height * BLACK_TIP_DEPTH;
    shift = Math.max(shift, from - target - length * MAX_STRETCH);
  }
  // Never so far back that the hand leaves the keyboard: a hand that
  // has run out of key has run out of key.
  void whites;
  return Math.max(0, Math.min(shift, board.height * 0.22));
}

/**
 * One finger, from its knuckle to its tip.
 *
 * Drawn as a stroked path rather than as a filled outline: a stroke
 * with a round cap IS a finger shape -- a rounded bar -- and it costs
 * one path instead of eight curves. The bow leans along the finger's
 * own direction, so a finger reaching sideways for a key looks reached
 * rather than snapped.
 */
function fingerPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const midX = (fromX + toX) / 2 + (toX - fromX) * 0.06;
  const midY = (fromY + toY) / 2 + Math.abs(toY - fromY) * 0.1;
  return `M ${round(fromX)} ${round(fromY)} Q ${round(midX)} ${round(midY)} ${round(toX)} ${round(toY)}`;
}

/** One part of a hand, before it is given a colour. */
type Limb =
  | { readonly box: { x: number; y: number; width: number; height: number; radius: number } }
  | { readonly stroke: { d: string; width: number } };

/**
 * The same parts twice: fat and dark underneath, true size and skin on
 * top. What shows of the dark pass is the silhouette's outline, and
 * only that -- which is why the hand has no seams in it.
 */
function paint(limbs: readonly Limb[], fill: string, grow: number): StageShape[] {
  const out: StageShape[] = [];
  for (const limb of limbs) {
    if ('box' in limb) {
      out.push({
        x: round(limb.box.x - grow),
        y: round(limb.box.y - grow),
        width: round(limb.box.width + grow * 2),
        height: round(limb.box.height + grow * 2),
        fill,
        radius: round(limb.box.radius + grow),
      });
    } else {
      out.push({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: 'none',
        stroke: fill,
        strokeWidth: round(limb.stroke.width + grow * 2),
        path: limb.stroke.d,
      });
    }
  }
  return out;
}

/**
 * One hand, as shapes in paint order.
 *
 * Returns nothing at all when the hand has no notes in the piece --
 * drawing a hand for a part that does not exist would be inventing a
 * player.
 */
export function handShapes(hand: Hand, options: HandsOptions): readonly StageShape[] {
  const keys = keyboardGeometry(options.range ?? options.size, options.board);
  const whites = whiteKeys(keys);
  if (whites.length === 0) return [];

  const board = options.board;
  const scale = options.scale ?? 1;
  const colors = options.colors[hand];
  const unit = (whites[0]?.width ?? board.width / 52) * scale;

  // Where the knuckles sit.
  //
  // Measured back from the FINGERTIPS, not forward from the top of the
  // keys: a resting middle finger lies among the black keys, and the
  // knuckles are one finger-length behind that. Taking it the other way
  // round -- knuckles at some fraction of the keyboard -- is what made
  // the hand stretch out of shape when the keyboard was drawn deep.
  const naturalKnuckle = board.y + board.height * TIP_DEPTH + unit * FINGER_LENGTH * (1 - CURL);

  const rough: HandFrame = {
    unit,
    knuckleY: naturalKnuckle,
    centreX: board.x + board.width / 2,
    lean: 0,
    palmWidth: unit * PALM_WIDTH,
    thumbSide: hand === 'right' ? -1 : 1,
  };
  // A hand reaching a black key moves BACK rather than growing the
  // finger past what a finger can do. Worked out from the rough pose
  // and then applied to the real one, so every finger moves together --
  // a hand is one object.
  const shift = blackKeyShift(hand, options, keys, whites, rough);
  const knuckleY = naturalKnuckle - shift;

  const tips = fingertips(hand, options, keys, whites, { ...rough, knuckleY });
  if (tips.length === 0) return [];

  // The palm sits behind the FOUR fingers, not behind all five: a thumb
  // is attached to the side of a hand, not to the front of it. Centring
  // on all five drags the palm a half key towards the thumb and leaves
  // the little finger reaching back across the hand for its own key.
  const fourX = tips.filter((t) => t.finger !== 1).map((t) => t.x);
  const xs = fourX.length > 0 ? fourX : tips.map((t) => t.x);
  const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const thumb = tips.find((t) => t.finger === 1);
  const little = tips.find((t) => t.finger === 5);
  // The hand leans towards its thumb, which is what tells a left hand
  // from a right one at a glance.
  const lean = thumb !== undefined && little !== undefined ? (thumb.x - little.x) * 0.05 : 0;
  // The palm widens with the fingers but only so far: a hand stretching
  // two octaves does not get a two-octave palm, it keeps the same palm
  // and spreads its fingers.
  const spread = Math.abs(Math.max(...xs) - Math.min(...xs));
  const palmWidth = Math.min(unit * (PALM_WIDTH + 0.7), Math.max(unit * PALM_WIDTH, spread * 0.98));

  // The palm's top edge sits just behind the knuckles, not well behind
  // them: every bit of palm drawn past the knuckle line is a bit of
  // finger swallowed, and a hand whose fingers are shorter than its
  // palm is wide reads as a mitten.
  const palmTop = knuckleY - unit * 0.3;
  const palmHeight = unit * PALM_LENGTH;
  const limbs: Limb[] = [];

  // The fingers first, so the palm covers where they come out of it.
  for (const tip of tips) {
    const shape = FINGER_SHAPE[tip.finger - 1];
    if (shape === undefined) continue;
    const isThumb = tip.finger === 1;
    // A thumb comes off the SIDE of the palm, low down; the other four
    // come off the knuckle line, spaced across it.
    const knuckleX = isThumb
      ? centreX + lean + rough.thumbSide * palmWidth * 0.44
      : centreX + lean + clamp((tip.x - centreX) * 0.76, palmWidth * 0.38);
    const from = knuckleY + unit * shape.drop * 0.5;
    limbs.push({
      stroke: {
        d: fingerPath(knuckleX, from, tip.x, tip.y),
        width: unit * FINGER_THICK * shape.width,
      },
    });
  }

  // The palm over the knuckles, as two boxes that overlap: the back of
  // a hand is nearly square across the knuckles and round at the heel,
  // and one rounded rectangle can only be one of those. Two of them
  // union into the right shape, because the whole hand is painted as
  // one silhouette anyway.
  const palmX = centreX + lean - palmWidth / 2;
  limbs.push({
    box: {
      x: palmX,
      y: palmTop,
      width: palmWidth,
      height: palmHeight * 0.62,
      radius: palmWidth * 0.16,
    },
  });
  limbs.push({
    box: {
      x: palmX + palmWidth * 0.02,
      y: palmTop + palmHeight * 0.3,
      width: palmWidth * 0.96,
      height: palmHeight * 0.7,
      radius: palmWidth * 0.42,
    },
  });

  const shapes: StageShape[] = [
    ...paint(limbs, colors.edge, unit * OUTLINE),
    ...paint(limbs, colors.skin, 0),
  ];

  // A pad on the fingertip that is pressing: inside the silhouette, so
  // it marks the finger without breaking its outline.
  for (const tip of tips) {
    if (!tip.pressed) continue;
    const r = unit * 0.21;
    shapes.push({
      x: round(tip.x - r),
      y: round(tip.y - r),
      width: round(r * 2),
      height: round(r * 2),
      fill: darken(colors.skin, 0.17),
      radius: round(r),
    });
  }

  // And the finger's number on the key it is playing.
  //
  // Last of everything, and up at the fingertip rather than down at the
  // key's front, because the front of the keyboard is where the palm
  // is. A number under the hand is a number nobody reads.
  if (options.fingerNumbers !== false) {
    for (const tip of tips) {
      if (!tip.pressed) continue;
      const badge = unit * 0.34;
      shapes.push({
        x: round(tip.x - badge),
        y: round(tip.y + unit * 0.95 - badge),
        width: round(badge * 2),
        height: round(badge * 2),
        fill: colors.tip,
        stroke: colors.edge,
        strokeWidth: round(unit * 0.07),
        radius: round(badge),
        label: String(tip.finger),
        labelSize: round(badge * 1.35),
        labelColor: colors.edge,
      });
    }
  }

  return shapes;
}

/** Keeps a finger's knuckle inside the palm it belongs to. */
function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

/** Both hands, left first so the right draws over it where they meet. */
export function handsShapes(options: HandsOptions): readonly StageShape[] {
  return [...handShapes('left', options), ...handShapes('right', options)];
}
