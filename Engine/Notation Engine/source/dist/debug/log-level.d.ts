import type { LogLevel } from '../config/index.js';
/**
 * §18.3: "A single `Diagnostic[]` channel (§10.7) rather than scattered
 * `console.log`. Severity-filtered by `config.debug.logLevel`."
 *
 * Typed structurally (anything carrying a `severity`) rather than against
 * `parser/`'s own `Diagnostic`, so this module depends on nothing but
 * `config/` -- and so the same filter works on `drums/`'s
 * `DrumDiagnostic`, which has the same three severities and a different
 * shape.
 */
export interface HasSeverity {
    readonly severity: 'error' | 'warning' | 'info';
}
/** Whether one diagnostic survives `level`. */
export declare function severityPassesLogLevel(severity: HasSeverity['severity'], level: LogLevel): boolean;
/**
 * The diagnostics `level` lets through, in their original order. Returns
 * the input array itself when nothing is filtered out, so the common case
 * (the default `'info'`) allocates nothing.
 */
export declare function filterDiagnostics<T extends HasSeverity>(diagnostics: readonly T[], level: LogLevel): readonly T[];
