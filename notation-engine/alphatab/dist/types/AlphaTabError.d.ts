/**
 * @public
 */
export declare enum AlphaTabErrorType {
    General = 0,
    Format = 1,
    AlphaTex = 2
}
/**
 * @public
 */
export declare class AlphaTabError extends Error {
    type: AlphaTabErrorType;
    constructor(type: AlphaTabErrorType, message?: string | null, inner?: Error);
}
