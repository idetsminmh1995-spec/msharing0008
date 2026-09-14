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
