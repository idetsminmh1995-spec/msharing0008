import { drumDiagnostic, type DrumDiagnostic } from './diagnostic.js';
import type { DrumMapEntryOverride } from '../config/config.js';
import { STANDARD_DRUM_KIT } from '../notation-defaults/drum-kit.js';
import { staffPositionFromLine } from '../notation-defaults/staff-position.js';

/**
 * §13.3's own specified shape. `staffPosition` uses the exact same
 * numeric scale `staffPositionForPitch` already does (Phase 9/10):
 * empirically confirmed here rather than assumed -- the bottom line is
 * 0, and each half-line-step UP the staff is -0.5 (so the middle line
 * of a 5-line staff is -2, matching `middleLineY(5)`).
 */
export interface DrumMapEntry {
  readonly midiNote: number;
  readonly name: string;
  readonly staffPosition: number;
  /** A notehead shape family name from §9.7's SHAPE_GLYPHS (Phase 15) -- e.g. 'normal', 'x', 'diamond' -- not a raw SMuFL glyph name. */
  readonly noteheadShape: string;
  /**
   * One exact SMuFL glyph, for a drum no shape family contains.
   *
   * The distinction this engine draws: most drums name a notehead
   * GROUP, which has a head for every duration, but a few name a single glyph
   * outright -- the china cymbal's `noteheadHeavyXHat`, the slap's
   * `noteheadSlashX`. When this is set it wins over `noteheadShape`,
   * and the note's own `<notehead>` still wins over both.
   */
  readonly noteheadGlyph?: string;
  readonly stemDirection?: 'up' | 'down';
  readonly articulation?: string;
}

export type DrumMappingTable = Readonly<Record<number, DrumMapEntry>>;

/**
 * §13.3's error-condition fallback -- the middle line, a plain notehead,
 * and a warning, never a dropped note.
 *
 * Declared ABOVE the table rather than beside the function that reports
 * the diagnostic, because the table is built when this module loads and
 * reads the fallback: a `const` declared after it is still in its
 * temporal dead zone at that moment, and the drum that needed it came
 * out with no notehead at all.
 */
export const DRUM_FALLBACK_STAFF_POSITION = -2;
export const DRUM_FALLBACK_NOTEHEAD_SHAPE = 'normal';

/**
 * The kit, built from `notation-defaults/drum-kit.ts`.
 *
 * Every score this engine is given was written in a program that stores a
 * drum note as a General MIDI key number and nothing else, so the staff
 * line and notehead have to come from the engine. The table they come
 * from is the standard 61-key GM kit, stated once in
 * `notation-defaults/drum-kit.ts` with its sources, and converted out of
 * that file's top-down line numbers into this engine's bottom-up staff
 * positions here.
 *
 * It is fully overridable, and that matters: §13.3's point -- that
 * notators genuinely vary -- is true, and a kit of the owner's own goes in
 * `config.drums.mapping`, or through
 * `NotationDefaults.drumMapping({ overrides })`. What the default table
 * gives is the answer to someone who says nothing.
 */
function standardDrumTable(staffLines = 5): DrumMappingTable {
  const table: Record<number, DrumMapEntry> = {};
  for (const drum of STANDARD_DRUM_KIT) {
    table[drum.pitch] = {
      midiNote: drum.pitch,
      name: drum.name,
      staffPosition: staffPositionFromLine(drum.line, staffLines),
      noteheadShape: drum.notehead,
      stemDirection: drum.stemDirection,
      ...(drum.noteheadGlyph !== undefined ? { noteheadGlyph: drum.noteheadGlyph } : {}),
    };
  }
  return table;
}

export const DEFAULT_DRUM_MAPPING_TABLE: DrumMappingTable = standardDrumTable();

export interface LookupDrumMapEntryResult {
  readonly entry: DrumMapEntry;
  readonly diagnostics: readonly DrumDiagnostic[];
}

/**
 * §13.3: looks up a GM MIDI note number in the given table (typically
 * `DEFAULT_DRUM_MAPPING_TABLE` merged with `config.drums.mapping`
 * overrides). A note outside the documented 35-81 GM percussion range,
 * or one inside that range but simply absent from the table, both fall
 * back to the same middle-line/plain-notehead default with a warning --
 * the note is never dropped.
 */
export function lookupDrumMapEntry(
  midiNote: number,
  table: DrumMappingTable,
): LookupDrumMapEntryResult {
  const entry = table[midiNote];
  if (entry !== undefined) {
    return { entry, diagnostics: [] };
  }

  const outOfRange = midiNote < 35 || midiNote > 81;
  const code = outOfRange ? 'DRUM_NOTE_OUT_OF_RANGE' : 'DRUM_NOTE_UNMAPPED';
  const message = outOfRange
    ? `MIDI note ${midiNote} is outside the GM percussion range (35-81); using the default notehead on the middle line.`
    : `MIDI note ${midiNote} has no entry in the drum mapping table; using the default notehead on the middle line.`;

  return {
    entry: {
      midiNote,
      name: `Unmapped (${midiNote})`,
      staffPosition: DRUM_FALLBACK_STAFF_POSITION,
      noteheadShape: DRUM_FALLBACK_NOTEHEAD_SHAPE,
    },
    diagnostics: [drumDiagnostic('warning', code, message)],
  };
}

/**
 * §13.3: "every field is overridable via config.drums.mapping." Merges
 * `config.drums.mapping` overrides onto `DEFAULT_DRUM_MAPPING_TABLE`,
 * entry by entry and field by field -- a partial override for a GM note
 * already in the default table only replaces the fields it names,
 * keeping the default's own value for anything it omits; a GM note not
 * in the default table at all can still be added wholesale via an
 * override that supplies every required field.
 */
export function mergeDrumMappingTable(
  overrides: Readonly<Record<number, DrumMapEntryOverride>> | undefined,
): DrumMappingTable {
  if (overrides === undefined) return DEFAULT_DRUM_MAPPING_TABLE;

  const merged: Record<number, DrumMapEntry> = { ...DEFAULT_DRUM_MAPPING_TABLE };
  for (const [key, override] of Object.entries(overrides)) {
    const midiNote = Number(key);
    const existing = merged[midiNote];
    merged[midiNote] = {
      midiNote,
      name: override.name ?? existing?.name ?? `Note ${midiNote}`,
      staffPosition:
        override.staffPosition ?? existing?.staffPosition ?? DRUM_FALLBACK_STAFF_POSITION,
      noteheadShape:
        override.noteheadShape ?? existing?.noteheadShape ?? DRUM_FALLBACK_NOTEHEAD_SHAPE,
      ...(override.stemDirection !== undefined
        ? { stemDirection: override.stemDirection }
        : existing?.stemDirection !== undefined
          ? { stemDirection: existing.stemDirection }
          : {}),
      ...(override.noteheadGlyph !== undefined
        ? { noteheadGlyph: override.noteheadGlyph }
        : override.noteheadShape === undefined && existing?.noteheadGlyph !== undefined
          ? { noteheadGlyph: existing.noteheadGlyph }
          : {}),
      ...(override.articulation !== undefined
        ? { articulation: override.articulation }
        : existing?.articulation !== undefined
          ? { articulation: existing.articulation }
          : {}),
    };
  }
  return merged;
}
