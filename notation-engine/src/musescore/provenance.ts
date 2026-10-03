/**
 * provenance.ts — where every number in this folder came from.
 *
 * This whole folder is a DATA layer, not an engine. Nothing here draws
 * anything, nothing here is imported by the renderer's hot path, and
 * nothing here was written from memory: every table is a re-expression,
 * in this project's own shapes and conventions, of a value read out of
 * the MuseScore Studio source at the revision below. Each table names
 * the file and the symbol it came from, so any one of them can be
 * re-checked against the same line of MuseScore in a minute.
 *
 * Why it is a separate folder: a number with a citation beside it can
 * be re-checked in a minute, and a number scattered through a renderer
 * cannot. It began as a second, independently-sourced answer to compare
 * the engine's own against -- and the comparison found eighteen drums,
 * two glyphs, a spacing law and a staff type where the two differed.
 *
 * The engine's defaults are these values now. The folder is still only
 * data, still draws nothing, and is still overridable field by field
 * through `config`; what changed is that saying nothing gets MuseScore's
 * answer instead of an answer assembled from engraving guides. The
 * scores being read were all written in MuseScore, and MusicXML carries
 * almost none of this.
 *
 * ## Licensing
 *
 * MuseScore Studio is GPL-3.0-only. No MuseScore code is copied into
 * this project: not a line of C++, not a header, not a build file. What
 * is recorded here is factual data -- the General MIDI percussion map,
 * SMuFL glyph names, clef definitions, standard instrument tunings,
 * and engraving measurements -- re-stated in this project's own
 * structures and prose. Facts are not copyrightable; the expression of
 * them here is this project's own. Anything that could only be
 * described as MuseScore's own creative selection (its instrument
 * catalogue, its translated strings, its sound fonts) is deliberately
 * NOT reproduced -- it is cited and left where it is.
 */

/**
 * The exact MuseScore revision every table here was read from.
 *
 * Pinned rather than "master": MuseScore moves, and a table that
 * silently means something different a year from now is worse than one
 * that is honestly out of date. Re-checking is a `git checkout` of this
 * commit away.
 */
export const MUSESCORE_REVISION = {
  repository: 'https://github.com/musescore/MuseScore',
  commit: '9140c5e4b7b5b48357b8d38dfebd0dd979653d21',
  committed: '2026-10-02',
  license: 'GPL-3.0-only',
} as const;

/**
 * Where one table (or one field of one) was read from.
 *
 * `path` is relative to the repository root, so it pastes straight onto
 * the end of `blobUrl()`; `symbol` is the function, table or element
 * that holds the value, because a path alone ages badly in a file of
 * several thousand lines.
 */
export interface MuseScoreSource {
  readonly path: string;
  readonly symbol: string;
  /** What was taken from it, in one line. */
  readonly what: string;
}

/** A link straight to the file this revision read, for a reviewer. */
export function blobUrl(source: MuseScoreSource): string {
  return `${MUSESCORE_REVISION.repository}/blob/${MUSESCORE_REVISION.commit}/${source.path}`;
}

/**
 * How confident this project is in a value.
 *
 * Only two levels, on purpose. `verified` means it was read out of the
 * MuseScore source at the revision above and can be pointed at.
 * `derived` means it follows from a verified value by arithmetic this
 * file states in full (a staff-line convention converted, a width
 * divided by a notehead). There is deliberately no third level for a
 * value someone thought was probably right: a guess does not go in.
 */
export type Confidence = 'verified' | 'derived';
