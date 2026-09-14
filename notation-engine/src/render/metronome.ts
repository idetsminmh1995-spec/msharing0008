import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGlyphText } from './svg-primitives.js';

export interface RenderMetronomeMarkOptions {
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly fontFamily: string;
  /** A small horizontal gap inserted after the note glyph (and its dot, if any), before the equals sign -- real engraving leaves visible space here rather than crowding "=" against the note. */
  readonly noteToEqualsGap: number;
}

/** One glyph's own real advance width, from its bounding box -- the same measure every other multi-glyph assembly in this codebase already uses (Phase 28's tuplet numbers, Phase 41's tab digits). */
function glyphWidth(glyphName: string): number {
  const bbox = getGlyph(glyphName)?.bBox;
  return bbox !== undefined ? bbox.bBoxNE[0] - bbox.bBoxSW[0] : 0;
}

/**
 * The full metronome mark's own total rendered width -- note glyph
 * (+dot, if any) + noteToEqualsGap + equals sign + noteToEqualsGap +
 * every BPM digit. Exposed so a caller (Phase 43/44's measure-width
 * computation) can ensure the measure containing a tempo mark is wide
 * enough for it, which the notes' own widths alone don't guarantee --
 * a narrow pickup measure with only a rest is otherwise not wide enough
 * to hold "quarter = 120" without the mark visually overrunning into
 * the next measure or a following barline.
 */
export function metronomeMarkWidth(
  noteGlyphName: string,
  dotGlyphName: string | undefined,
  equalsGlyphName: string,
  bpmDigitGlyphNames: readonly string[],
  noteToEqualsGap: number,
): number {
  let width = glyphWidth(noteGlyphName);
  if (dotGlyphName !== undefined) width += glyphWidth(dotGlyphName);
  width += noteToEqualsGap + glyphWidth(equalsGlyphName) + noteToEqualsGap;
  for (const d of bpmDigitGlyphNames) width += glyphWidth(d);
  return width;
}

/**
 * Draws a full metronome mark -- note glyph, an optional augmentation
 * dot, "=", then every BPM digit -- left to right along one shared
 * baseline. Each glyph advances by its own real width; nothing here
 * assumes a fixed-width font, since none of these glyphs are one.
 */
export function renderMetronomeMark(
  noteGlyphName: string,
  dotGlyphName: string | undefined,
  equalsGlyphName: string,
  bpmDigitGlyphNames: readonly string[],
  options: RenderMetronomeMarkOptions,
): string {
  const sequence: string[] = [noteGlyphName];
  if (dotGlyphName !== undefined) sequence.push(dotGlyphName);

  const parts: string[] = [];
  let cursorX = options.x;

  for (const name of sequence) {
    parts.push(drawGlyph(name, cursorX, options));
    cursorX += glyphWidth(name);
  }

  cursorX += options.noteToEqualsGap;
  parts.push(drawGlyph(equalsGlyphName, cursorX, options));
  cursorX += glyphWidth(equalsGlyphName) + options.noteToEqualsGap;

  for (const name of bpmDigitGlyphNames) {
    parts.push(drawGlyph(name, cursorX, options));
    cursorX += glyphWidth(name);
  }

  return parts.join('\n');
}

function drawGlyph(name: string, x: number, options: RenderMetronomeMarkOptions): string {
  const glyph = getGlyph(name);
  if (glyph === undefined) {
    throw new Error(`No glyph found for metronome mark component "${name}"`);
  }
  return svgGlyphText(x, options.y, glyph.char, options.fontFamily, { fill: options.color });
}
