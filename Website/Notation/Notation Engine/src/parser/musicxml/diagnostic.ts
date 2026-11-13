export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface DiagnosticLocation {
  readonly partId?: string;
  readonly measureNumber?: number;
}

/**
 * §10.7: the parser never throws on malformed input -- it records one of
 * these and continues. `code` is a stable identifier (e.g.
 * 'MISSING_DIVISIONS') meant to be asserted on in tests, not just the
 * human-readable `message`.
 */
export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly location?: DiagnosticLocation;
}

export function diagnostic(
  severity: DiagnosticSeverity,
  code: string,
  message: string,
  location?: DiagnosticLocation,
): Diagnostic {
  return location === undefined
    ? { severity, code, message }
    : { severity, code, message, location };
}
