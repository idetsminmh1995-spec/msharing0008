import type { VoltaGeometry } from '../geometry/volta.js';
import { svgGroup, svgLine, svgText } from './svg-primitives.js';

export interface RenderVoltaOptions {
  /** X of the bracket's left end. */
  readonly x: number;
  /** Y of its horizontal line. The hooks drop BELOW this, toward the staff. */
  readonly y: number;
  /** "1." / "1, 2." -- see `voltaLabel`. Empty draws the bracket alone. */
  readonly label: string;
  readonly color: string;
  readonly fontFamily: string;
  readonly fontSize: number;
}

/** How far the label sits in from the bracket's left end, and below its line, in staff spaces. */
const LABEL_INSET = 0.45;
const LABEL_DROP = 1.15;

/** Draws one volta bracket: its horizontal line, whichever end hooks it has, and its number label. */
export function renderVolta(geometry: VoltaGeometry, options: RenderVoltaOptions): string {
  const { x, y, color } = options;
  const parts: string[] = [
    svgLine(x, y, x + geometry.width, y, { stroke: color, 'stroke-width': geometry.thickness }),
  ];
  if (geometry.startHookDepth > 0) {
    parts.push(
      svgLine(x, y, x, y + geometry.startHookDepth, {
        stroke: color,
        'stroke-width': geometry.thickness,
      }),
    );
  }
  if (geometry.endHookDepth > 0) {
    parts.push(
      svgLine(x + geometry.width, y, x + geometry.width, y + geometry.endHookDepth, {
        stroke: color,
        'stroke-width': geometry.thickness,
      }),
    );
  }
  if (options.label !== '') {
    parts.push(
      svgText(x + LABEL_INSET, y + LABEL_DROP, options.label, {
        'font-family': options.fontFamily,
        'font-size': options.fontSize,
        fill: color,
      }),
    );
  }
  return svgGroup(parts);
}

export interface RenderRepeatCountOptions {
  /** X of the repeat-end barline this count belongs to -- the text is right-aligned to it. */
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly fontFamily: string;
  readonly fontSize: number;
}

/**
 * The "×4" over a repeat-end barline that is played more than twice.
 *
 * Drawn only above 2, because a plain repeat sign already means "play it
 * twice" to every reader; labelling that would be noise. A `times="4"`
 * is information the reader cannot get any other way, and leaving it
 * undrawn is how a chart silently loses two thirds of its length.
 */
export function renderRepeatCount(times: number, options: RenderRepeatCountOptions): string {
  return svgText(options.x, options.y, `×${times}`, {
    'font-family': options.fontFamily,
    'font-size': options.fontSize,
    fill: options.color,
    'text-anchor': 'end',
  });
}
