import type { PitchStep } from '../core/pitch.js';
import { getGlyph } from '../glyphs/glyph-table.js';
import { estimateTextWidth } from './text-metrics.js';

/**
 * §9.23's placement rule -- universal with no exception found across
 * seven independent sources (including Berklee's own published
 * lead-sheet guide), unlike lyrics (§9.22) or dynamics (§9.21), which
 * both had a documented vocal/instrumental split.
 */
export function chordSymbolSide(): 'above' {
  return 'above';
}

const ACCIDENTAL_GLYPHS: Readonly<Record<number, string>> = {
  [-2]: 'csymAccidentalDoubleFlat',
  [-1]: 'csymAccidentalFlat',
  0: 'csymAccidentalNatural',
  1: 'csymAccidentalSharp',
  2: 'csymAccidentalDoubleSharp',
};

/**
 * The chord-symbol-specific accidental glyph for a root note's alter --
 * a REAL, separate glyph set from §9.11's plain notehead accidentals
 * (`csymAccidentalSharp` vs `accidentalSharp`), confirmed by checking
 * `glyphnames.json` rather than assuming the two could be shared.
 */
export function chordSymbolAccidentalGlyphName(alter: number): string {
  const name = ACCIDENTAL_GLYPHS[alter];
  if (name === undefined) {
    throw new Error(
      `No chord-symbol accidental glyph for alter=${alter} (only -2..2 are supported).`,
    );
  }
  return name;
}

export type ChordSymbolQuality =
  'minor' | 'diminished' | 'halfDiminished' | 'augmented' | 'majorSeventh';

const QUALITY_GLYPHS: Readonly<Record<ChordSymbolQuality, string>> = {
  minor: 'csymMinor',
  diminished: 'csymDiminished',
  halfDiminished: 'csymHalfDiminished',
  augmented: 'csymAugmented',
  majorSeventh: 'csymMajorSeventh',
};

/**
 * The real SMuFL glyph for one of the five chord qualities that have a
 * dedicated symbol. Extended qualities (add9, sus4, 13, etc.) have no
 * such glyph and would need plain text -- the same root-letter gap
 * §9.21/§9.22 already identified, not a new one, so this function
 * doesn't attempt to cover them.
 */
export function chordSymbolQualityGlyphName(quality: ChordSymbolQuality): string {
  return QUALITY_GLYPHS[quality];
}

/**
 * One drawable piece of a chord symbol, in left-to-right order.
 *
 * A chord symbol is NOT one glyph: its root letter, accidental, quality
 * suffix and slash bass come from two different sources (ordinary text
 * and SMuFL), so the layout below hands the renderer a sequence rather
 * than a string. `advance` is how far the NEXT part starts from this
 * one's own origin, already scaled to the requested font size.
 */
export type ChordSymbolPart =
  | { readonly kind: 'text'; readonly text: string; readonly advance: number }
  | { readonly kind: 'glyph'; readonly glyphName: string; readonly advance: number };

/** A `<harmony>`'s musical content, as the parser preserved it (§10.4). */
export interface ChordSymbolSource {
  readonly rootStep: PitchStep;
  readonly rootAlter: number;
  /** The raw MusicXML `<kind>` value, e.g. `minor-seventh`. */
  readonly kind?: string;
  /** `<kind text="...">` -- the file's own display text for the suffix, when it states one. */
  readonly kindText?: string;
  readonly bassStep?: PitchStep;
  readonly bassAlter?: number;
}

export interface ChordSymbolLayout {
  readonly parts: readonly ChordSymbolPart[];
  /** Total advance of every part, in staff spaces. */
  readonly width: number;
  /**
   * Set when the file's `<kind>` is one this engine cannot express, in
   * which case `parts` is EMPTY. Drawing the root letter alone for a
   * file that says `C13` would be a silent musical error -- §10.7's
   * rule -- so the caller draws nothing and reports this instead.
   */
  readonly unsupportedKind?: string;
}

/** A suffix piece before it is turned into a part with a real advance. */
interface SuffixSpec {
  readonly glyph?: string;
  readonly text?: string;
}

/**
 * MusicXML's `<kind>` vocabulary, mapped to what this engine can draw.
 *
 * The five qualities with a dedicated SMuFL glyph use it; everything
 * else that MusicXML names is a real, conventional suffix in ordinary
 * text (`7`, `9`, `sus4`, `6`), which is exactly what a lead sheet
 * prints. A major triad is the empty suffix -- "C", not "Cmaj".
 *
 * `other` is deliberately absent: MusicXML defines it as "the harmony
 * kind is not one of the other values", i.e. the file is saying it has
 * no name this engine could know. It is reported as unsupported rather
 * than guessed at.
 */
const KIND_SUFFIXES: Readonly<Record<string, readonly SuffixSpec[]>> = {
  major: [],
  minor: [{ glyph: 'csymMinor' }],
  augmented: [{ glyph: 'csymAugmented' }],
  diminished: [{ glyph: 'csymDiminished' }],
  dominant: [{ text: '7' }],
  'major-seventh': [{ glyph: 'csymMajorSeventh' }],
  'minor-seventh': [{ glyph: 'csymMinor' }, { text: '7' }],
  'diminished-seventh': [{ glyph: 'csymDiminished' }, { text: '7' }],
  'augmented-seventh': [{ glyph: 'csymAugmented' }, { text: '7' }],
  'half-diminished': [{ glyph: 'csymHalfDiminished' }],
  'major-minor': [{ glyph: 'csymMinor' }, { text: 'maj7' }],
  'major-sixth': [{ text: '6' }],
  'minor-sixth': [{ glyph: 'csymMinor' }, { text: '6' }],
  'dominant-seventh': [{ text: '7' }],
  'dominant-ninth': [{ text: '9' }],
  'major-ninth': [{ text: '9' }],
  'minor-ninth': [{ glyph: 'csymMinor' }, { text: '9' }],
  'dominant-11th': [{ text: '11' }],
  'major-11th': [{ text: '11' }],
  'minor-11th': [{ glyph: 'csymMinor' }, { text: '11' }],
  'dominant-13th': [{ text: '13' }],
  'major-13th': [{ text: '13' }],
  'minor-13th': [{ glyph: 'csymMinor' }, { text: '13' }],
  'suspended-second': [{ text: 'sus2' }],
  'suspended-fourth': [{ text: 'sus4' }],
  power: [{ text: '5' }],
  Neapolitan: [{ text: 'N' }],
  Italian: [{ text: 'It' }],
  French: [{ text: 'Fr' }],
  German: [{ text: 'Ger' }],
  pedal: [{ text: 'ped' }],
  Tristan: [{ text: 'Tristan' }],
};

/**
 * How wide one SMuFL glyph is at `fontSize`, in staff spaces.
 *
 * A glyph's own bounding box is measured at the SMuFL convention of one
 * em = 4 staff spaces, so scaling to an arbitrary text size is the
 * bbox's width times `fontSize / 4`. That is also why chord-symbol
 * glyphs are drawn AT the text size rather than at 4: SMuFL's csym
 * glyphs are designed to sit beside ordinary chord-symbol text, and
 * drawing them at 4 would make a `dim` circle taller than the staff.
 */
function glyphAdvance(glyphName: string, fontSize: number): number {
  const bbox = getGlyph(glyphName)?.bBox;
  if (bbox === undefined) return 0;
  return (bbox.bBoxNE[0] - bbox.bBoxSW[0]) * (fontSize / 4);
}

/**
 * Assembles a `<harmony>` into the ordered parts that draw it: root
 * letter, root accidental, quality suffix, then `slash bass` if the file
 * states one.
 *
 * §9.23 said assembly was "meaningless to build before the root letter
 * itself can be drawn". The root letter is drawn now (it is ordinary
 * text, §19.10's gap closed by the text layer), so the assembly is
 * built here -- and it is what makes the accidental and quality glyphs
 * that have existed since Phase 33 actually reachable.
 */
export function chordSymbolLayout(source: ChordSymbolSource, fontSize: number): ChordSymbolLayout {
  const parts: ChordSymbolPart[] = [];

  const letter = (step: PitchStep, alter: number): void => {
    parts.push({
      kind: 'text',
      text: step,
      advance: estimateTextWidth(step, fontSize),
    });
    if (alter !== 0) {
      const glyphName = chordSymbolAccidentalGlyphName(alter);
      parts.push({ kind: 'glyph', glyphName, advance: glyphAdvance(glyphName, fontSize) });
    }
  };

  letter(source.rootStep, source.rootAlter);

  const suffix = ():
    { readonly specs: readonly SuffixSpec[] } | { readonly unsupported: string } => {
    // The file's own display text wins outright: MusicXML defines
    // `<kind text="...">` as "the text to be displayed for the harmony
    // kind", so a file that says `m7b5` gets `m7b5` and not this
    // engine's idea of how to spell a half-diminished chord.
    if (source.kindText !== undefined && source.kindText.length > 0) {
      return { specs: [{ text: source.kindText }] };
    }
    if (source.kind === undefined) return { specs: [] };
    const specs = KIND_SUFFIXES[source.kind];
    if (specs === undefined) return { unsupported: source.kind };
    return { specs };
  };

  const resolved = suffix();
  if ('unsupported' in resolved) {
    return { parts: [], width: 0, unsupportedKind: resolved.unsupported };
  }

  for (const spec of resolved.specs) {
    if (spec.glyph !== undefined) {
      parts.push({
        kind: 'glyph',
        glyphName: spec.glyph,
        advance: glyphAdvance(spec.glyph, fontSize),
      });
    } else if (spec.text !== undefined) {
      parts.push({
        kind: 'text',
        text: spec.text,
        advance: estimateTextWidth(spec.text, fontSize),
      });
    }
  }

  if (source.bassStep !== undefined) {
    // The slash is a real SMuFL glyph, tall enough to sit between the
    // root and the bass letter the way a lead sheet prints "G7/B".
    const slash = 'csymAlteredBassSlash';
    parts.push({ kind: 'glyph', glyphName: slash, advance: glyphAdvance(slash, fontSize) });
    letter(source.bassStep, source.bassAlter ?? 0);
  }

  const width = parts.reduce((total, part) => total + part.advance, 0);
  return { parts, width };
}
