/**
 * @internal
 */
export declare class VersionInfo {
    static readonly version: string;
    static readonly date: string;
    static readonly commit: string;
    static print(print: (message: string) => void): void;
}
