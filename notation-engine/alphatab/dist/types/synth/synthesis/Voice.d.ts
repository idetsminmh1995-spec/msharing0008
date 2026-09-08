import type { Region } from "./Region";
import type { TinySoundFont } from "./TinySoundFont";
import { VoiceEnvelope } from "./VoiceEnvelope";
import { VoiceLfo } from "./VoiceLfo";
import { VoiceLowPass } from "./VoiceLowPass";
import type { Channel } from "./Channel";
/**
 * @internal
 */
export declare class Voice {
    /**
     * The lower this block size is the more accurate the effects are.
     * Increasing the value significantly lowers the CPU usage of the voice rendering.
     * If LFO affects the low-pass filter it can be hearable even as low as 8.
     */
    static readonly renderEffectSampleBlock: number;
    playingPreset: number;
    playingKey: number;
    playingChannel: number;
    region: Region | null;
    pitchInputTimecents: number;
    pitchOutputFactor: number;
    sourceSamplePosition: number;
    noteGainDb: number;
    panFactorLeft: number;
    panFactorRight: number;
    playIndex: number;
    loopStart: number;
    loopEnd: number;
    ampEnv: VoiceEnvelope;
    modEnv: VoiceEnvelope;
    lowPass: VoiceLowPass;
    modLfo: VoiceLfo;
    vibLfo: VoiceLfo;
    mixVolume: number;
    mute: boolean;
    updatePitchRatio(c: Channel, outSampleRate: number): void;
    calcPitchRatio(pitchShift: number, outSampleRate: number): void;
    end(outSampleRate: number): void;
    endQuick(outSampleRate: number): void;
    render(f: TinySoundFont, outputBuffer: Float32Array, offset: number, numSamples: number, isMuted: boolean): void;
    kill(): void;
}
