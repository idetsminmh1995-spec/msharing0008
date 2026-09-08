/**
 * Represents the lyrics of a song.
 * @public
 */
export declare class Lyrics {
    private static readonly _charCodeLF;
    private static readonly _charCodeTab;
    private static readonly _charCodeCR;
    private static readonly _charCodeSpace;
    private static readonly _charCodeBrackedClose;
    private static readonly _charCodeBrackedOpen;
    private static readonly _charCodeDash;
    /**
     * Gets or sets he start bar on which the lyrics should begin.
     */
    startBar: number;
    /**
     * Gets or sets the raw lyrics text in Guitar Pro format.
     * (spaces split word syllables, plus merge syllables, [..] are comments)
     */
    text: string;
    /**
     * Gets or sets the prepared chunks of the lyrics to apply to beats.
     */
    chunks: string[];
    finish(skipEmptyEntries?: boolean): void;
    private _parse;
    private _addChunk;
    private _prepareChunk;
}
