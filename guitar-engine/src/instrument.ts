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
import { guitarLayout, stringLines, stringYAt } from './fretboard.js';
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
  const middle = body.y + body.height / 2;
  const shapes: StageShape[] = [];

  // The top. An acoustic is lit spruce, a single-cut is a sunburst,
  // and a plain electric is one colour with a sheen down it.
  const top =
    model === 'acoustic'
      ? radial(body.x + body.width * 0.55, middle, body.width * 0.9, [
          [0, colors.bodyCentre],
          [0.6, colors.body],
          [1, colors.bodyBurst],
        ])
      : model === 'singleCut'
        ? radial(body.x + body.width * 0.5, middle, body.width * 0.85, [
            [0, colors.bodyCentre],
            [0.45, colors.body],
            [1, colors.bodyBurst],
          ])
        : downward(body.y, body.height, [
            [0, '#2E2E2E'],
            [0.5, colors.body],
            [1, '#050505'],
          ]);
  const corner = Math.min(body.width, body.height) * 0.3;
  shapes.push(
    rectShape(body.x, body.y, body.width, body.height, top, { radius: corner, role: 'body' }),
  );
  // The edge: binding on the bound instruments, a shadow on the rest.
  shapes.push(
    rectShape(body.x, body.y, body.width, body.height, 'none', {
      radius: corner,
      stroke: model === 'electric' ? colors.bodyEdge : colors.binding,
      strokeWidth: Math.max(1, body.height * (model === 'electric' ? 0.02 : 0.035)),
      role: 'body',
    }),
  );

  if (model === 'acoustic') shapes.push(...acousticTop(body, middle, colors, options));
  else if (model === 'singleCut') shapes.push(...singleCutTop(body, middle, colors, options));
  else shapes.push(...electricTop(body, middle, colors, options));

  return shapes;
}

type Box = { x: number; y: number; width: number; height: number };

/** Soundhole, rosette, scratchplate and a pinned bridge. */
function acousticTop(
  body: Box,
  middle: number,
  colors: GuitarColors,
  options: FretboardOptions,
): readonly StageShape[] {
  const shapes: StageShape[] = [];
  const r = Math.min(body.width * 0.26, body.height * 0.3);
  const cx = body.x + body.width * 0.56;

  // The scratchplate tucks under the soundhole, as it does on the real one.
  shapes.push(
    pathShape(
      `M${cx} ${middle - r * 0.2} L${cx + r * 2.1} ${middle + r * 0.5} L${cx + r * 1.7} ${middle + r * 1.7} L${cx - r * 0.2} ${middle + r * 1.2} Z`,
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
  const bridgeX = body.x + body.width * 0.84;
  const bridgeW = body.width * 0.12;
  const bridgeH = body.height * 0.46;
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
  body: Box,
  middle: number,
  colors: GuitarColors,
  options: FretboardOptions,
): readonly StageShape[] {
  const shapes: StageShape[] = [];
  const plateX = body.x + body.width * 0.04;
  const plateW = body.width * 0.78;
  const plateH = body.height * 0.82;
  shapes.push(
    rectShape(
      plateX,
      middle - plateH / 2,
      plateW,
      plateH,
      downward(middle - plateH / 2, plateH, [
        [0, '#FFFFFF'],
        [0.5, colors.pickguard],
        [1, colors.pickguardEdge],
      ]),
      { radius: plateH * 0.28, role: 'pickguard' },
    ),
  );

  // Three pickups, leaning the way they do under the strings.
  const pickupW = plateW * 0.12;
  const pickupH = plateH * 0.6;
  for (const [index, at] of [0.3, 0.52, 0.74].entries()) {
    const x = plateX + plateW * at;
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
  const bridgeX = body.x + body.width * 0.87;
  shapes.push(
    rectShape(
      bridgeX,
      middle - body.height * 0.3,
      body.width * 0.09,
      body.height * 0.6,
      downward(middle - body.height * 0.3, body.height * 0.6, [
        [0, '#FFFFFF'],
        [0.4, colors.hardware],
        [1, colors.hardwareDark],
      ]),
      { radius: body.width * 0.02, role: 'hardware' },
    ),
  );
  for (const line of stringLines(options)) {
    const y = stringYAt(options, line.string, bridgeX);
    if (Math.abs(y - middle) > body.height * 0.3) continue;
    shapes.push(
      rectShape(
        bridgeX,
        y - body.height * 0.028,
        body.width * 0.09,
        body.height * 0.056,
        colors.hardwareDark,
        { radius: body.height * 0.02, role: 'hardware' },
      ),
    );
  }
  return shapes;
}

/** Two humbuckers, a tune-o-matic and a stopbar, with the knobs behind them. */
function singleCutTop(
  body: Box,
  middle: number,
  colors: GuitarColors,
  options: FretboardOptions,
): readonly StageShape[] {
  const shapes: StageShape[] = [];
  const pickupW = body.width * 0.15;
  const pickupH = body.height * 0.54;
  for (const at of [0.3, 0.55]) {
    const x = body.x + body.width * at;
    // The black surround, then the chrome cover on top of it.
    shapes.push(
      rectShape(
        x - pickupW * 0.08,
        middle - pickupH * 0.62,
        pickupW * 1.16,
        pickupH * 1.24,
        colors.hardwareDark,
        { radius: pickupW * 0.14, role: 'pickup' },
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
        { radius: pickupW * 0.1, role: 'pickup' },
      ),
    );
    for (const line of stringLines(options)) {
      const y = stringYAt(options, line.string, x);
      if (Math.abs(y - middle) > pickupH * 0.42) continue;
      shapes.push(
        circleShape(x + pickupW * 0.3, y, Math.max(0.6, pickupW * 0.08), colors.pickupPole, {
          role: 'pickup',
        }),
      );
    }
  }

  // Bridge and tailpiece: two bars the strings run over and end at.
  for (const [at, w] of [
    [0.76, 0.045],
    [0.88, 0.04],
  ] as const) {
    const x = body.x + body.width * at;
    shapes.push(
      rectShape(
        x,
        middle - body.height * 0.28,
        body.width * w,
        body.height * 0.56,
        downward(middle - body.height * 0.28, body.height * 0.56, [
          [0, '#FFFFFF'],
          [0.4, colors.hardware],
          [1, colors.hardwareDark],
        ]),
        { radius: body.width * 0.015, role: 'hardware' },
      ),
    );
  }

  // A pair of knobs, tucked at the bottom where they sit on the real one.
  const knobR = Math.max(1.5, body.height * 0.075);
  for (const at of [0.64, 0.78]) {
    const x = body.x + body.width * at;
    const y = body.y + body.height * 0.9;
    shapes.push(
      circleShape(
        x,
        y,
        knobR,
        radial(x - knobR * 0.4, y - knobR * 0.4, knobR * 1.8, [
          [0, '#FFF3D0'],
          [0.5, colors.knob],
          [1, '#7A5A12'],
        ]),
        { role: 'hardware' },
      ),
    );
  }
  return shapes;
}
