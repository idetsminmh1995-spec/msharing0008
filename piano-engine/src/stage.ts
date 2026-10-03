/**
 * stage.ts — the notes falling, and the keyboard they fall onto.
 *
 * A frame is described ONCE, as a list of rectangles (`stageShapes`),
 * and then written out however the caller draws: as SVG for a page, or
 * painted onto a canvas for a video, where rasterising an SVG thirty
 * times a second would cost more than the rest of the frame together.
 * Neither renderer decides what a frame looks like, so neither can
 * drift from the other.
 */
import { parseColor } from './color.js';
import { DEFAULT_HAND_COLORS, handsShapes } from './hands.js';
import {
  keyboardGeometry,
  keyboardRange,
  pressedAt,
  whiteKeysBetween,
  whiteOutward,
} from './keyboard.js';
import { n, path, rect, text, wrap } from './svg.js';
import type {
  FallingBar,
  GridLine,
  Hand,
  KeyboardSize,
  PianoColors,
  PianoDesign,
  PianoKey,
  PianoNote,
  PianoStageOptions,
  StageShape,
} from './types.js';

export const DEFAULT_COLORS: PianoColors = {
  whiteKey: '#F7F4F0',
  blackKey: '#141010',
  keyEdge: '#2A2320',
  strikeLine: '#C81E2C',
  // Faint: the grid is there to be read PAST. A line as strong as a
  // note would compete with the thing it is meant to place.
  barLine: 'rgba(255,255,255,0.34)',
  beatLine: 'rgba(255,255,255,0.16)',
  leftHand: '#FFC400',
  rightHand: '#4FA3FF',
  background: 'none',
};

/** A note falls for this long before it is played, unless the caller says otherwise. */
export const DEFAULT_LEAD_SECONDS = 2.5;

/** How much of the fall a top fade covers, and how dim a note starts. */
const FADE_FRACTION = 0.38;
const FADE_STRENGTH = 0.88;
/** Bands the fade is drawn in. Enough that the steps do not show; few enough to cost nothing. */
const FADE_BANDS = 18;

/** Grid thickness, as a fraction of the stage's height. */
const BAR_LINE_FRACTION = 0.007;
const BEAT_LINE_FRACTION = 0.0035;

/** How tall the keyboard is when nothing says: a third of the stage. */
/**
 * The badge font.
 *
 * A system stack rather than a web font: a video is rendered on
 * whatever machine the page is open on, and a font that has not
 * finished loading draws a different frame from the one before it.
 */
const LABEL_FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

const KEYBOARD_FRACTION = 1 / 3;
/**
 * The keyboard's share of the stage in the hands design.
 *
 * All of it, because nothing else is on the stage any more and the
 * hands do not need room above the keys: the player sits at the FRONT
 * of the keyboard, so the hands come up from the bottom of the frame
 * and reach away from the viewer. What they need is DEPTH of key, and
 * the way to give them that is to let the keyboard have the box.
 */
const KEYBOARD_FRACTION_HANDS = 1;

/**
 * How long a white key is allowed to be, in its own widths.
 *
 * A keyboard stretched to whatever box it is given stops being a
 * keyboard: in a 9:16 frame the stage is twice as tall as it is wide,
 * and a third of it is already a tower of keys a metre long. The
 * falling-notes design gets away with it -- the notes come down that
 * tower and fill it -- but the hands design has hands on those keys,
 * and a hand is as wide as five keys whatever the picture does. Let
 * the keys grow and the hands become spiders on a wall.
 *
 * A real white key is about six and a half of its own widths long.
 * Eleven is longer than real and still reads as a keyboard, which is
 * the most a frame can be given before the drawing starts lying.
 */
const MAX_KEY_LENGTH = 11.2;

/**
 * The fewest white keys the hands design will ever show: two octaves.
 *
 * Below that the window stops being a keyboard and becomes a diagram
 * of four notes -- and a hand spans five white keys, so two hands and
 * the air between them need about this much to sit in at all.
 */
const MIN_HANDS_WHITES = 14;
/** The strike line's thickness, as a fraction of the keyboard's height. */
const LINE_FRACTION = 0.05;

export function resolveColors(colors?: Partial<PianoColors>): PianoColors {
  return { ...DEFAULT_COLORS, ...(colors ?? {}) };
}

/**
 * The stretch of keyboard the hands design shows.
 *
 * Two things decide it, and the answer is the larger:
 *
 *  - what the FRAME can show. A key has a believable length (see
 *    `MAX_KEY_LENGTH`), so a box of a given shape can only carry so
 *    many keys before they stop looking like keys. A 16:9 stage is
 *    wide and shallow and carries the whole piano; a 9:16 stage is
 *    the other way round and carries about two octaves. That is not a
 *    compromise -- it is what a lesson video filmed in portrait shows,
 *    because it is all that fits.
 *  - what the PIECE needs. A hand that reaches a key outside the
 *    window would be drawn pressing nothing, so the window always
 *    covers every note in the score, however wide that makes it.
 *
 * Fixed for the whole video, centred on the music's own range: a
 * keyboard that scrolled would move under the hands, and then neither
 * the hands nor the keys could be read.
 */
export function handsRange(options: {
  width: number;
  height: number;
  size?: KeyboardSize;
  notes?: readonly PianoNote[];
  keyboardHeight?: number;
}): { first: number; last: number } {
  const full = keyboardRange(options.size ?? 88);
  const fullWhites = whiteKeysBetween(full.first, full.last);

  const available =
    options.keyboardHeight !== undefined && options.keyboardHeight > 0
      ? Math.min(options.keyboardHeight, options.height)
      : options.height * KEYBOARD_FRACTION_HANDS;
  const affords =
    available > 0 ? Math.round((options.width * MAX_KEY_LENGTH) / available) : fullWhites;

  const played = (options.notes ?? [])
    .map((note) => note.midi)
    .filter((midi) => midi >= full.first && midi <= full.last);
  // Nothing uploaded yet: sit on middle C, so the empty page shows a
  // keyboard rather than a guess.
  const low = whiteOutward(played.length > 0 ? Math.min(...played) : 60, -1);
  const high = whiteOutward(played.length > 0 ? Math.max(...played) : 60, 1);
  const needed = whiteKeysBetween(low, high) + 2;

  const whites = Math.max(
    MIN_HANDS_WHITES,
    Math.min(fullWhites, Math.max(Math.min(affords, fullWhites), needed)),
  );

  // Grow outwards from the music, a white key at a time, each side in
  // turn, so the window ends up centred on what is actually played.
  let first = low;
  let last = high;
  let left = true;
  while (whiteKeysBetween(first, last) < whites) {
    const canLeft = first > full.first;
    const canRight = last < full.last;
    if (!canLeft && !canRight) break;
    if (left && canLeft) first = whiteOutward(first - 1, -1);
    else if (!left && canRight) last = whiteOutward(last + 1, 1);
    else if (canLeft) first = whiteOutward(first - 1, -1);
    else last = whiteOutward(last + 1, 1);
    left = !left;
  }
  return { first: Math.max(full.first, first), last: Math.min(full.last, last) };
}

export function keyboardBox(options: {
  width: number;
  height: number;
  keyboardHeight?: number;
  design?: PianoDesign;
  size?: KeyboardSize;
  notes?: readonly PianoNote[];
}): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const hands = options.design === 'hands';
  const share = hands ? KEYBOARD_FRACTION_HANDS : KEYBOARD_FRACTION;
  const asked =
    options.keyboardHeight !== undefined && options.keyboardHeight > 0
      ? Math.min(options.keyboardHeight, options.height)
      : options.height * share;
  // Only the hands design is capped. The falling-notes design is the
  // picture that shipped, and a keyboard it has always drawn tall is
  // not something to change underneath it.
  const window = hands ? handsRange(options) : undefined;
  const longest =
    window !== undefined
      ? (options.width / whiteKeysBetween(window.first, window.last)) * MAX_KEY_LENGTH
      : Number.POSITIVE_INFINITY;
  const height = Math.min(asked, longest);
  return { x: 0, y: options.height - height, width: options.width, height };
}

/**
 * The bars on their way down, at one moment.
 *
 * A note's y is its distance from the strike line in TIME, scaled by
 * how long the fall takes: a note due in one second, on a 2.5 second
 * fall, sits 40% of the way down. Long notes are long bars, because
 * the bar's height is its duration through the same scale -- which is
 * what makes a held chord read as held rather than as a row of dots.
 *
 * Anything already past the line, or not yet risen above the top, is
 * dropped here rather than drawn off-stage.
 */
export function fallingBars(
  notes: readonly PianoNote[],
  options: {
    size: PianoStageOptions['size'];
    width: number;
    height: number;
    seconds: number;
    leadSeconds?: number;
    keyboardHeight?: number;
  },
): readonly FallingBar[] {
  const lead =
    options.leadSeconds !== undefined && options.leadSeconds > 0
      ? options.leadSeconds
      : DEFAULT_LEAD_SECONDS;
  const board = keyboardBox(options);
  const fallHeight = board.y;
  if (!(fallHeight > 0)) return [];
  const perSecond = fallHeight / lead;

  const keys = keyboardGeometry(options.size, {
    width: options.width,
    height: board.height,
  });
  const keyByMidi = new Map<number, PianoKey>();
  for (const key of keys) keyByMidi.set(key.midi, key);

  const bars: FallingBar[] = [];
  for (const note of notes) {
    const untilStart = note.startSeconds - options.seconds;
    if (untilStart > lead) continue; // still above the stage
    if (note.endSeconds <= options.seconds) continue; // already played
    const key = keyByMidi.get(note.midi);
    if (key === undefined) continue; // outside this keyboard

    const bottom = board.y - untilStart * perSecond;
    const top = board.y - (note.endSeconds - options.seconds) * perSecond;
    const clippedTop = Math.max(0, top);
    const clippedBottom = Math.min(board.y, bottom);
    const height = clippedBottom - clippedTop;
    if (!(height > 0)) continue;

    bars.push({
      midi: note.midi,
      hand: note.hand,
      x: key.x,
      y: clippedTop,
      width: key.width,
      height,
    });
  }
  return bars;
}

/**
 * The grid, where it is NOW.
 *
 * The same mapping the notes use -- a moment's distance from the
 * keyboard is its distance in time -- so a barline and the notes of
 * that bar move together and arrive together. A line already past the
 * keyboard, or not yet risen above the stage, is dropped.
 */
export function gridShapes(
  lines: readonly GridLine[],
  options: {
    width: number;
    height: number;
    seconds: number;
    leadSeconds?: number;
    keyboardHeight?: number;
    colors?: Partial<PianoColors>;
  },
): readonly StageShape[] {
  const colors = resolveColors(options.colors);
  const lead =
    options.leadSeconds !== undefined && options.leadSeconds > 0
      ? options.leadSeconds
      : DEFAULT_LEAD_SECONDS;
  const board = keyboardBox(options);
  const fallHeight = board.y;
  if (!(fallHeight > 0)) return [];
  const perSecond = fallHeight / lead;

  // A minimum of a whole pixel each: a line half a pixel thick is
  // spread across two rows by the renderer, and half of a faint colour
  // twice over is a line nobody can see.
  const barThickness = Math.max(1.5, options.height * BAR_LINE_FRACTION);
  const beatThickness = Math.max(1, options.height * BEAT_LINE_FRACTION);

  const shapes: StageShape[] = [];
  for (const line of lines) {
    const until = line.seconds - options.seconds;
    if (until > lead || until < 0) continue;
    const thickness = line.kind === 'bar' ? barThickness : beatThickness;
    const y = board.y - until * perSecond - thickness / 2;
    if (y + thickness < 0 || y > board.y) continue;
    shapes.push({
      x: 0,
      y,
      width: options.width,
      height: thickness,
      fill: line.kind === 'bar' ? colors.barLine : colors.beatLine,
    });
  }
  return shapes;
}

/**
 * The fade at the top of the falling area, as bands of the frame's own
 * colour at falling alphas.
 *
 * Bands rather than a gradient because a frame is drawn two ways here
 * -- as SVG on the page and onto a canvas for the video -- and a
 * rectangle is the one thing both draw identically. Eighteen of them
 * across the band is smooth at any size a video is made in.
 */
export function fadeShapes(options: {
  width: number;
  height: number;
  keyboardHeight?: number;
  fade?: PianoStageOptions['fade'];
}): readonly StageShape[] {
  const fade = options.fade;
  if (!fade) return [];
  const rgb = parseColor(fade.color);
  if (!rgb) return [];
  const board = keyboardBox(options);
  const fallHeight = board.y;
  if (!(fallHeight > 0)) return [];

  const fraction =
    fade.fraction !== undefined && fade.fraction > 0 ? Math.min(1, fade.fraction) : FADE_FRACTION;
  const strength =
    fade.strength !== undefined ? Math.max(0, Math.min(1, fade.strength)) : FADE_STRENGTH;
  const bandHeight = (fallHeight * fraction) / FADE_BANDS;
  if (!(bandHeight > 0)) return [];

  const shapes: StageShape[] = [];
  for (let i = 0; i < FADE_BANDS; i++) {
    // Strongest at the very top, gone by the bottom of the band.
    const alpha = strength * (1 - i / FADE_BANDS);
    if (alpha <= 0.002) continue;
    shapes.push({
      x: 0,
      y: i * bandHeight,
      width: options.width,
      // A hair of overlap, so no seam shows between bands.
      height: bandHeight + 0.5,
      fill: `rgba(${Math.round(rgb.r)},${Math.round(rgb.g)},${Math.round(rgb.b)},${alpha.toFixed(3)})`,
    });
  }
  return shapes;
}

export function handColor(hand: Hand, colors: PianoColors): string {
  return hand === 'left' ? colors.leftHand : colors.rightHand;
}

/**
 * A whole frame as a list of rectangles, in paint order.
 *
 * Everything that decides what the stage LOOKS like is here: which
 * colour a key is, what goes over what, where the line sits. Both
 * renderers just write these out.
 */
export function stageShapes(options: PianoStageOptions): readonly StageShape[] {
  const colors = resolveColors(options.colors);
  const notes = options.notes ?? [];
  // Two designs, one set of facts. `falling-notes` draws the grid, the
  // bars and the fade; `hands` draws none of them and puts two hands on
  // the keys instead. Everything either one needs -- the notes, the
  // fingering, the keyboard -- is the same either way.
  const design: PianoDesign = options.design ?? 'falling-notes';
  const falling = design === 'falling-notes';
  const board = keyboardBox(options);
  const keys = keyboardGeometry(falling ? options.size : handsRange(options), board);
  const down = pressedAt(notes, options.seconds);
  const lineHeight = Math.max(1, board.height * LINE_FRACTION);
  const edge = Math.max(0.5, board.width / 900);

  const shapes: StageShape[] = [];
  if (colors.background !== 'none') {
    shapes.push({
      x: 0,
      y: 0,
      width: options.width,
      height: options.height,
      fill: colors.background,
    });
  }

  if (falling) {
    // The grid first, so the notes come out of it rather than sit on it.
    for (const shape of gridShapes(options.gridLines ?? [], options)) shapes.push(shape);

    // The falling notes go UNDER the keyboard: a bar that has landed
    // should look like it went into the key, not over it.
    for (const bar of fallingBars(notes, options)) {
      shapes.push({
        x: bar.x,
        y: bar.y,
        width: bar.width,
        height: bar.height,
        fill: handColor(bar.hand, colors),
        radius: Math.min(bar.width, bar.height) / 4,
      });
    }

    // The fade goes over the grid and the notes, and under the
    // keyboard: a key is a thing in the room, not something in the
    // distance.
    for (const shape of fadeShapes(options)) shapes.push(shape);
  }

  const fillFor = (key: PianoKey): string => {
    const hand = down.get(key.midi);
    if (hand !== undefined) return handColor(hand, colors);
    return key.black ? colors.blackKey : colors.whiteKey;
  };

  // Whites, then blacks over them -- the order a piano is built in,
  // and the reason a black key is not cut in half by its neighbour.
  for (const key of keys) {
    if (key.black) continue;
    shapes.push({
      x: key.x,
      y: key.y,
      width: key.width,
      height: key.height,
      fill: fillFor(key),
      stroke: colors.keyEdge,
      strokeWidth: edge,
    });
  }
  for (const key of keys) {
    if (!key.black) continue;
    shapes.push({
      x: key.x,
      y: key.y,
      width: key.width,
      height: key.height,
      fill: fillFor(key),
    });
  }

  // The line the notes land on, so no key covers it. Nothing lands in
  // the hands design, so there is no line to land on.
  if (falling) {
    shapes.push({
      x: 0,
      y: board.y - lineHeight / 2,
      width: options.width,
      height: lineHeight,
      fill: colors.strikeLine,
    });
  }

  // And the hands over everything, because that is where they are.
  // Only in the design that is about them, and only when a caller
  // hands over a fingering -- the hands come from `planFingering`, not
  // from the notes, and a page that has not asked for them gets
  // exactly the stage it got before.
  if (!falling && options.hands !== undefined) {
    for (const shape of handsShapes({
      size: options.size,
      // The window the stage actually drew, not the whole instrument:
      // a hand laid out on 88 keys while two octaves were drawn puts
      // every finger a third of a keyboard away from its own key.
      range: handsRange(options),
      board,
      seconds: options.seconds,
      notes: options.hands.notes,
      anchors: options.hands.anchors,
      colors: options.hands.colors ?? DEFAULT_HAND_COLORS,
      ...(options.hands.scale !== undefined ? { scale: options.hands.scale } : {}),
      ...(options.hands.fingerNumbers !== undefined
        ? { fingerNumbers: options.hands.fingerNumbers }
        : {}),
    })) {
      shapes.push(shape);
    }
  }
  return shapes;
}

function shapesToSvg(shapes: readonly StageShape[], width: number, height: number): string {
  const body = shapes
    .map((shape) =>
      shape.path !== undefined
        ? path(shape.path, {
            fill: shape.fill,
            ...(shape.stroke !== undefined ? { stroke: shape.stroke } : {}),
            ...(shape.strokeWidth !== undefined ? { 'stroke-width': shape.strokeWidth } : {}),
            // Round, because a finger ends in a fingertip. A butt cap
            // is what makes a stroked finger read as a stick.
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          })
        : rect(shape.x, shape.y, shape.width, shape.height, {
            fill: shape.fill,
            ...(shape.stroke !== undefined ? { stroke: shape.stroke } : {}),
            ...(shape.strokeWidth !== undefined ? { 'stroke-width': shape.strokeWidth } : {}),
            ...(shape.radius !== undefined && shape.radius > 0 ? { rx: shape.radius } : {}),
          }) +
          // A label is drawn ON its own shape, centred in its box, so
          // one entry in the list is one thing on the screen rather
          // than a badge and a number that could come apart.
          (shape.label !== undefined
            ? text(shape.label, shape.x + shape.width / 2, shape.y + shape.height / 2, {
                fill: shape.labelColor ?? shape.fill,
                'font-size': shape.labelSize ?? shape.height * 0.7,
                'font-family': LABEL_FONT,
                'font-weight': 700,
                'text-anchor': 'middle',
                'dominant-baseline': 'central',
              })
            : ''),
    )
    .join('');
  return wrap(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${n(width)} ${n(height)}`,
      width,
      height,
      preserveAspectRatio: 'none',
    },
    body,
  );
}

/**
 * The whole stage at one moment: falling bars, keyboard, lit keys.
 *
 * One string, no DOM, no state -- which is what a preview, a test and
 * an export all want from the same call.
 */
export function renderPianoStage(options: PianoStageOptions): string {
  return shapesToSvg(stageShapes(options), options.width, options.height);
}

/** The keyboard with nothing played: the same drawing, no notes. */
export function renderKeyboardSvg(options: Omit<PianoStageOptions, 'seconds' | 'notes'>): string {
  return renderPianoStage({ ...options, seconds: 0, notes: [] });
}
