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
  stringYAt,
} from './fretboard.js';
import { fingerColor, resolveColors } from './colors.js';
import { handShapes } from './hand.js';
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
  DEFAULT_COLORS,
  FINGER_COLORS,
  FINGER_NAMES,
  fingerColor,
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

/**
 * The instrument with nothing played on it.
 *
 * Drawn from the back forward, the way it is built: the body, then
 * the headstock, then the neck laid over both of them, then the
 * inlays in the wood, the fret wire on top of those, and the strings
 * over everything.
 */
export function fretboardShapes(options: FretboardOptions): readonly StageShape[] {
  const colors = resolveColors(options.colors);
  const { width, height } = options;
  if (!(width > 0) || !(height > 0)) return [];
  const shapes: StageShape[] = [];

  if (colors.background !== 'none') {
    shapes.push(rectShape(0, 0, width, height, colors.background));
  }

  // A photograph IS the instrument. Everything about the PLAYING is
  // drawn on top of it; nothing about the instrument is drawn at all,
  // because the picture already is one. Without a picture there is no
  // guitar to show, and a diagram of one is not what this engine is
  // for any more: the caller gets the background and nothing else.
  const picture = photoShapes(options);
  if (picture.length === 0) return shapes;
  return [
    ...shapes,
    ...picture,
    ...photoFadeShapes(options),
    ...handLegendShapes(options),
    ...fretNumberShapes(options, colors),
  ];
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
  // A picture shown WHOLE is never cut, so there is never anything to
  // hide -- and a band over an edge that only TOUCHES the frame would
  // fade the guitar for nothing.
  if (place.photo.fit === 'whole') return [];
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
 * The four-colour hand, in the corner under the neck.
 *
 * The video's own legend: the colours on the neck mean nothing until
 * someone is told what they mean, and a hand says it without words.
 * It is drawn INTO the stage rather than laid over it by the page, so
 * the exported video carries it too.
 *
 * It used to sit in the band ABOVE the neck. The guitar has the whole
 * frame now and the notation is printed over the top of it, so that
 * band is the notation's: the hand goes to the bottom left instead,
 * under the fret numbers, which on every one of these guitars is the
 * corner the body has left empty.
 */
function handLegendShapes(options: FretboardOptions): readonly StageShape[] {
  if (options.handLegend !== true) return [];
  const band = guitarLayout(options).hand;
  if (!(band.height > 0)) return [];
  // The corner: from under the neck and its numbers, down to the
  // bottom of the stage.
  const under = boardEdges(options, fretCenter(1, options)).bottom;
  const ceiling = under + boardDepth(options) * 0.75;
  const height = Math.max(band.height, options.height - ceiling) * 0.94;
  const width = height * 0.78;
  const left = band.x + band.width * 0.012;
  const floor = options.height - (options.height - ceiling) * 0.03;
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
        x: left,
        y: Math.max(0, floor - drawn.height),
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
    left,
    Math.max(0, floor - height),
  );
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
  // The numbers ride just under the board itself and lean with it,
  // the way the markers in the wood do -- the board is thinner than
  // the band a strip at the bottom of the box would give them, and it
  // sits wherever the picture puts it.
  //
  // The twenty-second fret is a quarter the width of the first, so a
  // size taken from the narrowest would be a size nobody can read. It
  // comes from the WIDEST, and the crowded end of the neck simply
  // goes unnumbered.
  const size = Math.min(wanted, widestFret(options) * 0.42, boardDepth(options) * 0.3);
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
    // No rule thins these out: the frets are wide at the nut and
    // narrow at the body, so the room test above thins them where
    // they actually crowd and leaves the first frets -- the ones a
    // beginner is reading -- numbered.
    if (room(fret)) chosen.push(fret);
  }
  chosen.sort((a, b) => a - b);

  for (const fret of chosen) {
    const x = fretCenter(fret, options);
    shapes.push({
      kind: 'text',
      x,
      // Under the board, and never off the bottom of the stage: a
      // picture hung low enough would otherwise carry its numbers out
      // of the frame, where nobody can read them.
      y: Math.min(boardEdges(options, x).bottom + size * 0.9, height - size * 0.55),
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
  const colors = resolveColors(options.colors);
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
  const colors = resolveColors(options.colors);
  const struck = stringLines(options).filter((line) => mark.strings.includes(line.string));
  if (struck.length === 0) return [];

  // Over the body, where the picking hand really is -- and clear of
  // the twelfth fret's inlay, which is what it used to sit on. On a
  // photograph the body starts where the board stops, and the mark is
  // sized from the neck it is beside rather than from the band the
  // drawn one fills: a photographed neck is much the thinner of the
  // two.
  const place = photoPlacement(options);
  if (place === undefined) return [];
  const bodyX = place.x + place.photo.boardEndX * place.scale;
  const edges = boardEdges(options, bodyX);
  const height0 = edges.bottom - edges.top;
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
