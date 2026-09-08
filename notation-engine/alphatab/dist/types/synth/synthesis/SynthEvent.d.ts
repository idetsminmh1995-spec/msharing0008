import { type MidiEvent } from "./../../midi/MidiEvent";
/**
 * @internal
 */
export declare class SynthEvent {
    eventIndex: number;
    event: MidiEvent;
    readonly isMetronome: boolean;
    time: number;
    constructor(eventIndex: number, e: MidiEvent);
    static newMetronomeEvent(eventIndex: number, tick: number, counter: number, durationInTicks: number, durationInMillis: number): SynthEvent;
}
