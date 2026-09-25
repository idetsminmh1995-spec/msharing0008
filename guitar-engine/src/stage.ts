/**
 * stage.ts — the guitar, and the notes lit on it.
 *
 * A frame is described ONCE, as a list of shapes (`stageShapes`), and
 * written out however the caller draws: as SVG for a page, or painted
 * onto a canvas for a video. Neither renderer decides what a frame
 * looks like, so neither can drift from the other.
 *
 * The picture is meant to read as an INSTRUMENT, not as a fretboard
 * diagram: a headstock with its tuners, a neck that widens towards the
 * body the way a real one does, wood with grain in it, fret wire that
 * catches the light, and a body with a soundhole or a scratchplate or
 * a pair of humbuckers on it. All of it is shapes and gradients, so
 * the exported video paints exactly what the preview drew.
 */
import {
  boardHalfAt,
  fretCenter,
  fretRange,
  fretWidth,
  fretWires,
  guitarLayout,
  inlayFrets,
  positionsAt,
  stringLines,
  stringName,
  stringYAt,
  tuningFor,
} from './fretboard.js';
import { fingerColor, resolveColors } from './colors.js';
import { handShapes } from './hand.js';
import { bodyShapes, headstockShapes, inlayStyle } from './instrument.js';
import { circleShape, downward, pathShape, radial, rectShape, translateShapes } from './paint.js';
import { GradientBank, escapeText, n, tag, wrap } from './svg.js';
import type {
  FretboardOptions,
  GuitarColors,
  GuitarStageOptions,
  LivePosition,
  PickMark,
  StageShape,
} from './types.js';

// The palette lives next door so the hand legend can read it too; it
// is re-exported here because this is where callers have always found
// it.
export {
  ACOUSTIC_COLORS,
  DEFAULT_COLORS,
  FINGER_COLORS,
  FINGER_NAMES,
  SINGLE_CUT_COLORS,
  fingerColor,
  instrumentColors,
  resolveColors,
} from './colors.js';

/** How big a played mark is, as a fraction of the gap between two strings. */
const MARK_SIZE = 1.5;

/** The gap between two strings at the nut, which everything is sized against. */
function stringGap(options: FretboardOptions): number {
  const lines = stringLines(options);
  return lines.length > 1
    ? (lines[1] as { offset: number }).offset - (lines[0] as { offset: number }).offset
    : guitarLayout(options).board.height / 6;
}

/** The edges of the board at a point along it: the wood outside the outer strings. */
function boardEdges(options: FretboardOptions, x: number): { top: number; bottom: number } {
  const board = guitarLayout(options).board;
  const middle = board.y + board.height / 2;
  const half = boardHalfAt(options, x);
  return { top: middle - half, bottom: middle + half };
}

/** A tapered strip down the neck: the same shape the board itself is. */
function taperedPath(
  fromX: number,
  toX: number,
  topAt: (x: number) => number,
  bottomAt: (x: number) => number,
): string {
  return [
    `M${fromX} ${topAt(fromX)}`,
    `L${toX} ${topAt(toX)}`,
    `L${toX} ${bottomAt(toX)}`,
    `L${fromX} ${bottomAt(fromX)}`,
    'Z',
  ].join(' ');
}

/**
 * The instrument with nothing played on it.
 *
 * Drawn from the back forward, the way it is built: the body, then
 * the headstock, then the neck laid over both of them, then the
 * inlays in the wood, the fret wire on top of those, and the strings
 * over everything.
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

  const parts = { options, colors };
  shapes.push(...bodyShapes(parts));
  shapes.push(...headstockShapes(parts));

  const neck = layout.neck;
  const nutX = neck.x;
  const endX = Math.min(width, layout.body.x + layout.body.width * 0.3);
  const gap = stringGap(options);
  const bound = options.instrument === 'acoustic' || options.instrument === 'singleCut';

  // The neck's own wood, a little proud of the board on both sides --
  // what you see of the back of the neck from in front.
  const wood = (x: number) => boardEdges(options, x);
  const woodTop = (x: number) => wood(x).top - gap * 0.22;
  const woodBottom = (x: number) => wood(x).bottom + gap * 0.22;
  shapes.push(
    pathShape(
      taperedPath(nutX, endX, woodTop, woodBottom),
      { x: nutX, y: 0, width: endX - nutX, height },
      downward(0, height, [
        [0, colors.neckWood],
        [0.55, colors.neckWood],
        [1, colors.neckWoodDark],
      ]),
      { role: 'neck' },
    ),
  );

  // The board: the dark (or maple) face the frets are set into, with
  // the light running down it so the wood is not a flat block.
  shapes.push(
    pathShape(
      taperedPath(
        nutX,
        endX,
        (x) => wood(x).top,
        (x) => wood(x).bottom,
      ),
      { x: nutX, y: 0, width: endX - nutX, height },
      downward(0, height, [
        [0, colors.boardDark],
        [0.18, colors.board],
        [0.75, colors.board],
        [1, colors.boardEdge],
      ]),
      { role: 'board' },
    ),
  );

  // Cream binding down both edges of a bound neck.
  if (bound) {
    const thickness = Math.max(1, gap * 0.16);
    for (const edge of ['top', 'bottom'] as const) {
      const at = (x: number) => (edge === 'top' ? wood(x).top : wood(x).bottom);
      shapes.push(
        pathShape(
          taperedPath(
            nutX,
            endX,
            (x) => (edge === 'top' ? at(x) : at(x) - thickness),
            (x) => (edge === 'top' ? at(x) + thickness : at(x)),
          ),
          { x: nutX, y: 0, width: endX - nutX, height },
          colors.binding,
          { role: 'binding' },
        ),
      );
    }
  }

  shapes.push(...handLegendShapes(options));
  shapes.push(...inlayShapes(options, colors));
  shapes.push(...fretShapes(options, colors));
  shapes.push(...stringShapes(options, colors, endX));
  shapes.push(...stringLabelShapes(options, colors));
  shapes.push(...fretNumberShapes(options, colors));

  return shapes;
}

/**
 * The four-colour hand, in the band above the neck.
 *
 * The video's own legend: the colours on the neck mean nothing until
 * someone is told what they mean, and a hand says it without words.
 * It is drawn INTO the stage rather than laid over it by the page, so
 * the exported video carries it too.
 */
function handLegendShapes(options: FretboardOptions): readonly StageShape[] {
  if (options.handLegend !== true) return [];
  const band = guitarLayout(options).hand;
  if (!(band.height > 0)) return [];
  const height = band.height * 0.94;
  const width = height * 0.78;
  return translateShapes(
    handShapes({ width, height, handColor: '#F6EDE6', outline: 'rgba(0,0,0,0.35)' }),
    band.x + band.width * 0.012,
    band.y + (band.height - height) / 2,
  );
}

/** The dots, or the pearl blocks, set into the wood under the strings. */
function inlayShapes(options: FretboardOptions, colors: GuitarColors): readonly StageShape[] {
  const shapes: StageShape[] = [];
  const gap = stringGap(options);
  const block = inlayStyle(options.instrument) === 'block';
  const per = fretWidth(options);

  for (const inlay of inlayFrets(options)) {
    const cx = fretCenter(inlay.fret, options);
    const edges = boardEdges(options, cx);
    const middle = (edges.top + edges.bottom) / 2;
    const half = (edges.bottom - edges.top) / 2;

    if (block) {
      // A trapezoid, wider at the bottom, like the real inlay.
      const w = Math.min(per * 0.62, half * 1.5);
      const h = half * 0.72;
      const lean = w * 0.12;
      shapes.push(
        pathShape(
          `M${cx - w / 2 + lean} ${middle - h} L${cx + w / 2 - lean} ${middle - h} L${cx + w / 2} ${middle + h} L${cx - w / 2} ${middle + h} Z`,
          { x: cx - w / 2, y: middle - h, width: w, height: h * 2 },
          radial(cx - w * 0.2, middle - h * 0.4, w, [
            [0, '#FFFFFF'],
            [0.55, colors.inlay],
            [1, '#CFC7B6'],
          ]),
          { role: 'inlay' },
        ),
      );
      continue;
    }

    const r = Math.max(2, gap * 0.36);
    const at = inlay.double ? [-gap * 1.1, gap * 1.1] : [0];
    for (const dy of at) {
      shapes.push(
        circleShape(cx, middle + dy, r, colors.inlay, { role: 'inlay' }),
        circleShape(cx, middle + dy, r * 0.62, 'rgba(255,255,255,0.12)', { role: 'inlay' }),
      );
    }
  }
  return shapes;
}

/** The nut, and a fret wire per fret -- each one as long as the board is wide there. */
function fretShapes(options: FretboardOptions, colors: GuitarColors): readonly StageShape[] {
  const shapes: StageShape[] = [];
  const per = fretWidth(options);
  const { first } = fretRange(options);
  const wireWidth = Math.max(1.2, per * 0.055);
  const nutWidth = Math.max(2.5, per * 0.14);

  for (const wire of fretWires(options)) {
    const isNut = wire.fret === 0 && first === 0;
    const w = isNut ? nutWidth : wireWidth;
    const edges = boardEdges(options, wire.offset);
    const top = edges.top - (isNut ? 0 : 0);
    const bottom = edges.bottom;
    if (isNut) {
      shapes.push(
        rectShape(
          wire.offset - w / 2,
          top,
          w,
          bottom - top,
          downward(top, bottom - top, [
            [0, '#FFFFFF'],
            [0.5, colors.nut],
            [1, '#C6B79A'],
          ]),
          { radius: w * 0.3, role: 'nut' },
        ),
      );
      continue;
    }
    // Two strips: the lit face of the wire, and the shadow under it.
    shapes.push(
      rectShape(
        wire.offset - w / 2,
        top,
        w,
        bottom - top,
        downward(top, bottom - top, [
          [0, colors.fretWire],
          [0.45, '#FFFFFF'],
          [1, '#8E877E'],
        ]),
        { role: 'fret' },
      ),
    );
    shapes.push(
      rectShape(
        wire.offset + w / 2,
        top,
        Math.max(0.6, w * 0.45),
        bottom - top,
        colors.fretShadow,
        {
          role: 'fret',
        },
      ),
    );
  }
  return shapes;
}

/**
 * The strings, from the nut to the bridge.
 *
 * Each one is a tapered strip rather than a rectangle, because the
 * strings fan out as they go: drawing them parallel is the single
 * thing that makes a picture of a neck look like a ladder.
 */
function stringShapes(
  options: FretboardOptions,
  colors: GuitarColors,
  endX: number,
): readonly StageShape[] {
  const shapes: StageShape[] = [];
  // They start at the tuning post, so a numbered label at the head
  // sits clear of them -- a number with a string drawn through it is
  // a number nobody can read.
  const head = guitarLayout(options).headstock;
  // They start where they wind onto the tuners, not at the edge of
  // the picture: a string drawn across the headstock's face is the
  // one thing that makes it stop looking like a headstock.
  const startX = head.x + head.width * 0.62;
  const toX = Math.max(endX, options.width);

  for (const line of stringLines(options)) {
    const y0 = stringYAt(options, line.string, startX);
    const y1 = stringYAt(options, line.string, toX);
    const t = line.thickness;
    shapes.push(
      pathShape(
        `M${startX} ${y0 - t / 2} L${toX} ${y1 - t / 2} L${toX} ${y1 + t / 2} L${startX} ${y0 + t / 2} Z`,
        {
          x: startX,
          y: Math.min(y0, y1) - t,
          width: toX - startX,
          height: Math.abs(y1 - y0) + t * 2,
        },
        colors.string,
        { role: 'string' },
      ),
    );
    // A hair of light along the top of the string.
    shapes.push(
      pathShape(
        `M${startX} ${y0 - t / 2} L${toX} ${y1 - t / 2} L${toX} ${y1 - t * 0.2} L${startX} ${y0 - t * 0.2} Z`,
        { x: startX, y: Math.min(y0, y1) - t, width: toX - startX, height: Math.abs(y1 - y0) + t },
        colors.stringShine,
        { role: 'string' },
      ),
    );
  }
  return shapes;
}

/**
 * The numbered circle and the note name at the head of each string.
 *
 * A reader who knows "the D string" should not have to count lines to
 * find it, and the number is the one every tab and every teacher
 * uses -- 1 for the thinnest.
 */
function stringLabelShapes(options: FretboardOptions, colors: GuitarColors): readonly StageShape[] {
  if (options.stringLabels === false) return [];
  const gutter = guitarLayout(options).labels;
  if (!(gutter.width > 0)) return [];
  const gap = stringGap(options);
  const tuning = tuningFor(options);
  const badgeR = Math.min(gap * 0.46, gutter.width * 0.38);
  const labelSize = badgeR * 1.5;
  const shapes: StageShape[] = [];

  for (const line of stringLines(options)) {
    const midi = tuning[line.string - 1];
    const x = gutter.x + gutter.width * 0.32;
    shapes.push(circleShape(x, line.offset, badgeR, colors.stringLabel, { role: 'stringLabel' }));
    shapes.push({
      kind: 'text',
      x,
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
        x: gutter.x + gutter.width * 0.72,
        y: line.offset,
        width: gutter.width * 0.6,
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
  return shapes;
}

/**
 * The fret numbers, under the board: faint, there to be glanced at
 * rather than read. Only where there is room for them -- on a long
 * neck drawn small, every third fret is the one a player looks for.
 */
function fretNumberShapes(options: FretboardOptions, colors: GuitarColors): readonly StageShape[] {
  const { height } = options;
  const layout = guitarLayout(options);
  if (options.fretNumbers === false || layout.numbersY >= height) return [];
  const per = fretWidth(options);
  const { first, last } = fretRange(options);
  // The size a number would like to be, from the strip it is drawn in.
  const wanted = (height - layout.numbersY) * 0.62;
  // A number has to fit ACROSS its own fret -- half the fret width
  // holds two digits -- and it has to stay big enough to read. When a
  // long neck drawn small would shrink them past that, only the frets
  // a player looks for are numbered, and those get the room the three
  // frets between them leave.
  const everyFret = per * 0.5 >= height * 0.035;
  const size = Math.min(wanted, per * (everyFret ? 0.5 : 1.4));
  const shapes: StageShape[] = [];

  for (let fret = Math.max(1, first + 1); fret <= last; fret++) {
    if (!everyFret && fret % 3 !== 0 && !inlayFrets(options).some((i) => i.fret === fret)) continue;
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
  const strings = new Set(stringLines(options).map((line) => line.string));
  const size = stringGap(options) * MARK_SIZE;
  const { first, last } = fretRange(options);

  const shapes: StageShape[] = [];
  for (const position of positions) {
    if (!strings.has(position.string)) continue;
    if (position.fret < first || position.fret > last) continue;
    const color = fingerColor(position.finger, colors);
    const x = fretCenter(position.fret, options);
    const y = stringYAt(options, position.string, x);

    if (position.sliding) {
      const fromX = fretCenter(position.fromFret, options);
      const left = Math.min(fromX, x);
      const right = Math.max(fromX, x);
      shapes.push(
        rectShape(left, y - size * 0.22, Math.max(size * 0.2, right - left), size * 0.44, color, {
          radius: size * 0.22,
          opacity: 0.55,
          role: 'mark',
        }),
      );
    }
    // A dot with a highlight in it, so it reads as a fingertip on the
    // string rather than a sticker on a diagram.
    shapes.push(
      circleShape(
        x,
        y,
        size / 2,
        radial(x - size * 0.18, y - size * 0.18, size * 0.9, [
          [0, 'rgba(255,255,255,0.55)'],
          [0.45, color],
          [1, color],
        ]),
        { role: 'mark' },
      ),
    );
  }
  return shapes;
}

/** A whole frame: the neck, then what is played on it. */
export function stageShapes(options: GuitarStageOptions): readonly StageShape[] {
  const positions = positionsAt(options.notes ?? [], options.seconds);
  return [
    ...fretboardShapes(options),
    ...markShapes(positions, options),
    ...pickShapes(options.pick, options),
  ];
}

/**
 * [D-004/RH-P01] The picking hand's stroke, drawn where the hand is.
 *
 * Two marks, and they are not arrows: a down-stroke is the square
 * bracket and an up-stroke the V that every guitarist has read above a
 * stave since they started. An arrow would have to point somewhere,
 * and which way "down" points on a screen depends on which end of the
 * neck the thin string is drawn at -- these do not care.
 *
 * It fades rather than blinking off, so a still frame taken just after
 * a note still shows what the right hand did.
 */
export function pickShapes(
  mark: PickMark | undefined,
  options: FretboardOptions,
): readonly StageShape[] {
  if (mark === undefined || mark.age >= 1) return [];
  const colors = resolveColors(options.colors, options.instrument);
  const layout = guitarLayout(options);
  const struck = stringLines(options).filter((line) => mark.strings.includes(line.string));
  if (struck.length === 0) return [];

  const height0 = layout.board.height;
  const width = height0 * 0.13;
  // Over the body, where the picking hand really is -- and clear of
  // the twelfth fret's inlay, which is what it used to sit on.
  const centreX = layout.body.x + width * 0.9;
  const ys = struck.map((line) => stringYAt(options, line.string, centreX));
  const first = Math.min(...ys);
  const last = Math.max(...ys);
  const centreY = (first + last) / 2;
  const spread = last - first;
  const height = Math.max(height0 * 0.2, spread + height0 * 0.08);
  const thickness = Math.max(1.5, width * 0.24);
  const d =
    mark.direction === 'down'
      ? downStrokePath(centreX, centreY, width, height, thickness)
      : upStrokePath(centreX, centreY, width, height, thickness);
  const halo =
    mark.direction === 'down'
      ? downStrokePath(centreX, centreY, width * 1.28, height * 1.18, thickness * 1.5)
      : upStrokePath(centreX, centreY, width * 1.28, height * 1.18, thickness * 1.5);
  const bounds = { x: centreX - width, y: centreY - height, width: width * 2, height: height * 2 };

  // A dark mark behind the light one, so the stroke reads on a black
  // scratchplate and on a spruce top alike.
  return [
    pathShape(halo, bounds, 'rgba(0,0,0,0.55)', {
      opacity: 0.92 * (1 - mark.age),
      role: 'pickStroke',
    }),
    pathShape(d, bounds, colors.pick, { opacity: 0.95 * (1 - mark.age), role: 'pickStroke' }),
  ];
}

/** The square bracket: down. */
function downStrokePath(cx: number, cy: number, w: number, h: number, t: number): string {
  const left = cx - w / 2;
  const right = cx + w / 2;
  const top = cy - h / 2;
  const bottom = cy + h / 2;
  return [
    `M${left} ${bottom}`,
    `L${left} ${top}`,
    `L${right} ${top}`,
    `L${right} ${bottom}`,
    `L${right - t} ${bottom}`,
    `L${right - t} ${top + t}`,
    `L${left + t} ${top + t}`,
    `L${left + t} ${bottom}`,
    'Z',
  ].join(' ');
}

/** The V: up. */
function upStrokePath(cx: number, cy: number, w: number, h: number, t: number): string {
  const left = cx - w / 2;
  const right = cx + w / 2;
  const top = cy - h / 2;
  const bottom = cy + h / 2;
  return [
    `M${left} ${top}`,
    `L${left + t} ${top}`,
    `L${cx} ${bottom - t * 0.8}`,
    `L${right - t} ${top}`,
    `L${right} ${top}`,
    `L${cx} ${bottom}`,
    'Z',
  ].join(' ');
}

function shapesToSvg(shapes: readonly StageShape[], width: number, height: number): string {
  const gradients = new GradientBank();
  const body = shapes
    .map((shape) => {
      const common = {
        fill: gradients.paint(shape.fill),
        ...(shape.stroke !== undefined ? { stroke: shape.stroke } : {}),
        ...(shape.strokeWidth !== undefined ? { 'stroke-width': shape.strokeWidth } : {}),
        ...(shape.opacity !== undefined ? { opacity: shape.opacity } : {}),
      };
      if (shape.kind === 'circle') {
        return tag('circle', { cx: shape.x, cy: shape.y, r: shape.width / 2, ...common });
      }
      if (shape.kind === 'path') {
        return tag('path', { d: shape.d ?? '', ...common });
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
  // The defs go in first, because a fill cannot point at a gradient
  // the reader has not met yet.
  return wrap(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${n(width)} ${n(height)}`,
      width,
      height,
      preserveAspectRatio: 'none',
    },
    gradients.finish(body),
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
