/**
 * The instrument-neutral mapping layer's contract.
 *
 * PLAN.md Part E: the engine must render a note-bearing part of ANY
 * instrument without dropping it just because no profile names that
 * instrument. Everything here is about the two facts a notehead needs --
 * WHICH STAFF POSITION and WHICH GLYPH -- plus the optional stem
 * direction a percussion profile may pin, and nothing else.
 *
 * The one invariant that shapes every type below: **mapping never touches
 * the music.** It does not change the parsed `<pitch>`, the rhythm, the
 * sounding pitch, or playback. A transposing instrument is DRAWN at its
 * written pitch (the file's own), and Part D's `soundingPitch()` is what
 * moves the MIDI numbers a host plays. A profile that moved the drawn
 * note to suit a transposition would be the engine disagreeing with the
 * file about its own notation, which is exactly what §10.8 forbids.
 */

import type { DurationType } from '../core/duration.js';
import type { Pitch } from '../core/pitch.js';
import type { ClefDefinition } from '../geometry/clef.js';
import type { DrumMappingTable } from '../drums/drum-map.js';
import type { StemDirection } from '../notation-defaults/drum-kit.js';
import type { MappingDiagnostic } from './diagnostic.js';

/**
 * Which tier decided one rendering fact, so a caller (and a test) can see
 * that the documented precedence actually held rather than inferring it
 * from the output.
 *
 * The order is the §10.8 order, most authoritative first:
 *
 *  1. `explicit-file` -- the file stated it (`<display-step>`, a
 *     `<notehead>`, a `<stem>`). The file is the authority on its own
 *     notation; nothing below may move what it placed.
 *  2. `user-override` -- `config.noteheadMapping.overridesByKey`, the
 *     caller's own opinion for this pitch/instrument.
 *  3. `instrument-profile` -- the profile that matched this part (a drum
 *     kit's table, a tablature staff's string line).
 *  4. `fallback` -- the documented default when nothing above spoke, plus
 *     a diagnostic where the fallback is a recovery rather than a plain
 *     default.
 */
export type MappingSource = 'explicit-file' | 'user-override' | 'instrument-profile' | 'fallback';

/** The three facts a profile resolves for one note. */
export interface MappingNoteResult {
  /** This engine's bottom-up staff position (bottom line 0, up negative). */
  readonly staffPosition: number;
  readonly staffPositionSource: MappingSource;
  /** A real SMuFL glyph name, ready for `getGlyph`. */
  readonly noteheadGlyph: string;
  readonly noteheadSource: MappingSource;
  /** Set only when a profile pins a stem direction (percussion); absent means "let the stem rule decide". */
  readonly stemDirection?: StemDirection;
  readonly stemSource?: MappingSource;
}

/**
 * Everything a profile reads to resolve one note. Assembled once by the
 * renderer from the note, its staff's clef/line-count, and the config --
 * so a profile is a pure function of data it was handed, with no reach
 * into the renderer's own state.
 */
export interface MappingContext {
  readonly pitch: Pitch;
  readonly durationType: DurationType;
  /** `<notehead filled="...">`, if the file stated one. */
  readonly filled?: boolean;
  /** This staff's line count (from `<staff-lines>`), defaulting to 5. */
  readonly staffLines: number;
  /** The clef in effect on this note's staff. */
  readonly clef: ClefDefinition;
  /**
   * This part's name (`<part-name>`), if it has one. A `MappingProfile`'s
   * `match.instrumentName` is compared against this -- the only
   * instrument identity the engine carries, since the core `Part` type is
   * deliberately instrument-agnostic.
   */
  readonly instrumentName?: string;
  /** `<instrument id="...">` this note references, if any. */
  readonly instrumentId?: string;
  /** The GM note number that instrument resolves to, if the part maps one. */
  readonly gmNote?: number;
  /** True when an unpitched note's `<unpitched>` carried both a display-step and -octave. */
  readonly hasExplicitDisplayPosition?: boolean;
  /** `<notehead>` from the file (e.g. "x", "diamond"). */
  readonly explicitNotehead?: string;
  /** That `<notehead>`'s `smufl` attribute, used as a glyph name directly. */
  readonly explicitNoteheadSmufl?: string;
  /** `<stem>` from the file. */
  readonly explicitStemDirection?: StemDirection;
  /** `<notations><harmonic>` -- a diamond head unless the file stated one. */
  readonly isHarmonic?: boolean;
  /** `config.noteheadMapping.overridesByKey` (the user's own per-pitch opinion). */
  readonly overridesByKey?: Readonly<Record<string, string>>;
  /** `config.noteheadMapping.defaultShape` -- the shape family used when nothing more specific matches. */
  readonly defaultShape?: string;
  /** The drum table (default kit merged with `config.drums.mapping`) an unpitched profile reads. */
  readonly drumMap: DrumMappingTable;
}

/**
 * One instrument family's way of resolving a note's notation.
 *
 * `matches` decides whether this profile is the right one for a context;
 * `resolve` produces the three facts. A profile that matches but has
 * nothing to say returns the generic answer, so the registry can keep a
 * flat ordered list rather than a decision tree.
 */
export interface InstrumentProfile {
  /** This engine's own stable id, e.g. `generic-pitched`, `unpitched-percussion`. */
  readonly id: string;
  /** One line for a diagnostic or a doc table. */
  readonly description: string;
  matches(ctx: MappingContext): boolean;
  resolve(ctx: MappingContext): MappingNoteResult;
}

/** What `MappingRegistry.resolve` returns: the note's facts plus how they were reached. */
export interface MappingResolution {
  readonly note: MappingNoteResult;
  /** The id of the profile that resolved this note (`generic-pitched` when only the fallback matched). */
  readonly profileId: string;
  readonly diagnostics: readonly MappingDiagnostic[];
}
