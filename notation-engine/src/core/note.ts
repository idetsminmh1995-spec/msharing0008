import type { Duration } from './duration.js';
import type { Pitch } from './pitch.js';

/**
 * Voice number within a Part -- matches MusicXML's <voice> element. Phase
 * 31/32 build real multi-voice handling (collision avoidance, rest
 * separation) on top of this; here it's just an identifying number.
 */
export type VoiceId = number;

/**
 * §9.19's five articulation types. Declared HERE, in the layer that owns
 * the `Note` they attach to, and re-exported by `geometry/articulation.ts`
 * -- one declaration, not two that can silently drift apart. (The same
 * non-conflicting re-export situation `geometry/flag.ts` already has with
 * `DurationType`, which is why `export *` from both layers in `index.ts`
 * stays unambiguous: both names resolve to this single declaration.)
 */
export type ArticulationType = 'accent' | 'staccato' | 'tenuto' | 'marcato' | 'staccatissimo';

/** §9.20's ornament types -- declared here for the same reason as ArticulationType above. */
export type OrnamentType = 'trill' | 'mordent' | 'turn' | 'turnInverted';

/**
 * One `<beam number="N">` hint exactly as the file wrote it (§10.4).
 * §10.8 names "beams given explicitly via `<beam>` vs. left for the
 * renderer to infer" as a real cross-software divergence: a file that
 * states its own beaming is the authority on it, and this is that
 * statement, carried through unmodified rather than thrown away and
 * re-inferred.
 */
export interface BeamHint {
  /** The beam LEVEL (1 = primary/eighth beam, 2 = sixteenth, ...), from the element's `number` attribute. Defaults to 1 when absent. */
  readonly number: number;
  readonly value: 'begin' | 'continue' | 'end' | 'forward hook' | 'backward hook';
}

/**
 * One `<lyric>` syllable attached to a note (§9.22/§10.4). The syllable
 * TEXT is carried here even though §9.22's renderer cannot draw it yet
 * (Bravura has no Latin letters at all, a documented known limitation):
 * §10.7's "no silent data loss" rule means the parser's job is to
 * preserve it regardless of whether a later stage can currently use it.
 */
export interface LyricSyllable {
  /** Verse number, from the element's `number` attribute. Defaults to 1 when absent. */
  readonly number: number;
  readonly syllabic?: 'single' | 'begin' | 'middle' | 'end';
  readonly text: string;
  /** `<extend/>` -- this syllable continues as a melisma over following notes. */
  readonly extend: boolean;
}

/**
 * A single sounding note -- pitched or unpitched, doesn't matter, both use
 * this same type (see pitch.ts). Multiple Notes at the same tick within the
 * same Voice form a Chord (see chord.ts); a bare Note is always exactly one
 * notehead on its own.
 */
export interface Note {
  readonly kind: 'note';
  readonly pitch: Pitch;
  readonly duration: Duration;
  readonly voice: VoiceId;
  /**
   * Staff number within the Part, for multi-staff instruments like piano
   * (Phase 15's grand staff). Omitted means "the part's only staff."
   */
  readonly staff?: number;
  /**
   * Where this event starts within its measure, in ticks.
   *
   * Set by the parser from §10.1's own cursor, which honours `<backup>`
   * and `<forward>`. It is NOT redundant with summing the durations
   * before it: a voice can legitimately have GAPS (a `<forward>` skips
   * time without writing a rest, which is how MuseScore writes a kick
   * drum that plays on beats 1 and 3 and nothing in between) and can
   * legitimately start partway into the measure. Summing durations
   * silently pulls every event after a gap too early -- on this
   * project's own drum file that put the kick's beamed pair on beat 2
   * instead of beat 3.
   *
   * Optional because a hand-built `Score` (tests, a future editor) may
   * not set it; consumers fall back to the running sum, which is exactly
   * right for a voice with no gaps.
   */
  readonly startTick?: number;
  readonly tieStart?: boolean;
  readonly tieStop?: boolean;
  /** Phase 35/§10.4: the <instrument id="..."> this note references, if any -- how a drum file distinguishes kick from snare from hi-hat, and (Phase 41) the key into a part's own GM note mapping. */
  readonly instrumentId?: string;
  /** Phase 35/§10.4: an explicit <notehead> override from the file (e.g. "x", "diamond") -- Phase 15's selectNoteheadGlyphName's highest-priority tier. */
  readonly explicitNotehead?: string;
  /** The same `<notehead>`'s `smufl` attribute -- MusicXML's `other` value names its shape there instead of in the enumeration. Used as a glyph name directly. */
  readonly explicitNoteheadSmufl?: string;
  /** Phase 35/§10.4: true if this note is a <grace/> note. */
  readonly isGrace?: boolean;
  /** Phase 35/§10.4: the grace note's slash attribute -- true for an acciaccatura, false for an appoggiatura. Meaningless unless isGrace is true. */
  readonly graceSlash?: boolean;
  /** Phase 35/§10.4: an explicit <stem> direction from the file -- Phase 16's resolveStemDirection explicitDirection tier. */
  readonly explicitStemDirection?: 'up' | 'down';
  /** Phase 35/§10.4: an explicit <accidental> element's presence -- Phase 19's evaluateAccidental hasExplicitAccidental (courtesy-accidental) parameter. */
  readonly hasExplicitAccidental?: boolean;
  /** Integration C: which string a tablature note is played on (1 = highest-pitched string, drawn on the TOP line). */
  readonly stringNumber?: number;
  /** Integration C: which fret, 0 meaning an open string. */
  readonly fret?: number;
  /** Phase 35 Tier 2/§10.4: `<notations><articulations>` -- §9.19's marks, in document order. Absent means none. */
  readonly articulations?: readonly ArticulationType[];
  /** Phase 35 Tier 2/§10.4: `<notations><ornaments>` -- §9.20's marks, in document order. Absent means none. */
  readonly ornaments?: readonly OrnamentType[];
  /** Phase 35 Tier 2/§10.4: `<notations><fermata>`. Parsed and preserved; §9 has no fermata placement section yet, so nothing draws it (see Doc/phase-35-musicxml-parser-v2-tier23.md). */
  readonly hasFermata?: boolean;
  /** Phase 35 Tier 2/§10.4: the `<slur type="start">` numbers beginning at this note (§9.16). */
  readonly slurStarts?: readonly number[];
  /** Phase 35 Tier 2/§10.4: the `<slur type="stop">` numbers ending at this note (§9.16). */
  readonly slurStops?: readonly number[];
  /** Phase 35 Tier 2/§10.4: `<notations><tuplet type="start">` (§9.17). */
  readonly tupletStart?: boolean;
  /** Phase 35 Tier 2/§10.4: `<notations><tuplet type="stop">` (§9.17). */
  readonly tupletStop?: boolean;
  /** Phase 35 Tier 2/§10.4/§10.8: the file's own `<beam>` hints for this note, if it gave any. */
  readonly beams?: readonly BeamHint[];
  /** Phase 35 Tier 2/§10.4: `<lyric>` syllables attached to this note (§9.22). */
  readonly lyrics?: readonly LyricSyllable[];
}

export interface NoteInit {
  pitch: Pitch;
  duration: Duration;
  voice: VoiceId;
  staff?: number;
  tieStart?: boolean;
  tieStop?: boolean;
  explicitNotehead?: string;
  explicitNoteheadSmufl?: string;
  instrumentId?: string;
  isGrace?: boolean;
  graceSlash?: boolean;
  explicitStemDirection?: 'up' | 'down';
  hasExplicitAccidental?: boolean;
  stringNumber?: number;
  fret?: number;
  articulations?: readonly ArticulationType[];
  ornaments?: readonly OrnamentType[];
  hasFermata?: boolean;
  slurStarts?: readonly number[];
  slurStops?: readonly number[];
  tupletStart?: boolean;
  tupletStop?: boolean;
  beams?: readonly BeamHint[];
  lyrics?: readonly LyricSyllable[];
}

export function note(init: NoteInit): Note {
  return { kind: 'note', ...init };
}
