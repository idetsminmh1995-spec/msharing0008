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

/** How far down the severity ladder a level reaches. Higher includes everything lower. */
const LEVEL_RANK: Readonly<Record<LogLevel, number>> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 3,
};

const SEVERITY_RANK: Readonly<Record<HasSeverity['severity'], number>> = {
  error: 1,
  warning: 2,
  info: 3,
};

/** Whether one diagnostic survives `level`. */
export function severityPassesLogLevel(
  severity: HasSeverity['severity'],
  level: LogLevel,
): boolean {
  return SEVERITY_RANK[severity] <= LEVEL_RANK[level];
}

/**
 * The diagnostics `level` lets through, in their original order. Returns
 * the input array itself when nothing is filtered out, so the common case
 * (the default `'info'`) allocates nothing.
 */
export function filterDiagnostics<T extends HasSeverity>(
  diagnostics: readonly T[],
  level: LogLevel,
): readonly T[] {
  if (LEVEL_RANK[level] >= SEVERITY_RANK.info) return diagnostics;
  if (level === 'silent') return [];
  return diagnostics.filter((d) => severityPassesLogLevel(d.severity, level));
}
