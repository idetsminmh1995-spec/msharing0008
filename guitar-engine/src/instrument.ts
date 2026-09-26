/**
 * instrument.ts — the two ends of the guitar.
 *
 * The middle of the picture is a fretboard, and every guitar's is
 * much the same. What makes one INSTRUMENT different from another is
 * what is at the ends: a headstock with its tuners, and a body with a
 * soundhole or a scratchplate or a pair of humbuckers on it. That is
 * what this file draws, and it is why the page's choice of guitar is
 * worth having rather than decoration.
 *
 * Everything here is shapes and gradients -- no images, no fonts, no
 * effects a canvas cannot paint -- so the video the page exports is
 * the same drawing as the preview.
 */
import { boardHalfAt, guitarLayout, stringLines, stringYAt } from './fretboard.js';
import { circleShape, downward, pathShape, radial, rectShape } from './paint.js';
import type { FretboardOptions, GuitarColors, Instrument, StageShape } from './types.js';

/** What the picked guitar changes about the palette. */
export function modelColors(instrument: Instrument | undefined): Partial<GuitarColors> {
  if (instrument === 'acoustic') return ACOUSTIC_COLORS;
  if (instrument === 'singleCut') return SINGLE_CUT_COLORS;
  return {};
}

/** A maple board takes dots; an ebony one takes the big pearl blocks. */
export function inlayStyle(instrument: Instrument | undefined): 'dot' | 'block' {
  return instrument === 'singleCut' ? 'block' : 'dot';
}

/** Tuners in a row down one side, or three a side. */
export function tunerLayout(instrument: Instrument | undefined): 'inline' | 'threeAside' {
  return instrument === 'electric' || instrument === undefined ? 'inline' : 'threeAside';
}

/**
 * A spruce-topped dreadnought: rosewood board, white dots, gold tuners.
 */
export const ACOUSTIC_COLORS: Partial<GuitarColors> = {
  board: '#43291B',
  boardDark: '#2C1910',
  boardEdge: '#1A0E07',
  neckWood: '#8A5A31',
  neckWoodDark: '#5E3A1E',
  binding: '#EADBB8',
  inlay: '#F1EADD',
  inlayEdge: 'rgba(0,0,0,0.35)',
  headstock: '#3A2418',
  headstockEdge: '#1A0E07',
  peg: '#C9A227',
  pegPost: '#8A6F1C',
  body: '#E0BE85',
  bodyCentre: '#F0D6A5',
  bodyBurst: '#B98C4A',
  bodyEdge: '#5E3A1E',
  pickguard: '#4A2B18',
  pickguardEdge: '#24120A',
  hardware: '#3A2418',
  hardwareDark: '#1A0E07',
  knob: '#F1EADD',
};

/**
 * The single-cut: ebony board with pearl blocks, cream binding, a
 * sunburst top and two humbuckers. The one the owner pointed at.
 */
export const SINGLE_CUT_COLORS: Partial<GuitarColors> = {
  board: '#2A1C14',
  boardDark: '#170E09',
  boardEdge: '#0D0705',
  neckWood: '#6B3F22',
  neckWoodDark: '#452716',
  binding: '#F0E3C3',
  inlay: '#F3EFE4',
  inlayEdge: 'rgba(0,0,0,0.38)',
  headstock: '#241812',
  headstockEdge: '#0D0705',
  peg: '#E3D9C4',
  pegPost: '#A69C88',
  body: '#8A4E18',
  bodyCentre: '#E3A93C',
  bodyBurst: '#311707',
  bodyEdge: '#150A03',
  pickup: '#C9C4BC',
  pickupPole: '#8C877F',
  hardware: '#CFC6B8',
  hardwareDark: '#1A1512',
  knob: '#D9A441',
};

interface Parts {
  readonly options: FretboardOptions;
  readonly colors: GuitarColors;
}

/**
 * The headstock, its tuners, and the strings' own short run to them.
 *
 * Six in a row for the maple-neck electric, three a side for the
 * others -- which is the first thing anyone recognises a guitar by,
 * long before they read the shape of the body.
 */
export function headstockShapes({ options, colors }: Parts): readonly StageShape[] {
  const layout = guitarLayout(options);
  const head = layout.headstock;
  if (!(head.width > 0)) return [];
  const shapes: StageShape[] = [];
  const top = head.y + head.height * 0.1;
  const tall = head.height * 0.8;
  const radius = Math.min(head.width, tall) * 0.3;

  // The face, with the grain running along it and a dark edge under
  // the near side so it does not read as a flat tab.
  shapes.push(
    rectShape(
      head.x,
      top,
      head.width,
      tall,
      downward(top, tall, [
        [0, colors.headstock],
        [0.55, colors.headstock],
        [1, colors.headstockEdge],
      ]),
      { radius, role: 'headstock' },
    ),
  );
  shapes.push(
    rectShape(
      head.x + head.width * 0.06,
      top + tall * 0.12,
      head.width * 0.88,
      tall * 0.1,
      'rgba(255,255,255,0.1)',
      { radius: tall * 0.05 },
    ),
  );

  // The tuners. A post the string winds on, and the button behind
  // it. They live in the RIGHT part of the headstock, because the
  // left is where the string labels go -- a tuner drawn through a
  // number is two things nobody can read.
  const labelled = options.stringLabels !== false;
  const buttonR = Math.max(1.5, Math.min(head.height * 0.09, head.width * 0.09));
  const postR = buttonR * 0.5;
  const inline = tunerLayout(options.instrument) === 'inline';
  const lines = stringLines(options);
  const from = labelled ? 0.56 : 0.2;
  const to = 0.92;
  for (const [index, line] of lines.entries()) {
    const upper = index < lines.length / 2;
    const along = inline
      ? from + (index / Math.max(1, lines.length - 1)) * (to - from)
      : from + ((index % 3) / 2) * (to - from);
    const x = head.x + head.width * along;
    const postY = line.offset;
    // The button sits towards the edge of the head, inside it: on one
    // side for a six-in-line, three each side for the rest.
    const side = inline ? 1 : upper ? 0 : 1;
    const buttonY = side === 0 ? top + buttonR * 1.2 : top + tall - buttonR * 1.2;
    shapes.push(
      rectShape(
        x - postR,
        Math.min(postY, buttonY),
        postR * 2,
        Math.abs(buttonY - postY),
        colors.pegPost,
        { radius: postR, role: 'tuner' },
      ),
    );
    shapes.push(
      circleShape(
        x,
        buttonY,
        buttonR,
        radial(x - buttonR * 0.3, buttonY - buttonR * 0.3, buttonR * 1.6, [
          [0, '#FFFFFF'],
          [0.35, colors.peg],
          [1, colors.pegPost],
        ]),
        { role: 'tuner' },
      ),
    );
    shapes.push(circleShape(x, postY, postR, colors.peg, { role: 'tuner' }));
  }
  return shapes;
}

/**
 * The body, from the neck joint to the right-hand edge.
 *
 * Only the part a player would see past their own fretting hand: the
 * waist, the soundhole or the pickups, and the bridge the strings end
 * at. The neck is drawn over the top of it afterwards, the way the
 * two really join.
 */
export function bodyShapes({ options, colors }: Parts): readonly StageShape[] {
  const layout = guitarLayout(options);
  const body = layout.body;
  if (!(body.width > 0)) return [];
  const model = options.instrument ?? 'electric';
  const geom = bodyGeometry(options, body);
  const shapes: StageShape[] = [];

  // The top. An acoustic is lit spruce, a single-cut is a sunburst,
  // and a plain electric is one colour with a sheen down it.
  const top =
    model === 'acoustic'
      ? radial(geom.at(0.55), geom.middle, geom.visible * 1.1, [
          [0, colors.bodyCentre],
          [0.6, colors.body],
          [1, colors.bodyBurst],
        ])
      : model === 'singleCut'
        ? radial(geom.at(0.55), geom.middle - body.height * 0.05, geom.visible * 1.05, [
            [0, colors.bodyCentre],
            [0.42, colors.body],
            [0.85, colors.bodyBurst],
            [1, colors.bodyEdge],
          ])
        : radial(geom.at(0.4), geom.middle, geom.visible * 1.15, [
            [0, colors.bodyCentre],
            [0.45, colors.body],
            [0.88, colors.bodyBurst],
            [1, colors.bodyEdge],
          ]);

  // The OUTLINE is the instrument: a single-cut's horn where the neck
  // joins, a dreadnought's shoulder, a double-cut's pair of horns. A
  // rounded rectangle reads as a box with a guitar's colours on it,
  // which is exactly what this used to be.
  const outline = bodyOutline(model, geom);
  const bounds = { x: body.x, y: body.y, width: body.width, height: body.height };
  shapes.push(pathShape(outline, bounds, top, { role: 'body' }));
  // The edge: cream binding on the bound instruments, a dark rim on
  // the rest, following the same outline.
  shapes.push(
    pathShape(outline, bounds, 'none', {
      stroke: model === 'electric' ? colors.bodyEdge : colors.binding,
      // Measured against the NECK: the body is much taller, and a
      // binding sized from it reads as a cream frame round a picture.
      strokeWidth: Math.max(1, geom.neckHalf * (model === 'electric' ? 0.05 : 0.085)),
      role: 'body',
    }),
  );

  if (model === 'acoustic') shapes.push(...acousticTop(geom, colors, options));
  else if (model === 'singleCut') shapes.push(...singleCutTop(geom, colors, options));
  else shapes.push(...electricTop(geom, colors, options));

  return shapes;
}

/**
 * The body, measured in what is actually SEEN of it.
 *
 * The body runs off the right-hand edge, so its own box is bigger
 * than the picture. Everything about the shape -- where the horn is,
 * where the pickup sits, how far the bout has got -- is laid out
 * against the VISIBLE part, or it all ends up crowded into a sliver
 * at the left while the interesting half is off-screen.
 */
export interface BodyGeometry {
  readonly x: number;
  readonly y: number;
  readonly height: number;
  /** How much of the body the picture actually shows. */
  readonly visible: number;
  /** A little past the right-hand edge, where the outline leaves. */
  readonly right: number;
  readonly middle: number;
  /** Half the neck's height where it joins, so the waist meets it exactly. */
  readonly neckHalf: number;
  /**
   * How far across the visible part a fraction lands: 0 at the joint,
   * 1 at the right-hand edge of the picture.
   *
   * A field holding a function rather than a method, because every
   * shape here pulls it out of the geometry on its own -- and a
   * method pulled off its object is a method that has lost its
   * `this`.
   */
  readonly at: (fraction: number) => number;
}

function bodyGeometry(
  options: FretboardOptions,
  body: { x: number; y: number; width: number; height: number },
): BodyGeometry {
  const visible = Math.max(1, options.width - body.x);
  const board = guitarLayout(options).board;
  return {
    x: body.x,
    y: body.y,
    height: body.height,
    visible,
    right: body.x + Math.max(visible * 1.05, body.width),
    // The STRINGS' middle, not the body's: the pickups and the bridge
    // sit under the strings, and the body is taller than the neck.
    middle: board.y + board.height / 2,
    neckHalf: boardHalfAt(options, body.x),
    at: (fraction: number) => body.x + visible * fraction,
  };
}

/**
 * The shape of the body, from the neck joint to off the right edge.
 *
 * Drawn as a real outline, in curves: the waist where the neck meets
 * it, the horn (or horns) that make the cutaway, and the bout sweeping
 * out past the frame. The right-hand side leaves the picture on
 * purpose -- what is drawn is the part a player sees past their own
 * fretting hand.
 */
function bodyOutline(model: Instrument, geom: BodyGeometry): string {
  const { x, height, middle, neckHalf, right, at } = geom;
  const top = geom.y + height * 0.04;
  const bottom = geom.y + height * 0.96;
  const jointTop = middle - neckHalf * 1.1;
  const jointBottom = middle + neckHalf * 1.1;

  if (model === 'acoustic') {
    // A dreadnought: no horn, a shoulder that climbs away from the
    // neck and the widest part of the body off to the right.
    return [
      `M${x} ${jointTop}`,
      `C${at(0.1)} ${jointTop - height * 0.16} ${at(0.24)} ${top} ${at(0.55)} ${top}`,
      `L${right} ${top}`,
      `L${right} ${bottom}`,
      `C${at(0.5)} ${bottom} ${at(0.18)} ${bottom} ${at(0.07)} ${bottom - height * 0.06}`,
      `L${x} ${jointBottom}`,
      'Z',
    ].join(' ');
  }

  if (model === 'singleCut') {
    // One horn, on the treble side where the neck joins, with a
    // shallow scoop behind it: the cutaway that gives the shape its
    // name. The tip is rounded -- a pointed one reads as a fin.
    return [
      `M${x} ${jointTop}`,
      `C${at(0.04)} ${jointTop - height * 0.2} ${at(0.14)} ${top + height * 0.06} ${at(0.3)} ${top + height * 0.05}`,
      `C${at(0.42)} ${top + height * 0.05} ${at(0.44)} ${top + height * 0.15} ${at(0.58)} ${top + height * 0.1}`,
      `C${at(0.76)} ${top + height * 0.04} ${at(0.88)} ${top} ${right} ${top}`,
      `L${right} ${bottom}`,
      `C${at(0.68)} ${bottom} ${at(0.28)} ${bottom} ${at(0.12)} ${bottom - height * 0.07}`,
      `L${x} ${jointBottom}`,
      'Z',
    ].join(' ');
  }

  // Double cutaway: a horn above and a horn below, the neck between
  // them, both crests rounded rather than pointed.
  return [
    `M${x} ${jointTop}`,
    `C${at(0.03)} ${jointTop - height * 0.2} ${at(0.1)} ${top + height * 0.06} ${at(0.24)} ${top + height * 0.05}`,
    `C${at(0.36)} ${top + height * 0.05} ${at(0.4)} ${top + height * 0.2} ${at(0.54)} ${top + height * 0.13}`,
    `C${at(0.72)} ${top + height * 0.05} ${at(0.84)} ${top} ${right} ${top}`,
    `L${right} ${bottom}`,
    `C${at(0.8)} ${bottom} ${at(0.56)} ${bottom} ${at(0.42)} ${bottom - height * 0.15}`,
    `C${at(0.3)} ${bottom - height * 0.25} ${at(0.24)} ${bottom - height * 0.03} ${at(0.12)} ${bottom - height * 0.06}`,
    `L${x} ${jointBottom}`,
    'Z',
  ].join(' ');
}

/** Soundhole, rosette, scratchplate and a pinned bridge. */
function acousticTop(
  geom: BodyGeometry,
  colors: GuitarColors,
  options: FretboardOptions,
): readonly StageShape[] {
  const shapes: StageShape[] = [];
  const { middle, height, at, visible } = geom;
  const r = Math.min(visible * 0.3, height * 0.32);
  const cx = at(0.52);

  // The scratchplate tucks under the soundhole, as it does on the real one.
  shapes.push(
    pathShape(
      `M${cx} ${middle - r * 0.2} L${cx + r * 2} ${middle + r * 0.55} L${cx + r * 1.6} ${middle + r * 1.7} L${cx - r * 0.2} ${middle + r * 1.2} Z`,
      { x: cx - r, y: middle, width: r * 3, height: r * 2 },
      colors.pickguard,
      { opacity: 0.9, role: 'pickguard' },
    ),
  );
  // The rosette, then the hole itself, which is a shadow and not a disc.
  shapes.push(circleShape(cx, middle, r * 1.22, colors.rosette, { role: 'soundhole' }));
  shapes.push(circleShape(cx, middle, r * 1.1, colors.body, { role: 'soundhole' }));
  shapes.push(
    circleShape(
      cx,
      middle,
      r,
      radial(cx, middle - r * 0.3, r * 1.6, [
        [0, '#241309'],
        [0.7, colors.soundhole],
        [1, '#000000'],
      ]),
      { role: 'soundhole' },
    ),
  );

  // The bridge, its saddle and six pins.
  const bridgeX = at(0.94);
  const bridgeW = visible * 0.12;
  const bridgeH = height * 0.46;
  shapes.push(
    rectShape(
      bridgeX,
      middle - bridgeH / 2,
      bridgeW,
      bridgeH,
      downward(middle - bridgeH / 2, bridgeH, [
        [0, colors.hardware],
        [1, colors.hardwareDark],
      ]),
      { radius: bridgeW * 0.3, role: 'hardware' },
    ),
  );
  const pinR = Math.max(1, bridgeH * 0.08);
  for (const line of stringLines(options)) {
    shapes.push(
      circleShape(
        bridgeX + bridgeW * 0.62,
        stringYAt(options, line.string, bridgeX),
        pinR,
        colors.knob,
        {
          role: 'hardware',
        },
      ),
    );
  }
  return shapes;
}

/** A scratchplate, three single coils and a six-saddle bridge. */
function electricTop(
  geom: BodyGeometry,
  colors: GuitarColors,
  options: FretboardOptions,
): readonly StageShape[] {
  const shapes: StageShape[] = [];
  const { middle, height, at, visible } = geom;
  // The scratchplate, bowed like the body under it rather than drawn
  // as a pill: a rounded rectangle this big reads as a white blob
  // with a guitar hidden behind it.
  const half = geom.neckHalf * 1.1;
  // It stops short of the bridge and is narrower than the body, so
  // the shape UNDER it still reads as a guitar. A plate drawn over
  // the whole visible body is a white slab with a guitar behind it.
  const plate = [
    `M${at(0.02)} ${middle - half * 0.8}`,
    `C${at(0.12)} ${middle - half * 1.12} ${at(0.4)} ${middle - half * 1.1} ${at(0.7)} ${middle - half * 0.94}`,
    `C${at(0.78)} ${middle - half * 0.88} ${at(0.78)} ${middle + half * 0.88} ${at(0.7)} ${middle + half * 0.94}`,
    `C${at(0.4)} ${middle + half * 1.1} ${at(0.12)} ${middle + half * 1.12} ${at(0.02)} ${middle + half * 0.8}`,
    'Z',
  ].join(' ');
  shapes.push(
    pathShape(
      plate,
      { x: at(0), y: middle - half * 1.2, width: visible, height: half * 2.4 },
      downward(middle - half * 1.2, half * 2.4, [
        [0, '#FFFFFF'],
        [0.5, colors.pickguard],
        [1, colors.pickguardEdge],
      ]),
      { role: 'pickguard' },
    ),
  );

  // Three pickups, leaning the way they do under the strings.
  const pickupW = visible * 0.085;
  const pickupH = geom.neckHalf * 1.55;
  for (const [index, fraction] of [0.14, 0.36, 0.58].entries()) {
    const x = at(fraction);
    const lean = (index - 1) * pickupH * 0.06;
    shapes.push(
      rectShape(
        x,
        middle - pickupH / 2 + lean,
        pickupW,
        pickupH,
        downward(middle - pickupH / 2, pickupH, [
          [0, colors.pickup],
          [0.5, colors.pickup],
          [1, '#A89F8C'],
        ]),
        {
          radius: pickupW * 0.3,
          stroke: '#6E6963',
          strokeWidth: Math.max(0.5, pickupW * 0.08),
          role: 'pickup',
        },
      ),
    );
    for (const line of stringLines(options)) {
      const poleY = stringYAt(options, line.string, x) + lean;
      if (Math.abs(poleY - middle) > pickupH * 0.44) continue;
      shapes.push(
        circleShape(x + pickupW / 2, poleY, Math.max(0.6, pickupW * 0.13), colors.pickupPole, {
          role: 'pickup',
        }),
      );
    }
  }

  // The bridge: a plate with a saddle per string.
  const bridgeX = at(0.94);
  const bridgeW = visible * 0.08;
  shapes.push(
    rectShape(
      bridgeX,
      middle - height * 0.3,
      bridgeW,
      height * 0.6,
      downward(middle - height * 0.3, height * 0.6, [
        [0, '#FFFFFF'],
        [0.4, colors.hardware],
        [1, colors.hardwareDark],
      ]),
      { radius: bridgeW * 0.2, role: 'hardware' },
    ),
  );
  for (const line of stringLines(options)) {
    const y = stringYAt(options, line.string, bridgeX);
    if (Math.abs(y - middle) > height * 0.3) continue;
    shapes.push(
      rectShape(bridgeX, y - height * 0.028, bridgeW, height * 0.056, colors.hardwareDark, {
        radius: height * 0.02,
        role: 'hardware',
      }),
    );
  }
  return shapes;
}

/** Two humbuckers, a tune-o-matic and a stopbar, with the knobs behind them. */
function singleCutTop(
  geom: BodyGeometry,
  colors: GuitarColors,
  options: FretboardOptions,
): readonly StageShape[] {
  const shapes: StageShape[] = [];
  const { middle, height, at, visible } = geom;

  // A knob, up in the horn where the real one sits.
  const knobR = Math.max(2, height * 0.062);
  const knobX = at(0.26);
  const knobY = geom.y + height * 0.14;
  shapes.push(
    circleShape(knobX, knobY, knobR * 1.15, 'rgba(0,0,0,0.35)', { role: 'hardware' }),
    circleShape(
      knobX,
      knobY,
      knobR,
      radial(knobX - knobR * 0.4, knobY - knobR * 0.4, knobR * 1.9, [
        [0, '#FFF6D8'],
        [0.45, colors.knob],
        [1, '#6E4E0E'],
      ]),
      { role: 'hardware' },
    ),
    circleShape(knobX, knobY, knobR * 0.45, 'rgba(0,0,0,0.18)', { role: 'hardware' }),
  );

  // The humbuckers: a black surround with a chrome cover in it, and a
  // pole piece under every string it sits beneath.
  const pickupW = visible * 0.15;
  const pickupH = geom.neckHalf * 1.5;
  for (const fraction of [0.5, 0.84]) {
    const x = at(fraction);
    shapes.push(
      rectShape(
        x - pickupW * 0.12,
        middle - pickupH * 0.66,
        pickupW * 1.24,
        pickupH * 1.32,
        colors.hardwareDark,
        { radius: pickupW * 0.16, role: 'pickup' },
      ),
    );
    shapes.push(
      rectShape(
        x,
        middle - pickupH / 2,
        pickupW,
        pickupH,
        downward(middle - pickupH / 2, pickupH, [
          [0, '#FFFFFF'],
          [0.35, colors.pickup],
          [1, colors.pickupPole],
        ]),
        { radius: pickupW * 0.12, role: 'pickup' },
      ),
    );
    for (const line of stringLines(options)) {
      const y = stringYAt(options, line.string, x);
      if (Math.abs(y - middle) > pickupH * 0.44) continue;
      shapes.push(
        circleShape(x + pickupW * 0.34, y, Math.max(1, pickupW * 0.11), '#5E5852', {
          role: 'pickup',
        }),
      );
    }
  }
  return shapes;
}
