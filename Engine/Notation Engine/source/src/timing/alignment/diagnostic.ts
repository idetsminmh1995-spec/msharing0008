export type AlignmentDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * §13.2's own rule ("unmatched -> record a diagnostic and keep both;
 * never silently drop") is the same "recover with a diagnostic, never
 * lose data" discipline every other module in this codebase already
 * follows. Kept independent from the parser/timing/drums modules' own
 * diagnostic types for the same reason those are independent from each
 * other.
 */
export interface AlignmentDiagnostic {
  readonly severity: AlignmentDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
}

export function alignmentDiagnostic(
  severity: AlignmentDiagnosticSeverity,
  code: string,
  message: string,
): AlignmentDiagnostic {
  return { severity, code, message };
}
