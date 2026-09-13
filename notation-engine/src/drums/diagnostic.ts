export type DrumDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * §13.3's own error-conditions rule ("a MIDI note outside 35-81 on
 * channel 10, or a note with no table entry -> render on the middle
 * line with the default notehead and record a warning") is the same
 * "recover with a diagnostic, never drop the note" discipline every
 * other module in this codebase already follows. Kept independent from
 * the parser/timing modules' own diagnostic types for the same reason
 * those are independent from each other.
 */
export interface DrumDiagnostic {
  readonly severity: DrumDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
}

export function drumDiagnostic(
  severity: DrumDiagnosticSeverity,
  code: string,
  message: string,
): DrumDiagnostic {
  return { severity, code, message };
}
