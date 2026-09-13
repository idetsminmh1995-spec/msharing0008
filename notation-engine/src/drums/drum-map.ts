import { drumDiagnostic, type DrumDiagnostic } from './diagnostic.js';
import type { DrumMapEntryOverride } from '../config/config.js';

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
  readonly stemDirection?: 'up' | 'down';
  readonly articulation?: string;
}

export type DrumMappingTable = Readonly<Record<number, DrumMapEntry>>;

/**
 * §13.3's default GM table, covering the standard kit it names
 * explicitly. Positions are a representative, defensible default
 * ordering (low sounds low, cymbals high, feet below hands) confirmed
 * against several independent drum-notation guides -- but real practice
 * genuinely varies here ("notators vary to some degree on what
 * instrument each line represents," per one such guide), which is
 * exactly why §13.3 requires every field to be overridable via
 * `config.drums.mapping` rather than treating this table as a single
 * universal truth. Stem direction follows the hands-up/feet-down
 * convention multiple sources confirm with full agreement; notehead
 * shapes follow the equally-consistent oval=drum, x=cymbal/hi-hat,
 * diamond=bell-type-sound (ride bell, cowbell) convention.
 */
export const DEFAULT_DRUM_MAPPING_TABLE: DrumMappingTable = {
  35: {
    midiNote: 35,
    name: 'Acoustic Bass Drum',
    staffPosition: -0.5,
    noteheadShape: 'normal',
    stemDirection: 'down',
  },
  36: {
    midiNote: 36,
    name: 'Bass Drum 1',
    staffPosition: -0.5,
    noteheadShape: 'normal',
    stemDirection: 'down',
  },
  37: {
    midiNote: 37,
    name: 'Side Stick',
    staffPosition: -1.5,
    noteheadShape: 'x',
    stemDirection: 'up',
  },
  38: {
    midiNote: 38,
    name: 'Acoustic Snare',
    staffPosition: -1.5,
    noteheadShape: 'normal',
    stemDirection: 'up',
  },
  40: {
    midiNote: 40,
    name: 'Electric Snare',
    staffPosition: -1.5,
    noteheadShape: 'normal',
    stemDirection: 'up',
  },
  41: {
    midiNote: 41,
    name: 'Low Floor Tom',
    staffPosition: 0,
    noteheadShape: 'normal',
    stemDirection: 'up',
  },
  43: {
    midiNote: 43,
    name: 'High Floor Tom',
    staffPosition: -0.5,
    noteheadShape: 'normal',
    stemDirection: 'up',
  },
  45: {
    midiNote: 45,
    name: 'Low Tom',
    staffPosition: -1,
    noteheadShape: 'normal',
    stemDirection: 'up',
  },
  47: {
    midiNote: 47,
    name: 'Low-Mid Tom',
    staffPosition: -2,
    noteheadShape: 'normal',
    stemDirection: 'up',
  },
  48: {
    midiNote: 48,
    name: 'Hi-Mid Tom',
    staffPosition: -2.5,
    noteheadShape: 'normal',
    stemDirection: 'up',
  },
  50: {
    midiNote: 50,
    name: 'High Tom',
    staffPosition: -3,
    noteheadShape: 'normal',
    stemDirection: 'up',
  },
  42: {
    midiNote: 42,
    name: 'Closed Hi-Hat',
    staffPosition: -4,
    noteheadShape: 'x',
    stemDirection: 'up',
  },
  44: {
    midiNote: 44,
    name: 'Pedal Hi-Hat',
    staffPosition: -3.5,
    noteheadShape: 'x',
    stemDirection: 'down',
  },
  46: {
    midiNote: 46,
    name: 'Open Hi-Hat',
    staffPosition: -4,
    noteheadShape: 'x',
    stemDirection: 'up',
    articulation: 'open',
  },
  49: {
    midiNote: 49,
    name: 'Crash Cymbal 1',
    staffPosition: -5,
    noteheadShape: 'x',
    stemDirection: 'up',
  },
  57: {
    midiNote: 57,
    name: 'Crash Cymbal 2',
    staffPosition: -5.5,
    noteheadShape: 'x',
    stemDirection: 'up',
  },
  51: {
    midiNote: 51,
    name: 'Ride Cymbal 1',
    staffPosition: -4.5,
    noteheadShape: 'x',
    stemDirection: 'up',
  },
  53: {
    midiNote: 53,
    name: 'Ride Bell',
    staffPosition: -4.5,
    noteheadShape: 'diamond',
    stemDirection: 'up',
  },
  59: {
    midiNote: 59,
    name: 'Ride Cymbal 2 (edge)',
    staffPosition: -4.5,
    noteheadShape: 'x',
    stemDirection: 'up',
  },
  52: {
    midiNote: 52,
    name: 'Chinese Cymbal',
    staffPosition: -5,
    noteheadShape: 'x',
    stemDirection: 'up',
  },
  55: {
    midiNote: 55,
    name: 'Splash Cymbal',
    staffPosition: -5.5,
    noteheadShape: 'x',
    stemDirection: 'up',
  },
  56: {
    midiNote: 56,
    name: 'Cowbell',
    staffPosition: -4,
    noteheadShape: 'diamond',
    stemDirection: 'up',
  },
  54: {
    midiNote: 54,
    name: 'Tambourine',
    staffPosition: -4.5,
    noteheadShape: 'x',
    stemDirection: 'up',
  },
};

/** §13.3's error-condition fallback -- the middle line, a plain notehead, and a warning, never a dropped note. */
export const DRUM_FALLBACK_STAFF_POSITION = -2;
export const DRUM_FALLBACK_NOTEHEAD_SHAPE = 'normal';

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
      ...(override.articulation !== undefined
        ? { articulation: override.articulation }
        : existing?.articulation !== undefined
          ? { articulation: existing.articulation }
          : {}),
    };
  }
  return merged;
}
