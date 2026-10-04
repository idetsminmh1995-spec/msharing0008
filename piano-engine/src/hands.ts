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
import { keyboardGeometry, noteName } from './keyboard.js';
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
  /**
   * One colour per finger, drawn on the fingers themselves.
   *
   * Five fingers in one skin colour is a mitten. A learner reading a
   * "3" over a note has to find the third finger, and on a silhouette
   * that means counting across from the thumb every single time -- at
   * video speed, every time. A colour answers it before the counting
   * starts, which is the whole reason to draw a hand rather than name
   * a key.
   *
   * The SAME five colours in both hands, deliberately. A learner
   * thinks "that is finger 3", not "that is the right hand's finger
   * 3", and two sets of five colours is ten things to learn instead of
   * five. What tells the hands apart is the outline and the badge,
   * which are already each hand's own colour.
   */
  readonly fingers: Readonly<Record<Finger, string>>;
}

/**
 * The five finger colours.
 *
 * Spread right round the wheel rather than through one family, because
 * the question they answer is "which of these five", and five shades of
 * one hue is the hardest possible way to ask it. Each is dark enough to
 * read on a cream white key and bright enough to read on a black one,
 * since a hand spans both.
 */
export const DEFAULT_FINGER_COLORS: Readonly<Record<Finger, string>> = {
  1: '#E2574C',
  2: '#F0A030',
  3: '#43B97F',
  4: '#3C8DDE',
  5: '#9B6BD6',
};

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
  left: { skin: '#E8C6A0', edge: '#B3800E', tip: '#FFC400', fingers: DEFAULT_FINGER_COLORS },
  right: { skin: '#E8C6A0', edge: '#2E6DA8', tip: '#4FA3FF', fingers: DEFAULT_FINGER_COLORS },
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
  /** The five finger colours, when the default does not suit the frame. */
  readonly fingers?: Readonly<Record<Finger, string>>;
}): Readonly<Record<Hand, HandColors>> {
  const skin = colors.skin ?? DEFAULT_HAND_COLORS.left.skin;
  const fingers = colors.fingers ?? DEFAULT_FINGER_COLORS;
  return {
    left: { skin, edge: darken(colors.leftHand, 0.42), tip: colors.leftHand, fingers },
    right: { skin, edge: darken(colors.rightHand, 0.42), tip: colors.rightHand, fingers },
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
  /**
   * Whether a played key says which note it is. Default true.
   *
   * The stage passes its own `keyNames` straight through, so the one
   * control on the page turns the names off everywhere at once: the
   * standing C names, the name a falling bar carries down, and the name
   * this design puts above the key being played.
   */
  readonly keyNames?: boolean;
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

  // The number on each finger.
  //
  // Which is the thing the hand is drawn FOR. A learner reading a "3"
  // over a note has to find the third finger, and on a bare silhouette
  // that means counting across from the thumb -- at video speed, every
  // time. The number says it outright.
  //
  // The fingers were briefly drawn in five different colours instead,
  // which answers the same question and answers it faster. The owner's
  // call was that a hand is a hand: five colours make it a diagram of
  // one. A number is the smaller mark, it is the same symbol the
  // notation above uses, and it needs no key.
  //
  // The one that is PRESSING gets a filled badge; the rest are plain.
  // That is one mark doing two jobs -- which finger, and which one is
  // working -- where a ring or a dot would have been a second.
  if (options.fingerNumbers !== false) {
    const pressing = new Set(setting.targets.filter((t) => t.playing).map((t) => t.finger));
    for (const finger of ALL_FINGERS) {
      for (const shape of fingerNumberShape(
        placement,
        finger,
        unit,
        colors,
        pressing.has(finger),
      )) {
        shapes.push(shape);
      }
    }
  }

  // And the NAME of the note being played, above the key it is on.
  //
  // Every other design in this engine names a key at its front edge,
  // which is the right place when nothing is in the way. Here a hand
  // is: the front of the keyboard is where the palm sits, and a name
  // under a palm is a name nobody reads. So in this design it goes
  // above the fingertip instead, on the key's own colour, which is the
  // one piece of the key a hand never covers.
  //
  // The finger's number used to be here. It is on the finger now, where
  // it belongs -- a number floating over a key never said WHICH finger
  // without the reader tracing a line down to the hand.
  if (options.keyNames !== false) {
    for (const target of setting.targets) {
      if (!target.playing) continue;
      if (target.midi === undefined) continue;
      const tip = placedTip(placement, target.finger);
      const badge = unit * 0.38;
      const label = noteName(target.midi);
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
        label,
        // A sharp is two characters in the width a natural needs one,
        // so it is set smaller rather than allowed to spill off its
        // own badge.
        labelSize: round(badge * (label.length > 1 ? 0.95 : 1.35)),
        labelColor: colors.edge,
      });
    }
  }

  return shapes;
}

/**
 * One finger's number, drawn on the finger itself.
 *
 * Just back from the fingertip -- on the last segment, where the finger
 * is at its widest and where nothing else is drawn. Struck from the
 * artwork's own fingertip rather than from an invented point, so it
 * moves with the hand's spread and turn exactly as the finger does.
 *
 * Sized from the WHITE KEY and not from the finger, so all five are one
 * size: five numbers at five sizes read as a ranking rather than as
 * labels. Below `NUMBER_MIN_SIZE` they are dropped altogether -- a row
 * of smudges on a hand is worse than a hand.
 */
function fingerNumberShape(
  placement: HandPlacement,
  finger: Finger,
  unit: number,
  colors: HandColors,
  pressing: boolean,
): readonly StageShape[] {
  const size = unit * (pressing ? 0.46 : 0.38);
  if (size < NUMBER_MIN_SIZE) return [];
  const tip = ARTWORK_TIPS[finger];
  // Back from the tip along the finger, far enough in that the digit
  // sits ON the finger rather than half off its end. The thumb needs
  // more: its recorded tip is the outline's extreme in X -- a thumb
  // points sideways, so its "tip" is a corner rather than the middle of
  // a rounded end -- and 0.92 of that is still on the edge.
  const inset = finger === 1 ? { x: 0.78, y: 0.9 } : { x: 0.92, y: 0.84 };
  const at = transformPoint(placement, tip.x * inset.x, tip.y * inset.y);
  const box = size * 1.25;
  return [
    {
      x: round(at.x - box),
      y: round(at.y - box),
      width: round(box * 2),
      height: round(box * 2),
      // The finger doing the work wears its number in a filled badge;
      // the other four carry theirs on the skin. One mark doing two
      // jobs -- which finger, and which one is down -- where a ring or
      // a dot would have been a second mark saying the same thing.
      fill: pressing ? colors.tip : 'none',
      ...(pressing ? { stroke: colors.edge, strokeWidth: round(unit * 0.06) } : {}),
      radius: round(box),
      label: String(finger),
      labelSize: round(size),
      labelColor: colors.edge,
    },
  ];
}

/**
 * The least a finger number may be drawn at, in pixels of the frame.
 *
 * Below this it is a mark rather than a digit, and five marks on a hand
 * say less than a hand with nothing on it.
 */
const NUMBER_MIN_SIZE = 6;

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
