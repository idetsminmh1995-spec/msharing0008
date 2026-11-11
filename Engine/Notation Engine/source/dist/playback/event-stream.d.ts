import type { Score } from '../core/index.js';
import type { TempoMap } from '../timing/tempo-map.js';
/**
 * PLAN.md §17.1: one notated event -- a bare note, or a chord (whose
 * several `noteIds` sound together) -- at the GLOBAL tick it starts on,
 * resolved to real seconds via §12's tempo map. A rest never appears
 * here; it has nothing for a host to highlight or trigger. This is the
 * stream a host app drives animation, note-highlighting or an audio
 * trigger from -- see §17.3: the engine only produces the data, it never
 * touches audio/video/animation itself.
 */
export interface NotationEvent {
    readonly tick: number;
    readonly seconds: number;
    /** MusicXML part ID for selecting or routing this event as one playback track. */
    readonly partId: string;
    /**
     * One id per notehead sounding at this tick in this (part, voice) --
     * length 1 for a bare note, one per member for a chord. Built as
     * `${partId}#m${measureNumber}#v${voiceId}#e${eventIndexInVoice}`,
     * with `#n${noteIndexInChord}` appended for a chord member. Stable and
     * deterministic for identical input (§4.4) -- not a randomly generated
     * id, so re-rendering the same file always produces the same ids, and
     * a host can safely persist them (e.g. "the note the user clicked").
     */
    readonly noteIds: readonly string[];
    /**
     * Populated only once a host runs §13's MIDI<->MusicXML alignment
     * (Phase 42) and threads its result back in. `renderFromMusicXml` has
     * no MIDI file to align against, so its own event stream never sets
     * this -- left as a documented gap rather than guessed at.
     */
    readonly midiNotes?: readonly number[];
    readonly measureNumber: number;
}
/**
 * The id of ONE notated event -- the `data-id` its `<g>` carries in the
 * rendered SVG (Phase 51/§18.3) and the stem every `noteIds` entry below
 * is built from.
 *
 * Exported because two independent places need the exact same string: the
 * renderer, which stamps it on the group it draws, and the event stream,
 * which reports it to a host. A second implementation of this format is
 * precisely the bug that would make note-highlighting silently miss.
 */
export declare function notationEventId(partId: string, measureNumber: number, voiceId: number, eventIndex: number): string;
/**
 * The rendered element a `noteId` belongs to: a chord member's
 * `...#e3#n1` lives inside the chord's own `...#e3` group, since a chord
 * is drawn as one element with several noteheads. A bare note's id is
 * already its element's.
 */
export declare function elementIdForNoteId(noteId: string): string;
/**
 * Builds the full, score-wide, tick-sorted event stream. `globalTickOffsetByMeasure`
 * must be the SAME measure -> tick-offset map `positionToX`/`xToPosition`
 * use (see `computePlaybackData`, which passes the one map to both) --
 * that is what keeps an event's own `tick` and the tick a cursor would
 * seek to reach it in exact agreement, never two independently-computed
 * numbers that could drift apart.
 */
export declare function buildEventStream(score: Score, globalTickOffsetByMeasure: ReadonlyMap<number, number>, tempoMap: TempoMap): readonly NotationEvent[];
/** §17.1's own `getEventStream()` -- a plain accessor kept as an exported function (rather than reading `playback.events` directly) so the public shape matches the spec's own pseudocode exactly. */
export declare function getEventStream(playback: {
    readonly events: readonly NotationEvent[];
}): readonly NotationEvent[];
/** Return the score-wide event stream for one MusicXML part/track, preserving the original tick order. */
export declare function getTrackEventStream(playback: {
    readonly events: readonly NotationEvent[];
}, partId: string): readonly NotationEvent[];
