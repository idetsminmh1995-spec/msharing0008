/**
 * stage.ts — the neck, and the notes lit on it.
 *
 * A frame is described ONCE, as a list of shapes (`stageShapes`), and
 * written out however the caller draws: as SVG for a page, or painted
 * onto a canvas for a video. Neither renderer decides what a frame
 * looks like, so neither can drift from the other.
 */
import {
  fretCenter,
  fretRange,
  fretWidth,
  fretWires,
  inlayFrets,
  positionsAt,
  stringLines,
} from './fretboard.js';
import { n, tag, wrap } from './svg.js';
import type {
  Finger,
  FretboardOptions,
  GuitarColors,
  GuitarStageOptions,
  LivePosition,
  StageShape,
} from './types.js';

export const DEFAULT_COLORS: GuitarColors = {
  board: '#2A1A12',
  boardEdge: '#120A06',
  fretWire: '#9A8F86',
  nut: '#E8DCCB',
  inlay: '#6E6158',
  string: '#D9CDBE',
  unassigned: '#F7F4F0',
  open: '#63D28B',
  index: '#FFC400',
  middle: '#4FA3FF',
  ring: '#FF5C8A',
  little: '#9B6BFF',
  background: 'none',
};

/** How big a played mark is, as a fraction of the gap between two strings. */
const MARK_SIZE = 1.5;

export function resolveColors(colors?: Partial<GuitarColors>): GuitarColors {
  return { ...DEFAULT_COLORS, ...(colors ?? {}) };
}

/**
 * The colour a finger is drawn in.
 *
 * An unanswered note is NOT given a finger's colour: it gets its own,
 * so a video never says "little finger" about a note nobody has
 * decided yet.
 */
export function fingerColor(finger: Finger | undefined, colors: GuitarColors): string {
  switch (finger) {
    case 0:
      return colors.open;
    case 1:
      return colors.index;
    case 2:
      return colors.middle;
    case 3:
      return colors.ring;
    case 4:
      return colors.little;
    default:
      return colors.unassigned;
  }
}

/** The names, in the order a hand has them. Exported so a page's legend and this engine agree. */
export const FINGER_NAMES: Readonly<Record<1 | 2 | 3 | 4, string>> = {
  1: 'Index',
  2: 'Middle',
  3: 'Ring',
  4: 'Little',
};

function rectShape(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  extra: Partial<StageShape> = {},
): StageShape {
  return { kind: 'rect', x, y, width, height, fill, ...extra };
}

/** The neck with nothing played on it: board, frets, inlays, strings. */
export function fretboardShapes(options: FretboardOptions): readonly StageShape[] {
  const colors = resolveColors(options.colors);
  const { width, height } = options;
  if (!(width > 0) || !(height > 0)) return [];
  const shapes: StageShape[] = [];

  if (colors.background !== 'none') {
    shapes.push(rectShape(0, 0, width, height, colors.background));
  }
  shapes.push(
    rectShape(0, 0, width, height, colors.board, { radius: Math.min(height, width) * 0.04 }),
  );

  const per = fretWidth(options);
  const { first } = fretRange(options);
  const wireWidth = Math.max(1, per * 0.045);
  const nutWidth = Math.max(2, per * 0.12);

  // The inlays sit UNDER the strings, as they do in the wood.
  const strings = stringLines(options);
  const middleY = height / 2;
  const gap = strings.length > 1 ? strings[1]!.offset - strings[0]!.offset : height / 6;
  const inlayR = Math.max(2, gap * 0.34);
  for (const inlay of inlayFrets(options)) {
    const cx = fretCenter(inlay.fret, options);
    if (inlay.double) {
      for (const dy of [-gap, gap]) {
        shapes.push({
          kind: 'circle',
          x: cx,
          y: middleY + dy,
          width: inlayR * 2,
          height: inlayR * 2,
          fill: colors.inlay,
        });
      }
    } else {
      shapes.push({
        kind: 'circle',
        x: cx,
        y: middleY,
        width: inlayR * 2,
        height: inlayR * 2,
        fill: colors.inlay,
      });
    }
  }

  for (const wire of fretWires(options)) {
    const isNut = wire.fret === 0 && first === 0;
    const w = isNut ? nutWidth : wireWidth;
    shapes.push(rectShape(wire.offset - w / 2, 0, w, height, isNut ? colors.nut : colors.fretWire));
  }

  for (const line of strings) {
    shapes.push(
      rectShape(0, line.offset - line.thickness / 2, width, line.thickness, colors.string),
    );
  }
  return shapes;
}

/**
 * The marks for what is being played, at one moment.
 *
 * A stopped note is a dot in its fret. A SLIDE is drawn as the road
 * it is travelling -- a bar from where it left to where it is now --
 * with the dot at the head of it, so the movement is visible in a
 * still frame as well as in motion.
 */
export function markShapes(
  positions: readonly LivePosition[],
  options: FretboardOptions,
): readonly StageShape[] {
  const colors = resolveColors(options.colors);
  const strings = stringLines(options);
  const byString = new Map(strings.map((line) => [line.string, line]));
  const gap = strings.length > 1 ? strings[1]!.offset - strings[0]!.offset : options.height / 6;
  const size = gap * MARK_SIZE;
  const { first, last } = fretRange(options);

  const shapes: StageShape[] = [];
  for (const position of positions) {
    const line = byString.get(position.string);
    if (line === undefined) continue;
    if (position.fret < first || position.fret > last) continue;
    const color = fingerColor(position.finger, colors);
    const x = fretCenter(position.fret, options);

    if (position.sliding) {
      const fromX = fretCenter(position.fromFret, options);
      const left = Math.min(fromX, x);
      const right = Math.max(fromX, x);
      shapes.push(
        rectShape(
          left,
          line.offset - size * 0.22,
          Math.max(size * 0.2, right - left),
          size * 0.44,
          color,
          {
            radius: size * 0.22,
            opacity: 0.55,
          },
        ),
      );
    }
    shapes.push({ kind: 'circle', x, y: line.offset, width: size, height: size, fill: color });
  }
  return shapes;
}

/** A whole frame: the neck, then what is played on it. */
export function stageShapes(options: GuitarStageOptions): readonly StageShape[] {
  const positions = positionsAt(options.notes ?? [], options.seconds);
  return [...fretboardShapes(options), ...markShapes(positions, options)];
}

function shapesToSvg(shapes: readonly StageShape[], width: number, height: number): string {
  const body = shapes
    .map((shape) => {
      const common = {
        fill: shape.fill,
        ...(shape.stroke !== undefined ? { stroke: shape.stroke } : {}),
        ...(shape.strokeWidth !== undefined ? { 'stroke-width': shape.strokeWidth } : {}),
        ...(shape.opacity !== undefined ? { opacity: shape.opacity } : {}),
      };
      if (shape.kind === 'circle') {
        return tag('circle', { cx: shape.x, cy: shape.y, r: shape.width / 2, ...common });
      }
      return tag('rect', {
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        ...(shape.radius !== undefined && shape.radius > 0 ? { rx: shape.radius } : {}),
        ...common,
      });
    })
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

/** The stage as SVG: what the page puts in the DOM. */
export function renderGuitarStage(options: GuitarStageOptions): string {
  return shapesToSvg(stageShapes(options), options.width, options.height);
}

/** The neck with nothing played: the same drawing, no notes. */
export function renderFretboard(options: FretboardOptions): string {
  return renderGuitarStage({ ...options, seconds: 0, notes: [] });
}
