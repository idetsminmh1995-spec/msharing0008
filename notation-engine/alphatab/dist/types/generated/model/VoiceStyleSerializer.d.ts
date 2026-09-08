import { VoiceStyle } from "./../../model/Voice";
/**
 * @internal
 */
export declare class VoiceStyleSerializer {
    static fromJson(obj: VoiceStyle, m: unknown): void;
    static toJson(obj: VoiceStyle | null | undefined): Map<string, unknown> | null;
    static setProperty(obj: VoiceStyle, property: string, v: unknown): boolean;
}
