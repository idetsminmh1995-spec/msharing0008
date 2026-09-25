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
  guitarLayout,
  inlayFrets,
  positionsAt,
  stringLines,
  stringName,
  tuningFor,
} from './fretboard.js';
import { escapeText, n, tag, wrap } from './svg.js';
import type {
  Finger,
  FretboardOptions,
  GuitarColors,
  GuitarStageOptions,
  Instrument,
  LivePosition,
  StageShape,
} from './types.js';

/**
 * The finger colours are the ones on the hand: index red, middle
 * blue, ring green, little yellow.
 *
 * They are FIXED rather than pickable, because their whole job is to
 * be learnt once -- a viewer who has seen the hand knows what red
 * means for the rest of the video, and for the next video too. Four
 * colours anyone can re-pick is four colours nobody can learn.
 */
export const FINGER_COLORS = {
  index: '#E8352B',
  middle: '#2B5BE8',
  ring: '#1FA04A',
  little: '#F2C200',
} as const;

export const DEFAULT_COLORS: GuitarColors = {
  board: '#2A1A12',
  boardEdge: '#120A06',
  fretWire: '#9A8F86',
  nut: '#E8DCCB',
  inlay: '#6E6158',
  string: '#D9CDBE',
  fretNumber: 'rgba(255,255,255,0.34)',
  headstock: '#20130D',
  peg: '#BDB2A6',
  stringLabel: '#F1E7DC',
  stringLabelInk: '#20130D',
  body: '#7A2418',
  bodyEdge: '#2A0F0A',
  soundhole: '#140B07',
  rosette: '#C9A227',
  pickup: '#1B1512',
  hardware: '#C6BCB1',
  unassigned: '#F7F4F0',
  open: '#9AA6B2',
  ...FINGER_COLORS,
  background: 'none',
};

/** An acoustic is a different instrument to look at: lighter wood, a soundhole. */
export const ACOUSTIC_COLORS: Partial<GuitarColors> = {
  board: '#4A2C1A',
  headstock: '#3A2213',
  body: '#D9B478',
  bodyEdge: '#5A3A20',
};

export function instrumentColors(instrument: Instrument | undefined): Partial<GuitarColors> {
  return instrument === 'acoustic' ? ACOUSTIC_COLORS : {};
}

/** How big a played mark is, as a fraction of the gap between two strings. */
const MARK_SIZE = 1.5;

export function resolveColors(
  colors?: Partial<GuitarColors>,
  instrument?: Instrument,
): GuitarColors {
  return { ...DEFAULT_COLORS, ...instrumentColors(instrument), ...(colors ?? {}) };
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

/**
 * The instrument with nothing played on it.
 *
 * A fretboard on its own is a diagram; this is meant to read as a
 * GUITAR, so it has a headstock with tuning pegs at one end and a
 * body at the other -- a soundhole on an acoustic, pickups on an
 * electric -- with the fretted neck between them. The strings run
 * the whole way, as they do on the instrument.
 */
export function fretboardShapes(options: FretboardOptions): readonly StageShape[] {
  const colors = resolveColors(options.colors, options.instrument);
  const { width, height } = options;
  if (!(width > 0) || !(height > 0)) return [];
  const layout = guitarLayout(options);
  const shapes: StageShape[] = [];

  if (colors.background !== 'none') {
    shapes.push(rectShape(0, 0, width, height, colors.background));
  }

  const strings = stringLines(options);
  const middleY = layout.board.y + layout.board.height / 2;
  const gap =
    strings.length > 1 ? strings[1]!.offset - strings[0]!.offset : layout.board.height / 6;

  // The body first, so the neck overlaps it the way it does in wood.
  const body = layout.body;
  shapes.push(
    rectShape(body.x, body.y, body.width, body.height, colors.body, {
      radius: Math.min(body.width, body.height) * 0.22,
    }),
  );
  if (options.instrument === 'acoustic') {
    // A soundhole, with its rosette ring round it.
    const r = Math.min(body.width, body.height) * 0.3;
    const cx = body.x + body.width * 0.52;
    shapes.push({
      kind: 'circle',
      x: cx,
      y: middleY,
      width: r * 2.3,
      height: r * 2.3,
      fill: colors.rosette,
    });
    shapes.push({
      kind: 'circle',
      x: cx,
      y: middleY,
      width: r * 2,
      height: r * 2,
      fill: colors.soundhole,
    });
  } else {
    // Two pickups and a bridge: an electric, at a glance.
    const pickupWidth = body.width * 0.16;
    const pickupHeight = layout.board.height * 0.52;
    for (const at of [0.3, 0.58]) {
      shapes.push(
        rectShape(
          body.x + body.width * at,
          middleY - pickupHeight / 2,
          pickupWidth,
          pickupHeight,
          colors.pickup,
          {
            radius: pickupWidth * 0.25,
          },
        ),
      );
    }
    shapes.push(
      rectShape(
        body.x + body.width * 0.82,
        middleY - pickupHeight * 0.55,
        body.width * 0.07,
        pickupHeight * 1.1,
        colors.hardware,
        { radius: body.width * 0.02 },
      ),
    );
  }

  // The headstock, and a peg per string.
  const head = layout.headstock;
  shapes.push(
    rectShape(
      head.x,
      head.y + head.height * 0.12,
      head.width,
      head.height * 0.76,
      colors.headstock,
      {
        radius: head.width * 0.28,
      },
    ),
  );
  const pegR = Math.max(1.5, gap * 0.22);
  for (const line of strings) {
    shapes.push({
      kind: 'circle',
      x: head.x + head.width * 0.82,
      y: line.offset,
      width: pegR * 2,
      height: pegR * 2,
      fill: colors.peg,
    });
  }

  // The numbered circle and the note name at the head of each string.
  // A reader who knows "the D string" should not have to count lines
  // to find it, and the number is the one every tab and every teacher
  // uses -- 1 for the thinnest.
  if (options.stringLabels !== false) {
    const tuning = tuningFor(options);
    const badgeR = Math.min(gap * 0.42, head.width * 0.17);
    const labelSize = badgeR * 1.5;
    for (const line of strings) {
      const midi = tuning[line.string - 1];
      shapes.push({
        kind: 'circle',
        x: head.x + head.width * 0.2,
        y: line.offset,
        width: badgeR * 2,
        height: badgeR * 2,
        fill: colors.stringLabel,
      });
      shapes.push({
        kind: 'text',
        x: head.x + head.width * 0.2,
        y: line.offset,
        width: badgeR * 2,
        height: badgeR * 2,
        fill: colors.stringLabelInk,
        role: 'stringLabel',
        text: String(line.string),
        fontSize: labelSize,
        fontWeight: 800,
        align: 'middle',
        baseline: 'middle',
      });
      if (midi !== undefined) {
        shapes.push({
          kind: 'text',
          x: head.x + head.width * 0.44,
          y: line.offset,
          width: head.width * 0.4,
          height: badgeR * 2,
          fill: colors.stringLabel,
          role: 'stringName',
          text: stringName(midi, line.string === 1),
          fontSize: labelSize,
          fontWeight: 700,
          align: 'start',
          baseline: 'middle',
        });
      }
    }
  }

  // The neck.
  const neck = layout.neck;
  shapes.push(rectShape(neck.x, neck.y, neck.width, neck.height, colors.board));

  // Inlays sit UNDER the strings, as they do in the wood.
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

  const per = fretWidth(options);
  const { first } = fretRange(options);
  const wireWidth = Math.max(1, per * 0.045);
  const nutWidth = Math.max(2, per * 0.12);
  for (const wire of fretWires(options)) {
    const isNut = wire.fret === 0 && first === 0;
    const w = isNut ? nutWidth : wireWidth;
    shapes.push(
      rectShape(wire.offset - w / 2, neck.y, w, neck.height, isNut ? colors.nut : colors.fretWire),
    );
  }

  // The strings, from their tuning peg to the bridge. They start AT
  // the peg rather than at the left edge, so the labels sit clear of
  // them the way they do on a chart -- a number with a string drawn
  // through it is a number nobody can read.
  const stringStart = options.stringLabels === false ? 0 : head.x + head.width * 0.78;
  for (const line of strings) {
    shapes.push(
      rectShape(
        stringStart,
        line.offset - line.thickness / 2,
        width - stringStart,
        line.thickness,
        colors.string,
      ),
    );
  }

  // The fret numbers, under the board: faint, there to be glanced at
  // rather than read. Only where there is room for them -- on a long
  // neck drawn small, every third fret is the one a player looks for.
  if (options.fretNumbers !== false && layout.numbersY < height) {
    const { last } = fretRange(options);
    // The size a number would like to be, from the strip it is drawn in.
    const wanted = (height - layout.numbersY) * 0.62;
    // A number has to fit ACROSS its own fret -- half the fret width
    // holds two digits -- and it has to stay big enough to read. When
    // a long neck drawn small would shrink them past that, only the
    // frets a player looks for are numbered, and those get the room
    // the three frets between them leave.
    const everyFret = per * 0.5 >= height * 0.035;
    const size = Math.min(wanted, per * (everyFret ? 0.5 : 1.4));
    for (let fret = Math.max(1, first + 1); fret <= last; fret++) {
      if (!everyFret && fret % 3 !== 0 && !inlayFrets(options).some((i) => i.fret === fret))
        continue;
      shapes.push({
        kind: 'text',
        x: fretCenter(fret, options),
        y: layout.numbersY + (height - layout.numbersY) / 2,
        width: per,
        height: height - layout.numbersY,
        fill: colors.fretNumber,
        role: 'fretNumber',
        text: String(fret),
        fontSize: size,
        fontWeight: 700,
        align: 'middle',
        baseline: 'middle',
      });
    }
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
  const colors = resolveColors(options.colors, options.instrument);
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
      if (shape.kind === 'text') {
        return wrap(
          'text',
          {
            x: shape.x,
            y: shape.y,
            'font-size': shape.fontSize,
            'font-weight': shape.fontWeight,
            'font-family': "'Sora', 'Manrope', sans-serif",
            'text-anchor': shape.align ?? 'middle',
            'dominant-baseline':
              shape.baseline === 'middle' ? 'central' : (shape.baseline ?? 'alphabetic'),
            ...common,
          },
          escapeText(shape.text ?? ''),
        );
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
