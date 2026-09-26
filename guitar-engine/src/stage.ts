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
  boardEdgesAt,
  fretCenter,
  fretRange,
  fretWidth,
  fretWires,
  guitarLayout,
  inlayFrets,
  photoPlacement,
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
  CLASSICAL_COLORS,
  DEFAULT_COLORS,
  FINGER_COLORS,
  FINGER_NAMES,
  SINGLE_CUT_COLORS,
  fingerColor,
  instrumentColors,
  resolveColors,
} from './colors.js';

/** The widest a drawing of the hand may be, as a share of the frame. */
const HAND_IMAGE_WIDEST = 0.18;

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
const boardEdges = boardEdgesAt;

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

  // A photograph IS the instrument: there is nothing left for the
  // wood, the frets, the strings or the body to do, and drawing them
  // over the picture would only put a diagram on top of a guitar.
  // Everything about the PLAYING still gets drawn, on top.
  const picture = photoShapes(options);
  if (picture.length > 0) {
    return [
      ...shapes,
      ...picture,
      ...photoFadeShapes(options),
      ...handLegendShapes(options),
      ...fretNumberShapes(options, colors),
    ];
  }

  const parts = { options, colors };
  shapes.push(...bodyShapes(parts));
  shapes.push(...headstockShapes(parts));

  const neck = layout.neck;
  const nutX = neck.x;
  // The board stops just past the joint: a fretboard extension, not a
  // plank laid over the body. It used to run a third of the way
  // across it and hide the horn.
  const endX = Math.min(width, layout.body.x + (width - layout.body.x) * 0.06);
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
 * The photograph, where it goes.
 *
 * One shape, and the only one in the engine a renderer cannot paint
 * from numbers alone. The box is the whole file, scaled: the picture
 * is not cropped to the frame, it is bigger than it, and the frame is
 * a window onto it.
 */
function photoShapes(options: FretboardOptions): readonly StageShape[] {
  const place = photoPlacement(options);
  if (place === undefined) return [];
  return [
    {
      kind: 'image',
      x: place.x,
      y: place.y,
      width: place.photo.width * place.scale,
      height: place.photo.height * place.scale,
      fill: 'none',
      href: place.photo.href,
      role: 'photo',
    },
  ];
}

/**
 * The colour a page asked the picture to be faded into, as numbers.
 *
 * Whatever a page can read off itself: `#112`, `#1A1A1F`, with or
 * without an alpha, or the `rgb(...)` form `getComputedStyle` hands
 * back. A colour that cannot be read, or one that is see-through
 * already, means no fade -- a guess at the colour behind the stage
 * would draw a band of the WRONG colour across the guitar, which is
 * worse than the hard edge it was meant to hide.
 */
function fadeRgb(color: string | undefined): readonly [number, number, number] | undefined {
  if (typeof color !== 'string') return undefined;
  const text = color.trim().toLowerCase();
  if (text === '' || text === 'none' || text === 'transparent') return undefined;

  const hex = /^#([0-9a-f]{3,8})$/.exec(text);
  const digits = hex?.[1];
  if (digits !== undefined) {
    const short = digits.length === 3 || digits.length === 4;
    const wide = digits.length === 6 || digits.length === 8;
    if (!short && !wide) return undefined;
    const step = short ? 1 : 2;
    const at = (i: number): number => {
      const part = digits.slice(i * step, i * step + step);
      const value = Number.parseInt(short ? part + part : part, 16);
      return Number.isFinite(value) ? value : 0;
    };
    // An alpha of zero is see-through, and see-through has no colour.
    if (digits.length === (short ? 4 : 8) && at(3) === 0) return undefined;
    return [at(0), at(1), at(2)];
  }

  const rgb = /^rgba?\(([^)]*)\)$/.exec(text);
  const inside = rgb?.[1];
  if (inside !== undefined) {
    const parts = inside
      .split(/[\s,/]+/)
      .filter((part) => part !== '')
      .map((part) => Number.parseFloat(part));
    const [red, green, blue, alpha] = parts;
    if (red === undefined || green === undefined || blue === undefined) return undefined;
    if (!Number.isFinite(red) || !Number.isFinite(green) || !Number.isFinite(blue)) {
      return undefined;
    }
    if (alpha === 0) return undefined;
    return [red, green, blue];
  }

  return undefined;
}

/** How far a fade band reaches in, as a share of the stage's height. */
const FADE_SHARE = 0.2;

/**
 * How far past the stage's edge a fade band is drawn, in stage units.
 *
 * The band and the picture are cut off at the SAME line -- the SVG's
 * viewBox, the canvas's clip -- and both edges are drawn smoothed, so
 * the band covers that last sliver of picture only partly and a
 * bright hairline of guitar survives along the bottom of the frame.
 * Running the band a little past the edge, where the gradient holds
 * its end colour, leaves the cut to do the cutting.
 */
const FADE_OVERSHOOT = 2;

/**
 * The picture's cut edges, faded into the frame behind it.
 *
 * A photograph scaled to the frame's width is taller than the band
 * the stage gets, so the body runs off the top and the bottom and
 * STOPS -- two hard horizontal lines straight across a guitar, which
 * is the one thing that gives away a picture laid on a page. Over
 * each cut edge goes a band of the colour behind the stage, opaque at
 * the edge and gone by the time it reaches the board, so the
 * instrument comes up out of the background instead of being sliced
 * by it.
 *
 * Only the edges the picture actually crosses get one: a picture that
 * fits has nothing to hide, and a band over an edge that is already
 * background would only dim the frame. The alpha ramp is eased rather
 * than straight, because a straight one reads as a band with a soft
 * side and this reads as nothing at all.
 *
 * Drawn after the picture and before everything else, so the hand,
 * the fret numbers and the marks stay on top of it at full strength.
 */
function photoFadeShapes(options: FretboardOptions): readonly StageShape[] {
  const place = photoPlacement(options);
  if (place === undefined) return [];
  const rgb = fadeRgb(options.fadeTo);
  if (rgb === undefined) return [];

  const { width, height } = options;
  const band = height * FADE_SHARE;
  if (!(band > 0.5)) return [];
  const top = place.y;
  const bottom = place.y + place.photo.height * place.scale;

  const paint = (alpha: number): string =>
    `rgba(${n(rgb[0])}, ${n(rgb[1])}, ${n(rgb[2])}, ${n(alpha)})`;
  // Smoothstep: 1 at the cut edge, 0 where the band ends.
  const ramp = (steps: number): readonly (readonly [number, number])[] =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      return [t, 1 - t * t * (3 - 2 * t)] as const;
    });
  const stops = ramp(6);

  const shapes: StageShape[] = [];
  // Only the edges the picture is CUT at -- the ones that reach the
  // frame's own edge or run past it. A picture whose body ends inside
  // the frame ends at its own outline, and a band over an outline is
  // fog over the guitar rather than a cut hidden.
  if (top <= 1) {
    shapes.push(
      rectShape(
        0,
        -FADE_OVERSHOOT,
        width,
        band + FADE_OVERSHOOT,
        downward(
          0,
          band,
          stops.map(([offset, alpha]) => [offset, paint(alpha)] as const),
        ),
        { role: 'photoFade' },
      ),
    );
  }
  if (bottom >= height - 1) {
    shapes.push(
      rectShape(
        0,
        height - band,
        width,
        band + FADE_OVERSHOOT,
        downward(
          height - band,
          band,
          stops.map(([offset, alpha]) => [1 - offset, paint(alpha)] as const).reverse(),
        ),
        { role: 'photoFade' },
      ),
    );
  }
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
  // A photographed neck is thinner than the band the drawn one fills,
  // which leaves the legend stranded half a frame above the guitar it
  // is explaining. It gets the whole gap instead, down to the board
  // itself -- bigger, and beside the neck rather than adrift over it.
  const floor =
    photoPlacement(options) !== undefined
      ? boardEdges(options, fretCenter(1, options)).top
      : band.y + band.height;
  const height = Math.max(band.height, floor - band.y) * 0.94;
  const width = height * 0.78;
  // A drawing of the hand, when the caller has one, in the same place
  // and at the same size the built-in hand would have taken. Its own
  // shape is kept -- a hand squashed to fit a box stops looking like
  // a hand -- and it is never allowed to grow across the frame.
  const picture = options.handImage;
  if (picture !== undefined && picture.width > 0 && picture.height > 0) {
    const scale = Math.min(
      height / picture.height,
      (options.width * HAND_IMAGE_WIDEST) / picture.width,
    );
    const drawn = { width: picture.width * scale, height: picture.height * scale };
    return [
      {
        kind: 'image',
        x: band.x + band.width * 0.012,
        y: band.y + (Math.max(band.height, floor - band.y) - drawn.height) / 2,
        width: drawn.width,
        height: drawn.height,
        fill: 'none',
        href: picture.href,
        role: 'handLegend',
      },
    ];
  }
  return translateShapes(
    handShapes({ width, height, handColor: '#F6EDE6', outline: 'rgba(0,0,0,0.35)' }),
    band.x + band.width * 0.012,
    band.y + (band.height - height) / 2,
  );
}

/** The dots, or the pearl blocks, set into the wood under the strings. */
function inlayShapes(options: FretboardOptions, colors: GuitarColors): readonly StageShape[] {
  const style = inlayStyle(options.instrument);
  // A classical board has nothing in it at all, and that is the
  // instrument rather than a shortcut.
  if (style === 'none') return [];
  const shapes: StageShape[] = [];
  const gap = stringGap(options);
  const block = style === 'block';
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
  // A drawn neck leaves a strip at the bottom of the box for these.
  // A photographed one does not: its board is thinner and sits where
  // the picture puts it, so the numbers ride just under the board
  // itself and lean with it, the way the markers on a neck do.
  const photographed = photoPlacement(options) !== undefined;
  // Drawn, every fret is the same width and one size fits all of
  // them. Photographed, the twentieth fret is a quarter the width of
  // the first: a size taken from the narrowest would be a size nobody
  // can read, so it comes from the WIDEST and the crowded end of the
  // neck simply goes unnumbered.
  const size = photographed
    ? Math.min(wanted, widestFret(options) * 0.42, boardDepth(options) * 0.3)
    : Math.min(wanted, per * (everyFret ? 0.5 : 1.4));
  const shapes: StageShape[] = [];

  // Two numbers on top of each other are two numbers nobody can
  // read, so each one has to find room. The frets a player LOOKS for
  // -- the ones with a marker in the wood -- get first refusal on the
  // space; the rest fill in wherever they still fit.
  const taken: { from: number; to: number }[] = [];
  const room = (fret: number): boolean => {
    const x = fretCenter(fret, options);
    const ink = size * 0.62 * String(fret).length + size * 0.24;
    const from = x - ink / 2;
    const to = x + ink / 2;
    if (taken.some((span) => from < span.to && to > span.from)) return false;
    taken.push({ from, to });
    return true;
  };
  const landmark = new Set(inlayFrets(options).map((inlay) => inlay.fret));
  const chosen: number[] = [];
  for (let fret = Math.max(1, first + 1); fret <= last; fret++) {
    if (landmark.has(fret) && room(fret)) chosen.push(fret);
  }
  for (let fret = Math.max(1, first + 1); fret <= last; fret++) {
    if (landmark.has(fret)) continue;
    // A drawn neck thins the numbers out by rule, because its frets
    // are all one width and either they all fit or none of them do. A
    // photograph does not need the rule: its frets are wide at the nut
    // and narrow at the body, so the room test above thins them where
    // they actually crowd and leaves the first frets -- the ones a
    // beginner is reading -- numbered.
    if (!everyFret && !photographed && fret % 3 !== 0) continue;
    if (room(fret)) chosen.push(fret);
  }
  chosen.sort((a, b) => a - b);

  for (const fret of chosen) {
    const x = fretCenter(fret, options);
    shapes.push({
      kind: 'text',
      x,
      y: photographed
        ? boardEdges(options, x).bottom + size * 0.9
        : layout.numbersY + (height - layout.numbersY) / 2,
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
 * How deep the board is at the nut.
 *
 * A photographed neck is a good deal thinner than the band a drawn
 * one fills, and a number sized from the empty space under it would
 * be a number bigger than the guitar's own fret markers. This is what
 * the numbers belong to, so this is what they are sized from.
 */
function boardDepth(options: FretboardOptions): number {
  const edges = boardEdges(options, fretCenter(1, options));
  return Math.max(1, edges.bottom - edges.top);
}

/** The widest fret in the picture: the one with room to spare. */
function widestFret(options: FretboardOptions): number {
  const wires = fretWires(options);
  let widest = 0;
  for (let index = 1; index < wires.length; index++) {
    const a = wires[index - 1] as { offset: number };
    const b = wires[index] as { offset: number };
    widest = Math.max(widest, b.offset - a.offset);
  }
  return widest > 0 ? widest : fretWidth(options);
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
    // A picture whose neck runs in from the left edge has its nut off
    // that edge, and an OPEN string is played at the nut. Drawing it
    // where the nut really is puts it outside the frame, where it
    // teaches nobody anything; held at the edge it is at least on the
    // right string, pointing the way the nut went.
    const x = Math.max(size * 0.6, fretCenter(position.fret, options));
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

  // Over the body, where the picking hand really is -- and clear of
  // the twelfth fret's inlay, which is what it used to sit on. On a
  // photograph the body starts where the board stops, and the mark is
  // sized from the neck it is beside rather than from the band the
  // drawn one fills: a photographed neck is much the thinner of the
  // two.
  const place = photoPlacement(options);
  const bodyX = place === undefined ? layout.body.x : place.x + place.photo.boardEndX * place.scale;
  const edges = boardEdges(options, bodyX);
  const height0 = place === undefined ? layout.board.height : edges.bottom - edges.top;
  const width = height0 * 0.13;
  const centreX = bodyX + width * 0.9;
  const ys = struck.map((line) => stringYAt(options, line.string, centreX));
  const first = Math.min(...ys);
  const last = Math.max(...ys);
  const centreY = (first + last) / 2;
  const spread = last - first;
  const height = Math.max(height0 * 0.2, spread + height0 * 0.08);
  // Fingers do not strike the strings together, so there is no one
  // stroke to draw: each string gets the letter of the finger that
  // takes it, which is how fingerstyle has always been written.
  if (options.picking === 'fingers') {
    return fingerstyleShapes(struck, options, colors, centreX, mark.age);
  }

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

/**
 * p, i, m and a -- one letter per string, on the string.
 *
 * The right hand's own notation, and the only one that says anything
 * useful about fingerstyle: the thumb takes the basses and the three
 * fingers take the top three, so WHICH string a letter is on is the
 * whole instruction. Each sits on a dark disc, because a letter alone
 * would be lost against a rosette or a scratchplate.
 */
function fingerstyleShapes(
  struck: readonly { string: number }[],
  options: FretboardOptions,
  colors: GuitarColors,
  centreX: number,
  age: number,
): readonly StageShape[] {
  const gap = stringGap(options);
  const size = gap * 1.3;
  const shapes: StageShape[] = [];
  const fade = 1 - age;
  const ys = struck.map((line) => stringYAt(options, line.string, centreX));
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  // ONE dark plaque behind the letters rather than a disc under each:
  // p, i, m and a are often on four strings in a row, and four discs
  // a string apart overlap into a blob.
  shapes.push(
    rectShape(
      centreX - size * 0.6,
      top - size * 0.62,
      size * 1.2,
      bottom - top + size * 1.24,
      'rgba(0,0,0,0.5)',
      { radius: size * 0.55, opacity: 0.92 * fade, role: 'pickStroke' },
    ),
  );
  for (const [index, line] of struck.entries()) {
    const y = ys[index] as number;
    shapes.push({
      kind: 'text',
      x: centreX,
      y,
      width: size,
      height: size,
      fill: colors.pick,
      opacity: 0.98 * fade,
      role: 'pickStroke',
      text: pluckingFinger(line.string),
      fontSize: size,
      fontWeight: 800,
      align: 'middle',
      baseline: 'middle',
    });
  }
  return shapes;
}

/**
 * Which finger plucks a string.
 *
 * a on the first, m on the second, i on the third, and the thumb on
 * everything below -- the assignment every classical method opens
 * with, and the one a player's hand falls into on its own.
 */
function pluckingFinger(string: number): string {
  if (string === 1) return 'a';
  if (string === 2) return 'm';
  if (string === 3) return 'i';
  return 'p';
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
      if (shape.kind === 'image') {
        // No fill: an image is not painted with one, and an SVG
        // renderer that is handed `fill="none"` here draws nothing.
        return tag('image', {
          href: shape.href ?? '',
          x: shape.x,
          y: shape.y,
          width: shape.width,
          height: shape.height,
          preserveAspectRatio: 'none',
          ...(shape.opacity !== undefined ? { opacity: shape.opacity } : {}),
        });
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
