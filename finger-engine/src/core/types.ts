/**
 * types.ts — the engine's data model (Plan Part 02).
 *
 * Conventions that hold EVERYWHERE in here, because getting one of
 * them wrong is a bug nobody can see in a diff:
 *
 *   [DM-01] string 1 is the LOWEST-pitched string. MusicXML numbers
 *           them the other way round; every entrance converts.
 *   [DM-02] fret 0 is the open string, counted from the nut.
 *   [DM-03] left-hand fingers are 1 index, 2 middle, 3 ring, 4 little,
 *           'T' thumb; an open string has no finger at all.
 *   [DM-06] a pitch is the MIDI number of the SOUNDING note.
 *   [DM-07] every event carries both its tick and its time in seconds.
 *   [DM-08] distances are millimetres.
 */

/** [DM-01] 1..numStrings, 1 = lowest-pitched. */
export type StringIndex = number;
/** [DM-02] 0 = open. */
export type Fret = number;
/** [DM-03] */
export type LHFinger = 1 | 2 | 3 | 4 | 'T';
/** [DM-04] p thumb, i index, m middle, a ring, c little, or a plectrum. */
export type RHFinger = 'p' | 'i' | 'm' | 'a' | 'c' | 'pick';

export interface InstrumentSpec {
  readonly kind: 'guitar';
  readonly numStrings: number;
  /** [DM-01] MIDI pitch of each open string; index 0 is string 1, the lowest. */
  readonly tuning: readonly number[];
  /** [DM-05] 0 = none. Frets below it cannot be fretted. */
  readonly capo: number;
  readonly numFrets: number;
  readonly scaleLengthMm: number;
  /** [GEO-04] string 1 to string N, at each end of the neck. */
  readonly nutSpacingMm: number;
  readonly bridgeSpacingMm: number;
}

export type Technique =
  | 'normal'
  | 'hammerOn'
  | 'pullOff'
  | 'slideIn'
  | 'slideOut'
  | 'slideLegato'
  | 'slideShift'
  | 'bend'
  | 'release'
  | 'preBend'
  | 'vibrato'
  | 'tap'
  | 'harmonicNatural'
  | 'harmonicArtificial'
  | 'palmMute'
  | 'deadNote'
  | 'letRing'
  | 'tieContinuation'
  | 'grace';

export interface TechniqueLink {
  readonly type: 'hammerOn' | 'pullOff' | 'slide' | 'tie';
  readonly toNoteId?: string;
  readonly fromNoteId?: string;
}

export interface BendSpec {
  readonly semitones: number;
  readonly points?: readonly { readonly t: number; readonly semitones: number }[];
}

export interface NoteEvent {
  /** [DM-09] stable across every stage and in the output. */
  readonly noteId: string;
  /** [DM-06] */
  readonly pitch: number;
  readonly tick: number;
  readonly durationTicks: number;
  /** [DM-07] seconds from content start. */
  readonly time: number;
  readonly duration: number;
  readonly velocity?: number;
  readonly voice?: number;
  /** What the SOURCE already decided, and the engine must not overrule (P-001..P-003). */
  readonly lockedString?: StringIndex;
  readonly lockedFret?: Fret;
  readonly lockedFinger?: LHFinger;
  readonly lockedRH?: RHFinger;
  readonly lockedPickDir?: 'down' | 'up';
  readonly techniques: readonly Technique[];
  readonly techniqueLinks?: readonly TechniqueLink[];
  readonly bend?: BendSpec;
  readonly sourceRef: {
    readonly format: 'musicxml' | 'midi';
    readonly part: string;
    readonly measure?: number;
    readonly index: number;
  };
  /** [IN-E03] the Notation Engine's own note ID, so a dot can be tied to the note on the staff. */
  readonly notationNoteId?: string;
}

export interface TimeSignatureChange {
  readonly tick: number;
  readonly numerator: number;
  readonly denominator: number;
}

export interface ParsedPart {
  readonly partId: string;
  readonly name: string;
  /** 0-based General MIDI program; 24..31 are the guitars. */
  readonly gmProgram?: number;
  /** Tuning, capo and so on as the FILE gives them -- not defaults. */
  readonly instrumentHint: Partial<InstrumentSpec>;
  readonly notes: readonly NoteEvent[];
  readonly tempoMap: import('./tempo.js').TempoMap;
  readonly timeSignatures: readonly TimeSignatureChange[];
  /** [P-007] true when any note arrived with both a string and a fret. */
  readonly hasTab: boolean;
}

/** [SV-01] one onset moment: what starts now, and what is still sounding. */
export interface Stage {
  readonly index: number;
  readonly time: number;
  readonly onsets: readonly NoteEvent[];
  readonly sustained: readonly NoteEvent[];
}

/** One note, placed on the fretboard. */
export interface Placement {
  readonly noteId: string;
  readonly string: StringIndex;
  readonly fret: Fret;
  /** null is a real answer: an open string, played by no finger. */
  readonly finger: LHFinger | null;
}

export interface Barre {
  readonly finger: LHFinger;
  readonly fret: Fret;
  readonly fromString: StringIndex;
  readonly toString: StringIndex;
}

/** One solver state: a way the hand could be holding this stage. */
export interface HandConfig {
  readonly placements: readonly Placement[];
  /** The fret under the index finger. Fractional while moving. */
  readonly handPos: number;
  readonly barre?: Barre;
  readonly staticCost: number;
  /** Kept for the debug report and for future weight learning. */
  readonly features: Readonly<Record<string, number>>;
}
