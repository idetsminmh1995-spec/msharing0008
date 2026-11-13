export type TimingDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * §12's own error-conditions rule ("empty tempo map -> treat as a single
 * 120 BPM segment and warn") is exactly the same "recover with a
 * diagnostic, never throw" discipline §10.7 established for MusicXML and
 * Phase 39 extended to MIDI. Kept as its own type rather than imported
 * from either parser's diagnostic module -- timing/ consumes tempo/time-
 * signature DATA from those parsers, but has no reason to depend on
 * their diagnostic-reporting shapes specifically.
 */
export interface TimingDiagnostic {
  readonly severity: TimingDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
}

export function timingDiagnostic(
  severity: TimingDiagnosticSeverity,
  code: string,
  message: string,
): TimingDiagnostic {
  return { severity, code, message };
}
