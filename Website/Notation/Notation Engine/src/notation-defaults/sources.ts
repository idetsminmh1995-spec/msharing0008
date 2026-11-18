/**
 * sources.ts — where the defaults in this folder come from.
 *
 * Every table in `notation-defaults/` is this engine's OWN expression of
 * a fact that is public: the General MIDI percussion key map, SMuFL
 * glyph names, the meaning of a MusicXML `<clef>` or `<notehead>`, the
 * open strings of a guitar, the arithmetic that puts a pitch on a staff
 * line. None of it is copied from another notation program's source, and
 * none of it carries another program's licence.
 *
 * The rule this folder keeps:
 *
 *   - A number that is a FACT -- a MIDI key number, a SMuFL glyph name,
 *     a standard tuning, a clef's pitch offset -- is stated once, here,
 *     with the public specification it comes from.
 *   - A number that is a HOUSE CHOICE -- how thick our staff line is,
 *     how much room a quarter note gets -- is stated once, here, as our
 *     own decision, with the reasoning beside it.
 *
 * Nothing in this folder draws anything, and nothing is a second copy of
 * a renderer's constant: the renderer reads these tables, so a value and
 * its justification sit together where a reviewer can check both.
 */

/** A public specification, standard or authority a table is read from. */
export interface PublicSource {
  /** Short name used in the tables below and in diagnostics. */
  readonly id: string;
  /** Full title, as the body that publishes it names it. */
  readonly title: string;
  /** Where to read it. */
  readonly url: string;
  /** What this engine takes from it. */
  readonly what: string;
}

/**
 * The public sources behind this folder.
 *
 * Kept to specifications and standards bodies rather than any one
 * notation program: a fact that only one program documents is that
 * program's editorial choice, not a standard, and belongs in an
 * override rather than in a default.
 */
export const PUBLIC_SOURCES = {
  gm1: {
    id: 'gm1',
    title: 'General MIDI 1 Sound Set — Percussion Key Map',
    url: 'https://www.midi.org/specifications/midi1-specifications/general-midi-specifications',
    what: 'the MIDI key number and English name of each standard percussion sound',
  },
  smufl: {
    id: 'smufl',
    title: 'Standard Music Font Layout (SMuFL) 1.4',
    url: 'https://www.w3.org/2021/03/smufl14/',
    what: 'canonical glyph names, and the meaning of each clef and notehead glyph',
  },
  smuflEngravingDefaults: {
    id: 'smuflEngravingDefaults',
    title: 'SMuFL 1.4 — engravingDefaults (as carried by the bundled font metadata)',
    url: 'https://www.w3.org/2021/03/smufl14/metadata/engravingdefaults.html',
    what: 'recommended engraving measurements, in staff spaces',
  },
  musicxml: {
    id: 'musicxml',
    title: 'MusicXML 4.0 (W3C Community Group Final Report)',
    url: 'https://www.w3.org/2021/06/musicxml40/',
    what: 'the meaning of <clef>, <notehead>, <display-step>/<display-octave> and divisions',
  },
  drumNotation: {
    id: 'drumNotation',
    title: 'Standard drum kit notation (common engraving practice)',
    url: 'https://en.wikipedia.org/wiki/Percussion_notation',
    what: 'which staff line each drum of a standard kit conventionally sits on',
  },
  tunings: {
    id: 'tunings',
    title: 'Standard instrument tunings (common practice)',
    url: 'https://en.wikipedia.org/wiki/Standard_tuning',
    what: 'open-string pitches for guitar, bass and related fretted instruments',
  },
  houseStyle: {
    id: 'houseStyle',
    title: 'M Sharing — house engraving style',
    url: '',
    what: "this project's own engraving decisions, stated as decisions",
  },
} as const satisfies Record<string, PublicSource>;

/** The id of one of `PUBLIC_SOURCES`. */
export type PublicSourceId = keyof typeof PUBLIC_SOURCES;

/** Where one table (or one field of one) came from. */
export interface DefaultsSource {
  /** A `PUBLIC_SOURCES` id. */
  readonly source: PublicSourceId;
  /** The symbol, table or section inside that source. */
  readonly symbol: string;
  /** What was taken from it, in one line. */
  readonly what: string;
}

/**
 * How confident this engine is in a value.
 *
 * `standard` means a published specification states it. `convention`
 * means it is settled common practice that no single spec pins down
 * (where a snare sits on a drum staff). `house` means it is this
 * project's own choice. There is no fourth level for a guess: a value
 * nobody can point at does not go in.
 */
export type Confidence = 'standard' | 'convention' | 'house';

/** The URL for a source id, for a reviewer or a diagnostic. */
export function sourceUrl(id: PublicSourceId): string {
  return PUBLIC_SOURCES[id].url;
}
