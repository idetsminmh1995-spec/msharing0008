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
import { HAND_REACH_PAST_KEYS } from './hands.js';
import { keyboardGeometry, noteName, pressedAt, whiteKeyCount } from './keyboard.js';
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
  // Dark on a white key, and faint: it is a ruler mark, not a label to
  // be read instead of the music.
  keyName: 'rgba(30,21,18,0.38)',
  // On the bar itself, which is always a bright hand colour, so the
  // name is dark and nearly solid -- it has to be read in the half
  // second the bar is on its way down.
  noteName: 'rgba(22,16,13,0.82)',
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

/**
 * How tall the keyboard is when nothing says.
 *
 * Was a third. A keyboard is the thing a viewer is actually looking at
 * -- it is where the note lands, where the key lights up, and now where
 * every C is named -- and a third of the stage left those names too
 * small to read at video size. The fall above it loses the same room,
 * which costs nothing: a note's distance from the keys is TIME, so a
 * shorter fall is the same seconds drawn closer together.
 */
/**
 * The badge font.
 *
 * A system stack rather than a web font: a video is rendered on
 * whatever machine the page is open on, and a font that has not
 * finished loading draws a different frame from the one before it.
 */
const LABEL_FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

const KEYBOARD_FRACTION = 0.42;
/**
 * How deep a keyboard is drawn in the hands design, and how much room
 * is kept in front of it for the hands. Both in white-key widths.
 *
 * A white key is 23mm wide and 150mm long, so a keyboard is about six
 * and a half of its own key widths deep. Drawn much deeper than that
 * it stops being a keyboard: in a 9:16 frame the stage is twice as
 * tall as it is wide, and a keyboard stretched to fill it is a tower
 * of planks with hands the size of specks on it.
 *
 * `HAND_BAND` is the strip in FRONT of the keys -- nearest the player,
 * at the bottom of the frame -- that the keyboard does not use. It is
 * not spare room: the heel of a hand reaching the keys sits past the
 * front edge of them, exactly as it does on a real piano, and this is
 * where it sits. Its width is the HAND's own number -- how far a hand
 * reaches past the keys it is playing -- plus a quarter key of air, so
 * the layout cannot drift away from the anatomy. Without it a hand is
 * cut off at the wrist by the bottom of the frame.
 */
const KEY_DEPTH = 7;
const HAND_BAND = HAND_REACH_PAST_KEYS;

/** The strike line's thickness, as a fraction of the keyboard's height. */
const LINE_FRACTION = 0.05;

export function resolveColors(colors?: Partial<PianoColors>): PianoColors {
  return { ...DEFAULT_COLORS, ...(colors ?? {}) };
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
  if (options.design === 'hands') return handsKeyboardBox(options);
  const height =
    options.keyboardHeight !== undefined && options.keyboardHeight > 0
      ? Math.min(options.keyboardHeight, options.height)
      : options.height * KEYBOARD_FRACTION;
  return { x: 0, y: options.height - height, width: options.width, height };
}

/**
 * The keyboard in the hands design: as deep as a real one, with the
 * hands' own strip kept in front of it.
 *
 * NOT flush with the bottom of the stage, which is where every other
 * keyboard in this engine sits. The hands come up from the front of
 * the keys -- the bottom of the frame -- and the heel of a palm rests
 * past the keys' front edge. That strip is `HAND_BAND`, and drawing
 * keyboard into it is what cut the hands off at the wrist.
 *
 * The keyboard and its strip are one group, centred in whatever box
 * the page gives: a very tall stage gets a real keyboard with space
 * above and below it rather than a stretched one.
 */
function handsKeyboardBox(options: {
  width: number;
  height: number;
  keyboardHeight?: number;
  size?: KeyboardSize;
  notes?: readonly PianoNote[];
}): { x: number; y: number; width: number; height: number } {
  // The whole instrument the caller asked for. 88 Keys means 88 keys:
  // showing a window of it and calling it an 88 is answering a
  // different question from the one the control asks.
  const unit = options.width / whiteKeyCount(options.size ?? 88);
  const band = unit * HAND_BAND;
  const asked =
    options.keyboardHeight !== undefined && options.keyboardHeight > 0
      ? Math.min(options.keyboardHeight, options.height)
      : Math.max(options.height * 0.55, options.height - band);
  const depth = Math.max(1, Math.min(unit * KEY_DEPTH, asked, options.height));
  // Along the BOTTOM of the stage, with the hands' strip under it: the
  // keyboard is the nearest thing to the player, so whatever room is
  // left over belongs above it, with the music, and not split either
  // side of it as a pair of black bands.
  const group = Math.min(options.height, depth + band);
  return {
    x: 0,
    y: Math.max(0, options.height - group),
    width: options.width,
    height: depth,
  };
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

/**
 * The least a note name may be drawn at, in pixels of the frame.
 *
 * Below this it is a smudge, and a smudge on every bar is worse than no
 * name at all -- so a bar too small for its name goes without one. At
 * 1920 wide an 88-key white key is 37px and a black one 22px, so this
 * only bites on a narrow frame or a very short note.
 */
const NAME_MIN_SIZE = 7;

/**
 * A falling bar's own note name: 'D' on a D, 'D#' on the black key
 * above it.
 *
 * Sharps throughout, because this names a KEY and not a note in a
 * score: the black key between D and E is one key, and a learner
 * looking for it is looking for "the one above D". Whether the music
 * calls it D# or Eb is the score's business, and the notation above the
 * keyboard already answers it.
 *
 * Drawn at the BOTTOM of the bar, which is the end that lands: on a
 * long held note the name then sits where the eye already is, just
 * above the key it is about to light, instead of floating half a screen
 * up in the middle of a stripe.
 *
 * Returns nothing at all when the bar is too small to hold a legible
 * name, which is the case this has to get right -- a run of
 * sixteenths is a row of short bars, and a row of smudges would be
 * worse than the bars alone.
 */
function barNameShape(bar: FallingBar, unit: number, colors: PianoColors): readonly StageShape[] {
  // Sized from the WHITE key and not from the bar. A black key is two
  // thirds the width of a white one, and sizing each name to its own
  // bar would have made every sharp -- the names a learner most needs,
  // because a sharp is the key they cannot find -- the first to shrink
  // below legibility and vanish. They are all one size, and a 'D#' on
  // a black key simply overhangs it a little onto the dark behind.
  const size = Math.min(unit * 0.5, bar.height * 0.6);
  if (size < NAME_MIN_SIZE) return [];
  const label = noteName(bar.midi);
  const box = size * 1.5;
  // Wide enough for the text, centred on the bar: the box is only ever
  // used to centre the label in, so letting it out past a narrow bar
  // costs nothing and keeps a two-character name from being cramped.
  const width = Math.max(bar.width, size * label.length * 0.78);
  return [
    {
      x: round2(bar.x + bar.width / 2 - width / 2),
      y: round2(bar.y + bar.height - box),
      width: round2(width),
      height: round2(box),
      fill: 'none',
      label,
      labelSize: round2(size),
      labelColor: colors.noteName,
    },
  ];
}

/**
 * The name of a key that is being held, drawn on the key itself.
 *
 * Right at the FRONT edge -- the part of a key nearest the player, and
 * the part a hand reaching over the keyboard does not cover. The C
 * names sit further back for the same reason in reverse: they are read
 * between notes, not during them.
 *
 * Sized to its own key rather than to the white one, because a sharp
 * has to fit on a black key: two characters across six tenths of a
 * white key's width. That makes a sharp's name a little smaller than a
 * natural's, which is right -- the key is smaller.
 *
 * In `colors.noteName`, the same ink the falling bar used on the way
 * down, because it is the same situation: dark lettering on a key
 * flooded with a bright hand colour. The name the bar carried is the
 * name the key now shows, in the same hand, so the eye follows one
 * thing landing rather than two things appearing.
 */
function playedNameShape(
  key: PianoKey,
  whiteUnit: number,
  colors: PianoColors,
): readonly StageShape[] {
  const label = noteName(key.midi);
  /** Roughly how wide one character is, as a fraction of the font size, in the label font. */
  const CHAR_WIDTH = 0.62;
  const size = Math.min(whiteUnit * 0.46, (key.width * 0.92) / (CHAR_WIDTH * label.length));
  if (size < NAME_MIN_SIZE) return [];
  const box = size * 1.4;
  return [
    {
      x: key.x,
      y: round2(key.y + key.height - box - size * 0.25),
      width: key.width,
      height: round2(box),
      fill: 'none',
      label,
      labelSize: round2(size),
      labelColor: colors.noteName,
    },
  ];
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
  const keys = keyboardGeometry(options.size, board);
  const down = pressedAt(notes, options.seconds);
  const lineHeight = Math.max(1, board.height * LINE_FRACTION);
  const edge = Math.max(0.5, board.width / 900);
  /** One white key: the ruler every label on this frame is sized from. */
  const whiteUnit = board.width / Math.max(1, keys.filter((key) => !key.black).length);

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
      for (const shape of barNameShape(bar, whiteUnit, colors)) shapes.push(shape);
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

  // Names on the keys. Two different jobs, drawn here under the hands
  // and under the strike line, which both pass over them.
  //
  // Every C is named all the time, so a hand moving along the keyboard
  // can be placed at a glance -- a falling bar says WHICH note it is,
  // and a C on the key is what says where on the instrument that note
  // lives.
  //
  // And every key that is DOWN says its own name for as long as it is
  // held. A bar carries its name on the way down, but the moment it
  // lands the bar is gone and the name with it -- which is the moment
  // the player is actually looking at the keyboard, pressing the key.
  // So the name does not disappear at the strike line; it moves onto
  // the key and stays there while the note sounds.
  //
  // A lit key's own name wins over the standing C: they would land on
  // top of each other, and the one that is sounding is the one being
  // read.
  if (options.keyNames !== false) {
    const cSize = Math.max(6, whiteUnit * 0.46);
    for (const key of keys) {
      if (key.black || key.midi % 12 !== 0) continue;
      if (down.has(key.midi)) continue;
      shapes.push({
        x: key.x,
        y: key.y + key.height - cSize * 2.1,
        width: key.width,
        height: cSize * 1.4,
        fill: 'none',
        label: `C${Math.floor(key.midi / 12) - 1}`,
        labelSize: round2(cSize),
        labelColor: colors.keyName,
      });
    }
    for (const key of keys) {
      if (!down.has(key.midi)) continue;
      for (const shape of playedNameShape(key, whiteUnit, colors)) shapes.push(shape);
    }
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
      board,
      seconds: options.seconds,
      notes: options.hands.notes,
      anchors: options.hands.anchors,
      colors: options.hands.colors ?? DEFAULT_HAND_COLORS,
      ...(options.hands.scale !== undefined ? { scale: options.hands.scale } : {}),
      ...(options.hands.fingerNumbers !== undefined
        ? { fingerNumbers: options.hands.fingerNumbers }
        : {}),
      // The stage's own `keyNames` straight through, so one control on
      // the page turns every name off at once rather than leaving this
      // design's name on after the others have gone.
      ...(options.keyNames !== undefined ? { keyNames: options.keyNames } : {}),
    })) {
      shapes.push(shape);
    }
  }
  return shapes;
}

/** Two decimals: a font size does not need six. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
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
