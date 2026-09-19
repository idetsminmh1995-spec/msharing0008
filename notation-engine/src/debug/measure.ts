import { getGlyphByChar } from '../glyphs/index.js';

/**
 * Phase 51/§18.3: "`config.debug.drawBoundingBoxes` overlays every
 * element's computed bounding box on the SVG -- the fastest way to
 * diagnose a layout bug."
 *
 * The boxes are measured FROM THE EMITTED SVG rather than collected as
 * the renderer draws. That is a deliberate choice, and the reason is the
 * word "every": the renderer has roughly thirty distinct drawing calls,
 * and threading a collector through all of them would give a debug
 * overlay that (a) needs a new line every time a drawing call is added
 * and (b) can silently disagree with what was actually drawn, which is
 * the one thing a debug overlay must never do. Measuring the output
 * cannot drift from the output.
 *
 * What this costs: a path's box is computed from every coordinate in its
 * `d`, CONTROL POINTS INCLUDED, so a curved tie or slur gets a box that
 * is correct but not tight. Plain (non-SMuFL) text is measured from its
 * font size rather than real font metrics, which this module cannot know
 * without a DOM. Both are noted on each box's `approximate` flag rather
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

/** A conservative width-per-character for plain text, as a fraction of the font size. */
const TEXT_ADVANCE_RATIO = 0.62;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boxFrom(
  b: Bounds,
  kind: DebugBox['kind'],
  id: string | undefined,
  approximate: boolean,
): DebugBox {
  return {
    x: b.minX,
    y: b.minY,
    width: b.maxX - b.minX,
    height: b.maxY - b.minY,
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
 * (the same id `getEventStream` reports -- see §17.1). A `<g transform>`
 * is NOT applied: nothing this engine emits puts drawn content under a
 * transform except the tab-number mask's own `scale`, whose box is
 * therefore its unscaled one.
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
      if (closing) idStack.pop();
      else if (!rest.endsWith('/')) idStack.push(attr(tag, 'data-id'));
      continue;
    }
    if (closing) continue;

    const id = currentId();
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
        if (Number.isFinite(b.minX)) boxes.push(boxFrom(b, 'path', id, true));
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
            ),
          );
        } else if (text.length > 0) {
          boxes.push(
            boxFrom(
              {
                minX: x,
                maxX: x + text.length * fontSize * TEXT_ADVANCE_RATIO,
                minY: y - fontSize,
                maxY: y,
              },
              'text',
              id,
              true,
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
