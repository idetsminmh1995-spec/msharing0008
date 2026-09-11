import { isUnpitched, type Pitch } from '../core/pitch.js';
import type { DurationType } from '../core/duration.js';

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
  square: {
    whole: 'noteheadSquareWhite',
    half: 'noteheadSquareWhite',
    black: 'noteheadSquareBlack',
  },
  slash: {
    whole: 'noteheadSlashWhiteWhole',
    half: 'noteheadSlashWhiteHalf',
    black: 'noteheadSlashVerticalEnds',
  },
  plus: { whole: 'noteheadPlusWhole', half: 'noteheadPlusHalf', black: 'noteheadPlusBlack' },
};

/** The duration-appropriate glyph name for a shape family (e.g. 'x' + a quarter note -> 'noteheadXBlack'). */
export function shapeGlyphName(shape: string, durationType: DurationType): string {
  const fills = SHAPE_GLYPHS[shape];
  if (fills === undefined) {
    throw new Error(
      `Unknown notehead shape "${shape}". Supported: ${Object.keys(SHAPE_GLYPHS).join(', ')}.`,
    );
  }
  return fills[fillForDuration(durationType)];
}

/** The plain duration-based default notehead glyph -- priority 3 (lowest) in §9.7's selection order. */
export function durationDefaultNotehead(durationType: DurationType): string {
  return shapeGlyphName('normal', durationType);
}

/**
 * Maps a MusicXML `<notehead>` element's value to this phase's shape-family
 * key. `'normal'` (or an unrecognized/unhandled value) returns `undefined`,
 * meaning "no override" -- `'normal'` explicitly means "use the ordinary
 * duration-based notehead" per the MusicXML spec, so it is NOT an error;
 * throwing is reserved for values we don't have real support for at all
 * (better to say so than silently ignore what the file asked for).
 */
export function musicXmlNoteheadToShape(value: string): string | undefined {
  switch (value) {
    case 'normal':
      return undefined;
    case 'x':
    case 'diamond':
    case 'triangle':
    case 'square':
    case 'slash':
      return value;
    case 'circle-x':
      return 'circle-x';
    default:
      throw new Error(
        `MusicXML notehead value "${value}" is not supported yet. ` +
          `Supported: normal, x, diamond, triangle, square, slash, circle-x.`,
      );
  }
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
  /** GM MIDI note number, if known (unpitched notes only -- see noteheadMappingKey). */
  readonly midiNote?: number;
  /** `config.noteheadMapping.overridesByKey`, if a config is in effect. */
  readonly overridesByKey?: Readonly<Record<string, string>>;
}

/**
 * The full §9.7 selection: explicit XML notehead, then a config override
 * keyed by pitch/MIDI-note, then the plain duration default. Returns a real
 * SMuFL glyph name ready for Phase 5's getGlyph.
 */
export function selectNoteheadGlyphName(input: NoteheadSelectionInput): string {
  if (input.explicitNotehead !== undefined) {
    const shape = musicXmlNoteheadToShape(input.explicitNotehead);
    if (shape !== undefined) {
      return shapeGlyphName(shape, input.durationType);
    }
    // 'normal' -- fall through to the duration default below.
  }

  const key = noteheadMappingKey(input.pitch, input.midiNote);
  const override = input.overridesByKey?.[key];
  if (override !== undefined) {
    return shapeGlyphName(override, input.durationType);
  }

  return durationDefaultNotehead(input.durationType);
}
