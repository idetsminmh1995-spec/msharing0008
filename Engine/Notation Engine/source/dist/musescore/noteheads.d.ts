/**
 * noteheads.ts -- which SMuFL glyph MuseScore draws for a notehead.
 *
 * Two tables, and the gap between them is the point.
 *
 * The first is MuseScore's own notehead groups: for each group, the
 * glyph it uses for a whole, a half, a quarter (every shorter duration
 * takes the quarter's filled head) and a breve. Almost every group is
 * the same whichever way the stem points; the few that are not say so
 * with `upStem`, because an arrow notehead has to point away from its
 * own stem.
 *
 * The second is how MuseScore reads a MusicXML `<notehead>` element.
 * It holds the trap this project has already been bitten by once and
 * which is worth stating twice: MusicXML's "cross" is the PLUS shape
 * (+) and MusicXML's "x" is the X. Reading them the other way round
 * turns every hi-hat in a drum chart into a plus sign, and the file
 * itself gives no hint that anything is wrong.
 */
import type { MuseScoreSource } from './provenance.js';
export declare const NOTEHEAD_GROUP_SOURCE: MuseScoreSource;
export declare const NOTEHEAD_ENUM_SOURCE: MuseScoreSource;
export declare const MUSICXML_NOTEHEAD_SOURCE: MuseScoreSource;
/** MuseScore's `NoteHeadType`: which of a group's four glyphs to take. */
export type MuseScoreHeadType = 'whole' | 'half' | 'quarter' | 'breve';
export interface MuseScoreNoteheadGroup {
    /** MuseScore's own `NoteHeadGroup` enumerator name. */
    readonly group: string;
    /** whole, half, quarter, breve -- the glyphs for a DOWN stem (and for no stem). */
    readonly glyphs: Readonly<Record<MuseScoreHeadType, string>>;
    /** Only where an UP stem changes the glyph; absent means it does not. */
    readonly upStem?: Readonly<Record<MuseScoreHeadType, string>>;
}
/**
 * Every notehead group a MusicXML file or a drumset can reach.
 *
 * MuseScore's full table goes on past these into solfege names, pitch
 * names, German pitch names and Swiss rudiment heads -- schemes that
 * are chosen in MuseScore's own UI and that no MusicXML file asks for,
 * so they are cited and left there rather than copied.
 */
export declare const MUSESCORE_NOTEHEAD_GROUPS: readonly MuseScoreNoteheadGroup[];
/**
 * The glyph MuseScore draws for one group, head type and stem.
 *
 * `stem` defaults to 'down' because that is the column MuseScore keeps
 * every stem-independent group in; passing 'up' only changes the answer
 * for the groups that have an `upStem` row at all.
 */
export declare function museScoreNoteheadGlyph(group: string, headType: MuseScoreHeadType, stem?: 'up' | 'down'): string | undefined;
/**
 * MusicXML's `<notehead>` values, as MuseScore reads them.
 *
 * Verbatim in its coverage: a value MuseScore does not list here falls
 * back to the normal head in its importer, and this map says so by not
 * holding the key rather than by inventing a group for it.
 */
export declare const MUSICXML_NOTEHEAD_TO_GROUP: Readonly<Record<string, string>>;
/** MuseScore's notehead group for a MusicXML `<notehead>` value, or undefined. */
export declare function museScoreGroupForMusicXmlNotehead(value: string): string | undefined;
