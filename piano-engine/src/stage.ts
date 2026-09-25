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
import { keyboardGeometry, pressedAt } from './keyboard.js';
import { n, rect, wrap } from './svg.js';
import type {
  FallingBar,
  GridLine,
  Hand,
  PianoColors,
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
const KEYBOARD_FRACTION = 1 / 3;
/** The strike line's thickness, as a fraction of the keyboard's height. */
const LINE_FRACTION = 0.05;

export function resolveColors(colors?: Partial<PianoColors>): PianoColors {
  return { ...DEFAULT_COLORS, ...(colors ?? {}) };
}

export function keyboardBox(options: { width: number; height: number; keyboardHeight?: number }): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const height =
    options.keyboardHeight !== undefined && options.keyboardHeight > 0
      ? Math.min(options.keyboardHeight, options.height)
      : options.height * KEYBOARD_FRACTION;
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
 * `#rgb`, `#rrggbb`, `rgb(...)` or `rgba(...)` as numbers.
 *
 * Needed because a fade is the frame's OWN background at a series of
 * alphas, and a page hands that over in whatever form it reads the
 * colour in -- a computed style is `rgb(23, 17, 14)`, a stylesheet is
 * `#17110E`. Returns null for anything else rather than guessing, and
 * the fade is then simply not drawn.
 */
export function parseColor(value: string): { r: number; g: number; b: number } | null {
  const text = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const digits = hex[1] ?? '';
    const full =
      digits.length === 3
        ? digits
            .split('')
            .map((d) => d + d)
            .join('')
        : digits;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (rgb) {
    const parts = (rgb[1] ?? '').split(/[,/\s]+/).filter((p) => p.length > 0);
    const [r, g, b] = parts.map((p) => Number.parseFloat(p));
    if ([r, g, b].every((n) => Number.isFinite(n))) {
      return { r: r as number, g: g as number, b: b as number };
    }
  }
  return null;
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
  const board = keyboardBox(options);
  const keys = keyboardGeometry(options.size, board);
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

  // The fade goes over the grid and the notes, and under the keyboard:
  // a key is a thing in the room, not something in the distance.
  for (const shape of fadeShapes(options)) shapes.push(shape);

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

  // The line the notes land on, last, so no key covers it.
  shapes.push({
    x: 0,
    y: board.y - lineHeight / 2,
    width: options.width,
    height: lineHeight,
    fill: colors.strikeLine,
  });
  return shapes;
}

function shapesToSvg(shapes: readonly StageShape[], width: number, height: number): string {
  const body = shapes
    .map((shape) =>
      rect(shape.x, shape.y, shape.width, shape.height, {
        fill: shape.fill,
        ...(shape.stroke !== undefined ? { stroke: shape.stroke } : {}),
        ...(shape.strokeWidth !== undefined ? { 'stroke-width': shape.strokeWidth } : {}),
        ...(shape.radius !== undefined && shape.radius > 0 ? { rx: shape.radius } : {}),
      }),
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
