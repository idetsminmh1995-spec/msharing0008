import { AlphaTabError } from "./../AlphaTabError";
/**
 * The exception thrown by a {@link ScoreImporter} in case the
 * binary data does not contain a reader compatible structure.
 * @public
 */
export declare class UnsupportedFormatError extends AlphaTabError {
    constructor(message?: string | null, inner?: Error);
}
