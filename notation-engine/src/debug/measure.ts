import { getGlyphByChar } from '../glyphs/index.js';
import { estimateTextWidth } from '../geometry/text-metrics.js';

/**
 * Phase 51/§18.3: "`config.debug.drawBoundingBoxes` overlays every
 * element's computed bounding box on the SVG -- the fastest way to
 * diagnose a layout bug."
 *
 * No longer only a debug tool. `config.layout.fitSystemHeight` sizes
 * the finished picture from these same boxes (see `verticalInkSpan`),
 * so this module is now load-bearing on every fitted render.
 *
 * The boxes are measured FROM THE EMITTED SVG rather than collected as
 * the renderer draws. That is a deliberate choice, and the reason is the
 * word "every": the renderer has roughly thirty distinct drawing calls,
 * and threading a collector through all of them would give a debug
 * overlay that (a) needs a new line every time a drawing call is added
 * and (b) can silently disagree with what was actually drawn, which is
 * the one thing a debug overlay must never do. Measuring the output
 * cannot drift from the output -- which is exactly the property the
 * fit needs too: it trims to what was DRAWN, never to a second guess
 * at what a later pass is going to draw.
 *
 * What this costs: a path's box is computed from every coordinate in its
 * `d`, CONTROL POINTS INCLUDED, so a curved tie or slur gets a box that
 * is correct but not tight. Plain (non-SMuFL) text is measured from its
 * font size rather than real font metrics, which this module cannot know
 * without a DOM (`geometry/text-metrics.ts` is the shared estimate, and
 * deliberately a generous one). Both are noted on each box's `approximate` flag rather
 * than hidden.
 */
export interface DebugBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** What produced it -- a SMuFL glyph, a stroke, a filled shape, or ordinary text. */
  readonly kind: 'glyph' | 'line' | 'rect' | 'path' | 'text';
  /** The `data-id` of the nearest enclosing group, when the element sits inside one. */
  readonly id?: string;
  /** True when the box is a correct over-estimate rather than a tight fit (curves, plain text). */
  readonly approximate?: boolean;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * The transforms this engine emits, and only those: a translate, a
 * scale, or the two together. Anything else in a `transform` attribute
 * is ignored rather than half-applied -- a box that is honestly
 * untransformed is better than one moved by a guess.
 */
interface Transform {
  readonly tx: number;
  readonly ty: number;
  readonly sx: number;
  readonly sy: number;
}

const IDENTITY: Transform = { tx: 0, ty: 0, sx: 1, sy: 1 };

function parseTransform(value: string | undefined): Transform {
  if (value === undefined || value === '') return IDENTITY;
  let t = IDENTITY;
  const re = /(translate|scale)\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+))?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    const a = Number(m[2]);
    // SVG's own defaults for the omitted second argument: translate's
    // y is 0, scale's y repeats its x.
    const b = m[3] === undefined ? (m[1] === 'scale' ? a : 0) : Number(m[3]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    t =
      m[1] === 'translate'
        ? compose(t, { tx: a, ty: b, sx: 1, sy: 1 })
        : compose(t, { tx: 0, ty: 0, sx: a, sy: b });
  }
  return t;
}

/** `outer` applied to the result of `inner` -- the order SVG nests them in. */
function compose(outer: Transform, inner: Transform): Transform {
  return {
    tx: outer.tx + outer.sx * inner.tx,
    ty: outer.ty + outer.sy * inner.ty,
    sx: outer.sx * inner.sx,
    sy: outer.sy * inner.sy,
  };
}

function boxFrom(
  b: Bounds,
  kind: DebugBox['kind'],
  id: string | undefined,
  approximate: boolean,
  into: Transform = IDENTITY,
): DebugBox {
  // Both corners through the transform, then min/max again: a negative
  // scale swaps them, and this engine has no business assuming it never
  // will.
  const x1 = into.tx + into.sx * b.minX;
  const x2 = into.tx + into.sx * b.maxX;
  const y1 = into.ty + into.sy * b.minY;
  const y2 = into.ty + into.sy * b.maxY;
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
    kind,
    ...(id !== undefined ? { id } : {}),
    ...(approximate ? { approximate: true } : {}),
  };
}

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m?.[1];
}

function num(tag: string, name: string, fallback = 0): number {
  const raw = attr(tag, name);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Every drawn element in `svg`, as a bounding box in staff-space units.
 *
 * Scans the string element by element, tracking the nearest enclosing
 * `<g data-id="...">` so each box knows which musical event it belongs to
 * (the same id `getEventStream` reports -- see §17.1), and the nearest
 * enclosing `<g transform>`, which IS applied.
 *
 * Applying it matters more than it sounds. The engine emits exactly one
 * transform -- the brace, which is drawn at a scale that stretches it
 * over however many staves it joins -- and leaving it unapplied put the
 * brace's box almost four staff spaces above the top of the picture.
 * As a debug overlay that was a puzzle; for `fitSystemHeight`, which
 * sizes the picture from these boxes, it would have been four spaces of
 * empty air at the top of every grand staff.
 */
export function measureSvgBoxes(svg: string): readonly DebugBox[] {
  const boxes: DebugBox[] = [];
  const idStack: (string | undefined)[] = [];
  const currentId = (): string | undefined => {
    for (let i = idStack.length - 1; i >= 0; i--) {
      const id = idStack[i];
      if (id !== undefined) return id;
    }
    return undefined;
  };
  // The nearest enclosing `<g transform>`, already composed with
  // everything outside it, so a box only ever has one to apply.
  const transformStack: Transform[] = [];
  const currentTransform = (): Transform => transformStack[transformStack.length - 1] ?? IDENTITY;

  // One pass over every tag. `[^>]*` is safe here because this engine
  // produces its own SVG and never puts a '>' inside an attribute value
  // (escapeXmlAttribute in svg-primitives.ts turns it into &gt;).
  const tagRe = /<(\/?)([a-zA-Z]+)([^>]*)>([^<]*)/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(svg)) !== null) {
    const closing = m[1] === '/';
    const name = m[2] ?? '';
    const rest = m[3] ?? '';
    const text = m[4] ?? '';
    const tag = ` ${rest}`;

    if (name === 'g') {
      if (closing) {
        idStack.pop();
        transformStack.pop();
      } else if (!rest.endsWith('/')) {
        idStack.push(attr(tag, 'data-id'));
        transformStack.push(compose(currentTransform(), parseTransform(attr(tag, 'transform'))));
      }
      continue;
    }
    if (closing) continue;

    const id = currentId();
    const into = currentTransform();
    switch (name) {
      case 'line': {
        const x1 = num(tag, 'x1');
        const y1 = num(tag, 'y1');
        const x2 = num(tag, 'x2');
        const y2 = num(tag, 'y2');
        const half = num(tag, 'stroke-width') / 2;
        boxes.push(
          boxFrom(
            {
              minX: Math.min(x1, x2) - half,
              maxX: Math.max(x1, x2) + half,
              minY: Math.min(y1, y2) - half,
              maxY: Math.max(y1, y2) + half,
            },
            'line',
            id,
            false,
            into,
          ),
        );
        break;
      }
      case 'rect': {
        const x = num(tag, 'x');
        const y = num(tag, 'y');
        boxes.push(
          boxFrom(
            { minX: x, minY: y, maxX: x + num(tag, 'width'), maxY: y + num(tag, 'height') },
            'rect',
            id,
            false,
            into,
          ),
        );
        break;
      }
      case 'path': {
        const d = attr(tag, 'd');
        if (d === undefined) break;
        // Every coordinate in the path, as (x, y) pairs. Control points
        // are included, so a curve's box is a correct over-estimate --
        // see this module's own header.
        const nums = d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g);
        if (nums === null || nums.length < 2) break;
        const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const x = Number(nums[i]);
          const y = Number(nums[i + 1]);
          b.minX = Math.min(b.minX, x);
          b.maxX = Math.max(b.maxX, x);
          b.minY = Math.min(b.minY, y);
          b.maxY = Math.max(b.maxY, y);
        }
        if (Number.isFinite(b.minX)) boxes.push(boxFrom(b, 'path', id, true, into));
        break;
      }
      case 'text': {
        const x = num(tag, 'x');
        const y = num(tag, 'y');
        const fontSize = num(tag, 'font-size', 1);
        // A SMuFL glyph is a single character in the font's private-use
        // area, so the lookup itself separates glyph text from ordinary
        // text -- no font-family or font-size check needed, and none that
        // could go stale if either convention ever changed.
        const glyph = text.length > 0 ? getGlyphByChar(text) : undefined;
        const bBox = glyph?.bBox;
        if (bBox !== undefined) {
          // SMuFL bounding boxes are in staff spaces relative to the
          // glyph's own origin, with +y UP -- the SVG's +y is DOWN, which
          // is why NE becomes the top and SW the bottom here.
          boxes.push(
            boxFrom(
              {
                minX: x + bBox.bBoxSW[0],
                maxX: x + bBox.bBoxNE[0],
                minY: y - bBox.bBoxNE[1],
                maxY: y - bBox.bBoxSW[1],
              },
              'glyph',
              id,
              false,
              into,
            ),
          );
        } else if (text.length > 0) {
          boxes.push(
            boxFrom(
              {
                minX: x,
                maxX: x + estimateTextWidth(text, fontSize),
                minY: y - fontSize,
                maxY: y,
              },
              'text',
              id,
              true,
              into,
            ),
          );
        }
        break;
      }
      default:
        break;
    }
  }
  return boxes;
}

/**
 * The topmost and bottommost ink in a rendered system, in staff-space
 * units -- what `config.layout.fitSystemHeight` sizes the picture from.
 *
 * It is `measureSvgBoxes` reduced to two numbers, and it inherits that
 * function's one stated weakness: a curve is measured through its
 * CONTROL points and plain text through an estimate, so both are
 * over-estimates. For a fit that is the right direction to be wrong in
 * -- a slur gets a sliver more air above it than it strictly needs,
 * where the other way round would clip it.
 *
 * `undefined` on a picture with no ink in it at all, which has no span
 * to report and nothing to fit.
 */
export function verticalInkSpan(
  svg: string,
): { readonly top: number; readonly bottom: number } | undefined {
  let top = Infinity;
  let bottom = -Infinity;
  for (const box of measureSvgBoxes(svg)) {
    top = Math.min(top, box.y);
    bottom = Math.max(bottom, box.y + box.height);
  }
  return Number.isFinite(top) && Number.isFinite(bottom) ? { top, bottom } : undefined;
}
