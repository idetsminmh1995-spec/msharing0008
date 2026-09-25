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
