import { isUnpitched, type Pitch } from '../core/pitch.js';
import type { DurationType } from '../core/duration.js';
import { getGlyph } from '../glyphs/index.js';

type NoteheadFill = 'whole' | 'half' | 'black';

/** Which fill variant a duration type normally uses -- whole/half stay open, everything shorter is filled. */
function fillForDuration(type: DurationType): NoteheadFill {
  if (type === 'whole') return 'whole';
  if (type === 'half') return 'half';
  return 'black';
}

/**
 * Every notehead SHAPE this phase supports, each as its 3 real SMuFL glyph
 * names (whole/half/black variant) -- verified against glyphnames.json
 * before writing this table, including the shapes that don't follow the
 * obvious naming pattern (circle-x's filled variant is plain
 * "noteheadCircleX", not "...Black"; square has no half-specific glyph, so
 * half falls back to the white/open one).
 */
const SHAPE_GLYPHS: Readonly<Record<string, Readonly<Record<NoteheadFill, string>>>> = {
  normal: { whole: 'noteheadWhole', half: 'noteheadHalf', black: 'noteheadBlack' },
  x: { whole: 'noteheadXWhole', half: 'noteheadXHalf', black: 'noteheadXBlack' },
  'circle-x': {
    whole: 'noteheadCircleXWhole',
    half: 'noteheadCircleXHalf',
    black: 'noteheadCircleX',
  },
  diamond: {
    whole: 'noteheadDiamondWhole',
    half: 'noteheadDiamondHalf',
    black: 'noteheadDiamondBlack',
  },
  triangle: {
    whole: 'noteheadTriangleUpWhole',
    half: 'noteheadTriangleUpHalf',
    black: 'noteheadTriangleUpBlack',
  },
  'inverted-triangle': {
    whole: 'noteheadTriangleDownWhole',
    half: 'noteheadTriangleDownHalf',
    black: 'noteheadTriangleDownBlack',
  },
  // MusicXML's "left triangle" points RIGHT when drawn -- the name
  // describes the vertical edge on its left, not where the apex points.
  // SMuFL names the same glyph from the apex, hence TriangleRight.
  'left-triangle': {
    whole: 'noteheadTriangleRightWhite',
    half: 'noteheadTriangleRightWhite',
    black: 'noteheadTriangleRightBlack',
  },
  square: {
    whole: 'noteheadSquareWhite',
    half: 'noteheadSquareWhite',
    black: 'noteheadSquareBlack',
  },
  // SMuFL has no rectangle notehead; the square is its nearest real
  // shape, and drawing the wrong-but-adjacent glyph beats refusing the
  // file. Recorded in Doc/ and in §19's known limitations rather than
  // silently pretended to be exact.
  rectangle: {
    whole: 'noteheadSquareWhite',
    half: 'noteheadSquareWhite',
    black: 'noteheadSquareBlack',
  },
  slash: {
    whole: 'noteheadSlashWhiteWhole',
    half: 'noteheadSlashWhiteHalf',
    black: 'noteheadSlashVerticalEnds',
  },
  slashed: {
    whole: 'noteheadSlashedWhole1',
    half: 'noteheadSlashedHalf1',
    black: 'noteheadSlashedBlack1',
  },
  'back-slashed': {
    whole: 'noteheadSlashedWhole2',
    half: 'noteheadSlashedHalf2',
    black: 'noteheadSlashedBlack2',
  },
  // MusicXML's "cross" is the PLUS shape (+); its "x" is the other one.
  // Getting these two the wrong way round is the classic mistake here,
  // so `plus` stays the shape-family key and `cross` maps onto it.
  plus: { whole: 'noteheadPlusWhole', half: 'noteheadPlusHalf', black: 'noteheadPlusBlack' },
  circled: {
    whole: 'noteheadCircledWhole',
    half: 'noteheadCircledHalf',
    black: 'noteheadCircledBlack',
  },
  'circle-dot': {
    whole: 'noteheadRoundWhiteWithDot',
    half: 'noteheadRoundWhiteWithDot',
    black: 'noteheadRoundWhiteWithDot',
  },
  'arrow-up': {
    whole: 'noteheadLargeArrowUpWhole',
    half: 'noteheadLargeArrowUpHalf',
    black: 'noteheadLargeArrowUpBlack',
  },
  'arrow-down': {
    whole: 'noteheadLargeArrowDownWhole',
    half: 'noteheadLargeArrowDownHalf',
    black: 'noteheadLargeArrowDownBlack',
  },
  cluster: {
    whole: 'noteheadClusterRoundWhite',
    half: 'noteheadClusterRoundWhite',
    black: 'noteheadClusterRoundBlack',
  },
  // `none` is not "no glyph" here: noteheadNull is SMuFL's own
  // zero-ink notehead, which keeps the stem, beam and spacing anchored
  // exactly where the file put them while drawing nothing.
  none: { whole: 'noteheadNull', half: 'noteheadNull', black: 'noteheadNull' },

  // The seven Aikin shape-note heads, plus "fa up". SMuFL's noteShape*
  // glyphs come in White/Black only (no whole-note variant), so a whole
  // note uses the white one -- which is what the shape-note engraving
  // tradition does too.
  do: {
    whole: 'noteShapeTriangleUpWhite',
    half: 'noteShapeTriangleUpWhite',
    black: 'noteShapeTriangleUpBlack',
  },
  re: { whole: 'noteShapeMoonWhite', half: 'noteShapeMoonWhite', black: 'noteShapeMoonBlack' },
  mi: {
    whole: 'noteShapeDiamondWhite',
    half: 'noteShapeDiamondWhite',
    black: 'noteShapeDiamondBlack',
  },
  fa: {
    whole: 'noteShapeTriangleRightWhite',
    half: 'noteShapeTriangleRightWhite',
    black: 'noteShapeTriangleRightBlack',
  },
  'fa-up': {
    whole: 'noteShapeTriangleLeftWhite',
    half: 'noteShapeTriangleLeftWhite',
    black: 'noteShapeTriangleLeftBlack',
  },
  so: { whole: 'noteShapeRoundWhite', half: 'noteShapeRoundWhite', black: 'noteShapeRoundBlack' },
  la: {
    whole: 'noteShapeSquareWhite',
    half: 'noteShapeSquareWhite',
    black: 'noteShapeSquareBlack',
  },
  ti: {
    whole: 'noteShapeKeystoneWhite',
    half: 'noteShapeKeystoneWhite',
    black: 'noteShapeKeystoneBlack',
  },
};

/**
 * Every `<notehead>` value MusicXML 4.0 defines, mapped onto a
 * `SHAPE_GLYPHS` family. Written out in full rather than as a switch,
 * because the two sets are NOT the same shape: MusicXML spells two
 * words with a space ("inverted triangle"), SMuFL's families are
 * hyphenated here, and three values collapse onto a family named after
 * a different word ("cross" is the plus, "normal" is no override at
 * all, "other" defers to the `smufl` attribute).
 *
 * `normal` and `other` map to `undefined` deliberately -- see
 * `musicXmlNoteheadToShape`.
 */
const MUSICXML_NOTEHEAD_SHAPES: Readonly<Record<string, string | undefined>> = {
  normal: undefined,
  other: undefined,
  slash: 'slash',
  triangle: 'triangle',
  diamond: 'diamond',
  square: 'square',
  cross: 'plus',
  x: 'x',
  'circle-x': 'circle-x',
  'inverted triangle': 'inverted-triangle',
  'arrow down': 'arrow-down',
  'arrow up': 'arrow-up',
  circled: 'circled',
  slashed: 'slashed',
  'back slashed': 'back-slashed',
  cluster: 'cluster',
  'circle dot': 'circle-dot',
  'left triangle': 'left-triangle',
  rectangle: 'rectangle',
  none: 'none',
  do: 'do',
  re: 're',
  mi: 'mi',
  fa: 'fa',
  'fa up': 'fa-up',
  so: 'so',
  la: 'la',
  ti: 'ti',
};

/** Whether `value` is a `<notehead>` value MusicXML actually defines -- what separates "the file asked for the ordinary head" from "the file said something we have never heard of". */
export function isKnownMusicXmlNotehead(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(MUSICXML_NOTEHEAD_SHAPES, value);
}

/** Every `<notehead>` value this engine understands, for a diagnostic's own message. */
export function supportedMusicXmlNoteheads(): readonly string[] {
  return Object.keys(MUSICXML_NOTEHEAD_SHAPES);
}

/**
 * The duration-appropriate glyph name for a shape family (e.g. 'x' + a
 * quarter note -> 'noteheadXBlack'), or `undefined` for a family this
 * engine has no glyphs for.
 */
export function shapeGlyphNameOrUndefined(
  shape: string,
  durationType: DurationType,
): string | undefined {
  return SHAPE_GLYPHS[shape]?.[fillForDuration(durationType)];
}

/**
 * The same lookup, throwing on an unknown family.
 *
 * Kept throwing because its remaining callers are CONFIG paths
 * (`noteheadMapping.overridesByKey`, `defaultShape`), where an
 * unrecognized value is a programming mistake in the host application
 * and should be loud. The MusicXML path deliberately does NOT use it --
 * a file is input, not a program, and bad input is reported as a
 * diagnostic and drawn as best we can.
 */
export function shapeGlyphName(shape: string, durationType: DurationType): string {
  const glyph = shapeGlyphNameOrUndefined(shape, durationType);
  if (glyph === undefined) {
    throw new Error(
      `Unknown notehead shape "${shape}". Supported: ${Object.keys(SHAPE_GLYPHS).join(', ')}.`,
    );
  }
  return glyph;
}

/** Every notehead shape family this engine can draw -- what a config error message lists. */
export function supportedNoteheadShapes(): readonly string[] {
  return Object.keys(SHAPE_GLYPHS);
}

/** The plain duration-based default notehead glyph -- priority 3 (lowest) in §9.7's selection order. */
export function durationDefaultNotehead(durationType: DurationType): string {
  return shapeGlyphName('normal', durationType);
}

/**
 * Maps a MusicXML `<notehead>` element's value to this engine's shape-family
 * key, or `undefined` for "no override, use the ordinary duration-based
 * head".
 *
 * `undefined` covers three cases on purpose:
 * - `normal`, which the spec defines as exactly that;
 * - `other`, which carries its real shape in the `smufl` attribute
 *   instead (see `selectNoteheadGlyphName`);
 * - anything unrecognized.
 *
 * **This used to throw on the third case**, and that is the whole reason
 * a real MuseScore drum chart (`<notehead>slashed</notehead>`, plus
 * `<notehead smufl="noteheadHeavyXHat">other</notehead>`) rendered as
 * "Could not parse this file" instead of as music. A notation file is
 * INPUT. §10.7's rule for input the engine cannot honour is to say so in
 * a diagnostic and carry on, never to abort the render -- one unknown
 * head on one note must not cost the reader the other 341 notes. The
 * parser reports `UNKNOWN_NOTEHEAD` (see `isKnownMusicXmlNotehead`); this
 * function's job is only the mapping.
 */
export function musicXmlNoteheadToShape(value: string): string | undefined {
  return MUSICXML_NOTEHEAD_SHAPES[value];
}

/**
 * The key used to look up a per-note notehead override in
 * `config.noteheadMapping.overridesByKey` (§9.7, §8's NoteheadMappingConfig).
 * One scheme covers both the drum use case and pitched overrides:
 * - unpitched with a known GM MIDI note number -> that number as a string
 *   (e.g. "38" for snare);
 * - unpitched without one -> "<displayStep><displayOctave>";
 * - pitched -> "<step><octave>".
 */
export function noteheadMappingKey(pitch: Pitch, midiNote?: number): string {
  if (isUnpitched(pitch)) {
    return midiNote !== undefined ? String(midiNote) : `${pitch.displayStep}${pitch.displayOctave}`;
  }
  return `${pitch.step}${pitch.octave}`;
}

export interface NoteheadSelectionInput {
  readonly pitch: Pitch;
  readonly durationType: DurationType;
  /** From a MusicXML `<notehead>` element on this specific note, if present. */
  readonly explicitNotehead?: string;
  /**
   * The `smufl` attribute of that same `<notehead>` element. MusicXML's
   * `other` value means "the shape is not in my enumeration -- here is
   * its SMuFL glyph name instead", which is how MuseScore writes a
   * drum chart's hi-hat-with-hat head
   * (`<notehead smufl="noteheadHeavyXHat">other</notehead>`).
   *
   * Used as a glyph name DIRECTLY, with no duration variant: the file
   * named one exact glyph, and substituting a different fill for it
   * would be overriding the file rather than reading it. A name no font
   * has is ignored (and reported by the parser), falling through to the
   * tiers below.
   */
  readonly explicitNoteheadSmufl?: string;
  /** GM MIDI note number, if known (unpitched notes only -- see noteheadMappingKey). */
  readonly midiNote?: number;
  /** `config.noteheadMapping.overridesByKey`, if a config is in effect. */
  readonly overridesByKey?: Readonly<Record<string, string>>;
  /**
   * `config.noteheadMapping.defaultShape` (Phase 50/§8) -- the shape
   * family used when neither an explicit `<notehead>` nor a keyed
   * override matches. A shape FAMILY ('normal', 'x', 'diamond', ...)
   * rather than a glyph name, because the fill still has to follow the
   * duration: a default of one fixed glyph would draw a whole note as a
   * filled head. Omitted means 'normal'.
   */
  readonly defaultShape?: string;
}

/**
 * The full §9.7 selection: explicit XML notehead, then a config override
 * keyed by pitch/MIDI-note, then the plain duration default. Returns a real
 * SMuFL glyph name ready for Phase 5's getGlyph.
 */
export function selectNoteheadGlyphName(input: NoteheadSelectionInput): string {
  // A `smufl` attribute outranks the enumerated value it sits on, since
  // the value in that case is `other` -- the file saying "my shape is
  // not in the enumeration, read the attribute".
  if (
    input.explicitNoteheadSmufl !== undefined &&
    getGlyph(input.explicitNoteheadSmufl) !== undefined
  ) {
    return input.explicitNoteheadSmufl;
  }
  if (input.explicitNotehead !== undefined) {
    const shape = musicXmlNoteheadToShape(input.explicitNotehead);
    if (shape !== undefined) {
      const glyph = shapeGlyphNameOrUndefined(shape, input.durationType);
      if (glyph !== undefined) return glyph;
    }
    // 'normal', 'other' with no usable `smufl`, or a value we do not
    // recognize -- fall through to the tiers below. Never an exception:
    // see `musicXmlNoteheadToShape`.
  }

  const key = noteheadMappingKey(input.pitch, input.midiNote);
  const override = input.overridesByKey?.[key];
  if (override !== undefined) {
    return shapeGlyphName(override, input.durationType);
  }

  if (input.defaultShape !== undefined) {
    return shapeGlyphName(input.defaultShape, input.durationType);
  }
  return durationDefaultNotehead(input.durationType);
}
