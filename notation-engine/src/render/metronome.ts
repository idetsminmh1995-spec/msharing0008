import { getGlyph } from '../glyphs/glyph-table.js';
import { estimateTextWidth } from '../geometry/text-metrics.js';
import { metronomeTempoText } from '../geometry/metronome.js';
import { svgGlyphText, svgText } from './svg-primitives.js';

export interface RenderMetronomeMarkOptions {
  readonly x: number;
  /** The shared baseline. The note glyph straddles it (its notehead sits half above, half below) and the "= 120" sits ON it, exactly as a music symbol embedded in a line of text does. */
  readonly y: number;
  readonly color: string;
  /** The SMuFL font the note glyph (and its dot) is drawn in. */
  readonly musicFont: string;
  /** The ordinary text font the "= 120" is set in -- `config.fonts.textFont`. */
  readonly textFont: string;
  /** The text's size in staff spaces -- `config.fonts.sizes.tempo`. */
  readonly fontSize: number;
  /** A small horizontal gap inserted after the note glyph (and its dot, if any), before the "=" -- real engraving leaves visible space here rather than crowding the two together. */
  readonly noteToEqualsGap: number;
}

/** One glyph's own width, from its bounding box -- Bravura's metadata carries no advance widths, so this is as close as a glyph's advance gets here. Fine for the metNote family, whose ink runs the full width of the glyph from x=0. */
function glyphWidth(glyphName: string): number {
  const bbox = getGlyph(glyphName)?.bBox;
  return bbox !== undefined ? bbox.bBoxNE[0] - bbox.bBoxSW[0] : 0;
}

/**
 * Between the note glyph and its augmentation dot.
 *
 * MuseScore's own `dotNoteDistance` (0.5sp) is measured from a NOTEHEAD,
 * and a metNote glyph is wider than its notehead -- the stem is inside
 * the same glyph, at its right-hand edge. So the dot is already past the
 * notehead by the time the glyph ends; this is just enough space to keep
 * it off the stem.
 */
const DOT_GAP = 0.25;

/**
 * The full metronome mark's total rendered width -- note glyph (+dot, if
 * any), the gap, then the "= 120" text. Exposed so a caller (Phase
 * 43/44's measure-width computation) can make the measure holding a
 * tempo mark wide enough for it, which the notes' own widths alone don't
 * guarantee: a narrow pickup measure with only a rest is otherwise not
 * wide enough to hold "quarter = 120" without the mark overrunning into
 * the next measure or a following barline.
 *
 * The text half is an ESTIMATE (`estimateTextWidth`) -- there is no font
 * to measure here -- and a deliberately generous one, since reserving a
 * little too much room is invisible and reserving too little is a
 * collision. Nothing is POSITIONED from it: see `renderMetronomeMark`.
 */
export function metronomeMarkWidth(
  noteGlyphName: string,
  dotGlyphName: string | undefined,
  beatsPerMinute: number,
  fontSize: number,
  noteToEqualsGap: number,
): number {
  let width = glyphWidth(noteGlyphName);
  if (dotGlyphName !== undefined) width += DOT_GAP + glyphWidth(dotGlyphName);
  width += noteToEqualsGap;
  width += estimateTextWidth(metronomeTempoText(beatsPerMinute), fontSize);
  return width;
}

/**
 * Draws a full metronome mark: the note glyph (plus an augmentation dot
 * for a dotted beat unit) from the music font, then "= 120" as ordinary
 * text, all on one shared baseline.
 *
 * The number is ONE `<text>` element, not a digit per element. That is
 * the whole point of setting it in a text font: the font spaces its own
 * digits, so "= 115" cannot come out with its digits touching the way it
 * did while this was assembled out of SMuFL `fingering` glyphs advanced
 * by their ink widths (see `metronomeTempoText`).
 */
export function renderMetronomeMark(
  noteGlyphName: string,
  dotGlyphName: string | undefined,
  beatsPerMinute: number,
  options: RenderMetronomeMarkOptions,
): string {
  const parts: string[] = [];
  let cursorX = options.x;

  parts.push(drawGlyph(noteGlyphName, cursorX, options));
  cursorX += glyphWidth(noteGlyphName);

  if (dotGlyphName !== undefined) {
    cursorX += DOT_GAP;
    parts.push(drawGlyph(dotGlyphName, cursorX, options));
    cursorX += glyphWidth(dotGlyphName);
  }

  cursorX += options.noteToEqualsGap;
  parts.push(
    svgText(cursorX, options.y, metronomeTempoText(beatsPerMinute), {
      fill: options.color,
      'font-family': options.textFont,
      'font-size': options.fontSize,
      // MuseScore's Tempo text style is bold, and a tempo mark reads as
      // an instruction to the player rather than as part of the music.
      'font-weight': 'bold',
    }),
  );

  return parts.join('\n');
}

function drawGlyph(name: string, x: number, options: RenderMetronomeMarkOptions): string {
  const glyph = getGlyph(name);
  if (glyph === undefined) {
    throw new Error(`No glyph found for metronome mark component "${name}"`);
  }
  return svgGlyphText(x, options.y, glyph.char, options.musicFont, { fill: options.color });
}
