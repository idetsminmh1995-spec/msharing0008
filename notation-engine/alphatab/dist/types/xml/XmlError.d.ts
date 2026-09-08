import { AlphaTabError } from "./../AlphaTabError";
/**
 * @internal
 */
export declare class XmlError extends AlphaTabError {
    xml: string;
    pos: number;
    constructor(message: string, xml: string, pos: number);
}
