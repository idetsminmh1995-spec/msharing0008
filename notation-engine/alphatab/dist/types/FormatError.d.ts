import { AlphaTabError } from "./AlphaTabError";
/**
 * An invalid input format was detected (e.g. invalid setting values, file formats,...)
 * @public
 */
export declare class FormatError extends AlphaTabError {
    constructor(message: string);
}
