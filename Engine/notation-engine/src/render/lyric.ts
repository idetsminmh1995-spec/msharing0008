import type { ExtenderLineShape, LyricRenderItem } from '../geometry/lyric.js';
import { lyricElisionGlyphName, lyricHyphenGlyphName } from '../geometry/lyric.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { svgGroup, svgLine } from './svg-primitives.js';
import { renderText, renderTextScaledGlyph } from './text.js';

export interface RenderExtenderLineOptions {
  /** Typically Phase 5's getEngravingDefault('lyricLineThickness'). */
  readonly thickness: number;
  readonly color: string;
}

/** Draws a melisma extender line as a plain horizontal segment. */
export function renderExtenderLine(
  shape: ExtenderLineShape,
  options: RenderExtenderLineOptions,
): string {
  return svgLine(shape.startX, shape.y, shape.endX, shape.y, {
    stroke: options.color,
    'stroke-width': options.thickness,
  });
}

/**
 * How far above the text baseline a hyphen is raised, as a fraction of the
 * text size.
 *
 * Bravura's only lyric hyphen is `lyricsHyphenBaseline`, whose own bounding
 * box straddles the baseline (+0.14 to -0.136 staff spaces) -- drawn as-is
 * it reads as an underscore under the word rather than as the short dash
 * between two syllables that every songbook prints. Raising it to roughly
 * half the x-height puts it where a reader expects, which is what
 * MuseScore and Finale both do with the same glyph.
 */
const HYPHEN_RISE = 0.32;

export interface RenderLyricRowOptions {
  /** `config.fonts.lyricFont` -- the words themselves. */
  readonly fontFamily: string;
  /** `config.fonts.sizes.lyric`, in staff spaces. */
  readonly fontSize: number;
  /** The SMuFL font the hyphen and elision glyphs come from. */
  readonly musicFont: string;
  readonly color: string;
  /** Advance of the hyphen glyph at `fontSize` (see `chordSymbolLayout`'s own scaling note). */
  readonly hyphenWidth: number;
  /** Advance of the elision glyph at `fontSize`. */
  readonly elisionWidth: number;
  /** `lyricLineThickness` from the font, for an extender line. */
  readonly lineThickness: number;
}

/**
 * Draws one verse's row of lyric items at `y`, which is the row's text
 * BASELINE: syllables, their hyphens and elisions, and any extender
 * lines.
 *
 * The punctuation is drawn at the same baseline as the words because
 * SMuFL registers `lyricsHyphenBaseline` on the baseline by design --
 * that is what the `...Baseline` suffix in its own name means. The
 * extender line sits slightly below the baseline instead, where a
 * melisma line belongs, so it does not run through the letters.
 */
export function renderLyricRow(
  items: readonly LyricRenderItem[],
  y: number,
  options: RenderLyricRowOptions,
): string {
  const hyphenChar = getGlyph(lyricHyphenGlyphName())?.char;
  const elisionChar = getGlyph(lyricElisionGlyphName())?.char;
  const children: string[] = [];
  for (const item of items) {
    switch (item.kind) {
      case 'syllable':
        children.push(
          renderText(item.text, item.x, y, {
            fontFamily: options.fontFamily,
            fontSize: options.fontSize,
            color: options.color,
            anchor: 'middle',
          }),
        );
        break;
      case 'hyphen':
        if (hyphenChar !== undefined) {
          children.push(
            renderTextScaledGlyph(
              hyphenChar,
              item.x - options.hyphenWidth / 2,
              y - options.fontSize * HYPHEN_RISE,
              {
                fontFamily: options.musicFont,
                fontSize: options.fontSize,
                color: options.color,
              },
            ),
          );
        }
        break;
      case 'elision':
        if (elisionChar !== undefined) {
          children.push(
            renderTextScaledGlyph(elisionChar, item.x - options.elisionWidth / 2, y, {
              fontFamily: options.musicFont,
              fontSize: options.fontSize,
              color: options.color,
            }),
          );
        }
        break;
      case 'extender':
        children.push(
          renderExtenderLine(
            { startX: item.startX, endX: item.endX, y: y + options.fontSize * 0.15 },
            { thickness: options.lineThickness, color: options.color },
          ),
        );
        break;
    }
  }
  return svgGroup(children, { 'data-lyric-row': 'true' });
}
