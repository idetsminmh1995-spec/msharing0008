import { LogLevel } from "./LogLevel";
/**
 * @public
 */
export interface ILogger {
    debug(category: string, msg: string, ...details: unknown[]): void;
    warning(category: string, msg: string, ...details: unknown[]): void;
    info(category: string, msg: string, ...details: unknown[]): void;
    error(category: string, msg: string, ...details: unknown[]): void;
}
/**
 * @public
 */
export declare class ConsoleLogger implements ILogger {
    static logLevel: LogLevel;
    private static _format;
    debug(category: string, msg: string, ...details: unknown[]): void;
    warning(category: string, msg: string, ...details: unknown[]): void;
    info(category: string, msg: string, ...details: unknown[]): void;
    error(category: string, msg: string, ...details: unknown[]): void;
}
/**
 * @public
 */
export declare class Logger {
    static logLevel: LogLevel;
    static log: ILogger;
    private static _shouldLog;
    static debug(category: string, msg: string, ...details: unknown[]): void;
    static warning(category: string, msg: string, ...details: unknown[]): void;
    static info(category: string, msg: string, ...details: unknown[]): void;
    static error(category: string, msg: string, ...details: unknown[]): void;
}
