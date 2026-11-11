import type { Duration } from './duration.js';
import type { FermataPlacement, FermataShape, VoiceId } from './note.js';
import type { PitchStep } from './pitch.js';
/** A silence -- has a Duration and a Voice, but no Pitch at all (not even an unpitched display position). */
export interface Rest {
    readonly kind: 'rest';
    readonly duration: Duration;
    readonly voice: VoiceId;
    readonly staff?: number;
    /** MusicXML `<rest><display-step>` paired with displayOctave when explicitly positioned. */
    readonly displayStep?: PitchStep;
    /** MusicXML `<rest><display-octave>` paired with displayStep when explicitly positioned. */
    readonly displayOctave?: number;
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
    /** MusicXML `<notations><fermata>` presence; rests can carry a fermata exactly as notes can. */
    readonly hasFermata?: boolean;
    /** MusicXML's upright/inverted fermata orientation; omitted means upright. */
    readonly fermataPlacement?: FermataPlacement;
    /** MusicXML fermata shape when a matching Bravura glyph exists; omitted means normal. */
    readonly fermataShape?: FermataShape;
}
export interface RestInit {
    duration: Duration;
    voice: VoiceId;
    staff?: number;
    displayStep?: PitchStep;
    displayOctave?: number;
    hasFermata?: boolean;
    fermataPlacement?: FermataPlacement;
    fermataShape?: FermataShape;
}
export declare function rest(init: RestInit): Rest;
