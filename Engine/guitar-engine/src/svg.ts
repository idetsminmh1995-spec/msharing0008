/**
 * svg.ts — a small SVG builder, so designs read as drawings rather
 * than as string concatenation.
 *
 * No dependencies and no DOM: the output is a string, which is what a
 * browser preview, a server-side export and a test all want.
 */

/** Everything user-supplied goes through this before it reaches the markup. */
export function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Trims float noise: 12.300000000000001 is never worth six more bytes a frame. */
export function n(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

export type Attrs = Record<string, string | number | undefined>;

/**
 * Gradients, collected while a drawing is written out.
 *
 * SVG cannot put a gradient in a `fill` attribute: it has to be
 * defined once, given an id, and referred to. So the writer hands
 * every paint through here, gets back a plain colour or a `url(#…)`,
 * and asks for the finished markup at the end.
 *
 * The ids carry a hash of the gradients themselves. Two drawings on
 * ONE page -- the neck and the hand beside it, or three necks in a
 * row -- would otherwise both define `g0`, and every `url(#g0)` on the
 * page would resolve to whichever came first: the second drawing would
 * silently wear the first one's colours. Hashing also keeps the markup
 * deterministic, which numbering alone would not once two drawings are
 * involved.
 */
export class GradientBank {
  private readonly defs: string[] = [];

  paint(value: import('./types.js').Paint): string {
    if (typeof value === 'string') return value;
    // A placeholder until the hash is known: `@` appears in no
    // colour, path or number this drawing writes.
    const id = `@@${this.defs.length}@@`;
    const stops = value.stops
      .map((stop) => tag('stop', { offset: stop.offset, 'stop-color': stop.color }))
      .join('');
    this.defs.push(
      value.kind === 'linear'
        ? wrap(
            'linearGradient',
            {
              id,
              gradientUnits: 'userSpaceOnUse',
              x1: value.x1,
              y1: value.y1,
              x2: value.x2,
              y2: value.y2,
            },
            stops,
          )
        : wrap(
            'radialGradient',
            { id, gradientUnits: 'userSpaceOnUse', cx: value.cx, cy: value.cy, r: value.r },
            stops,
          ),
    );
    return `url(#@@${this.defs.length - 1}@@)`;
  }

  /**
   * The defs and the body, with every id made unique to this drawing.
   *
   * The placeholders are replaced once, at the end, when the hash of
   * what was collected is known.
   */
  finish(body: string): string {
    if (this.defs.length === 0) return body;
    const defs = wrap('defs', {}, this.defs.join(''));
    const stamp = hash(defs);
    const fill = (text: string) =>
      text.replace(/@@(\d+)@@/g, (_all, index: string) => `${stamp}-${index}`);
    return fill(defs) + fill(body);
  }
}

/** FNV-1a, for a short stable id from the drawing's own colours. */
function hash(text: string): string {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return `g${value.toString(36)}`;
}

function attrs(values: Attrs): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    parts.push(`${key}="${typeof value === 'number' ? n(value) : escapeText(value)}"`);
  }
  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

export function tag(name: string, values: Attrs = {}): string {
  return `<${name}${attrs(values)}/>`;
}

export function wrap(name: string, values: Attrs, body: string): string {
  return `<${name}${attrs(values)}>${body}</${name}>`;
}

export function rect(x: number, y: number, w: number, h: number, values: Attrs = {}): string {
  return tag('rect', { x, y, width: w, height: h, ...values });
}

export function circle(cx: number, cy: number, r: number, values: Attrs = {}): string {
  return tag('circle', { cx, cy, r, ...values });
}

export function line(x1: number, y1: number, x2: number, y2: number, values: Attrs = {}): string {
  return tag('line', { x1, y1, x2, y2, ...values });
}

export function path(d: string, values: Attrs = {}): string {
  return tag('path', { d, ...values });
}

export function text(value: string, x: number, y: number, values: Attrs = {}): string {
  if (value === '') return '';
  return wrap('text', { x, y, ...values }, escapeText(value));
}

export function group(values: Attrs, body: string): string {
  return wrap('g', values, body);
}

/**
 * A point on a circle, with 0 at TWELVE O'CLOCK and angles running
 * clockwise -- which is how every dial in these designs is described,
 * and not what `Math.cos`/`Math.sin` give you on their own.
 */
export function polar(cx: number, cy: number, radius: number, turns: number): [number, number] {
  const radians = (turns - 0.25) * Math.PI * 2;
  return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
}

/** An arc from `fromTurns` to `toTurns` on the same clockwise dial. */
export function arcPath(
  cx: number,
  cy: number,
  radius: number,
  fromTurns: number,
  toTurns: number,
): string {
  const sweep = toTurns - fromTurns;
  if (Math.abs(sweep) < 1e-6) return '';
  // A full circle cannot be drawn as one arc -- start and end coincide,
  // so the renderer draws nothing at all. Two halves always work.
  if (Math.abs(sweep) >= 1) {
    const [ax, ay] = polar(cx, cy, radius, 0);
    const [bx, by] = polar(cx, cy, radius, 0.5);
    return `M ${n(ax)} ${n(ay)} A ${n(radius)} ${n(radius)} 0 0 1 ${n(bx)} ${n(by)} A ${n(radius)} ${n(radius)} 0 0 1 ${n(ax)} ${n(ay)}`;
  }
  const [x1, y1] = polar(cx, cy, radius, fromTurns);
  const [x2, y2] = polar(cx, cy, radius, toTurns);
  const large = Math.abs(sweep) > 0.5 ? 1 : 0;
  const clockwise = sweep > 0 ? 1 : 0;
  return `M ${n(x1)} ${n(y1)} A ${n(radius)} ${n(radius)} 0 ${large} ${clockwise} ${n(x2)} ${n(y2)}`;
}

/** Linear interpolation, and the easing the designs share. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Fast at the start, settling at the end -- how a struck thing decays. */
export function easeOut(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) * (1 - clamped);
}

/** Slow, fast, slow -- how a pendulum actually swings. */
export function easeInOut(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped < 0.5 ? 2 * clamped * clamped : 1 - 2 * (1 - clamped) * (1 - clamped);
}
