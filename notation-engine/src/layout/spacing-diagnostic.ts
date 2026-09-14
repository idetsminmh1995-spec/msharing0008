export type SpacingDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * §14's own error condition: "a measure wider than the available system
 * width even at minimum spacing -> allow the overflow, warn, and let §16
 * break the system earlier next time." The same "recover with a
 * diagnostic, keep the data" discipline every other module in this
 * codebase already follows -- kept independent from the others'
 * diagnostic types for the same reason those are independent from each
 * other.
 */
export interface SpacingDiagnostic {
  readonly severity: SpacingDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
}

export function spacingDiagnostic(
  severity: SpacingDiagnosticSeverity,
  code: string,
  message: string,
): SpacingDiagnostic {
  return { severity, code, message };
}
