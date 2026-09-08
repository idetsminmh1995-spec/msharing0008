import type { Channel } from "./Channel";
import type { TinySoundFont } from "./TinySoundFont";
import type { Voice } from "./Voice";
/**
 * @internal
 */
export declare class Channels {
    activeChannel: number;
    channelList: Channel[];
    setupVoice(tinySoundFont: TinySoundFont, voice: Voice): void;
}
