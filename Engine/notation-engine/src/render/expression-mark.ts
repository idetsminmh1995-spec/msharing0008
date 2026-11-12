import type { RehearsalMarkBox } from '../geometry/expression-mark.js';
import { svgGroup, svgRect } from './svg-primitives.js';
import { renderText } from './text.js';

export interface RenderRehearsalMarkOptions {
  readonly box: RehearsalMarkBox;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly color: string;
  /** The frame's own colour, which a caller may keep separate from the letter's. */
  readonly frameColor: string;
}

/**
 * One rehearsal mark: its letter or number, centred in a rectangle.
 *
 * A rectangle rather than a circle: MusicXML distinguishes `<rehearsal
 * enclosure="square|circle|none|...">`, and this engine does not parse
 * the enclosure attribute -- so it draws the default square, which is
 * what both MuseScore and Finale do when no enclosure is stated. A file
 * asking for a circle therefore gets a square frame; that is a stated
 * limitation, not an accident (see the phase record).
 */
export function renderRehearsalMark(
  text: string,
  x: number,
  y: number,
  options: RenderRehearsalMarkOptions,
): string {
  const { box } = options;
  const frame = svgRect(x - box.width / 2, y - box.ascent - box.padding, box.width, box.height, {
    fill: 'none',
    stroke: options.frameColor,
    'stroke-width': box.thickness,
  });
  const label = renderText(text, x, y, {
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    color: options.color,
    anchor: 'middle',
  });
  return svgGroup([frame, label], { 'data-rehearsal-mark': 'true' });
}

export interface RenderWordsOptions {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly color: string;
  /** Where `x` sits relative to the text. A direction at a beat is `middle`. */
  readonly anchor?: 'start' | 'middle' | 'end';
  /** `<words>` is conventionally italic (an expression, not a label). */
  readonly italic?: boolean;
}

/** One `<words>` direction -- "Allegro", "dolce", "play twice" -- as text. */
export function renderWords(
  text: string,
  x: number,
  y: number,
  options: RenderWordsOptions,
): string {
  return renderText(text, x, y, {
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    color: options.color,
    ...(options.anchor !== undefined ? { anchor: options.anchor } : {}),
    ...(options.italic !== undefined ? { italic: options.italic } : {}),
  });
}
