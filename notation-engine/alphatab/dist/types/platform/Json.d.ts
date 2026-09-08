/**
 * A cross platform implementation of the EcmaScript JSON standard implementation.
 * @partial
 * @internal
 */
export declare class Json {
    static quoteJsonString(text: string): string;
    private static _unicodeEscape;
    private static _jsonSingleCharacterEscapeSequences;
}
