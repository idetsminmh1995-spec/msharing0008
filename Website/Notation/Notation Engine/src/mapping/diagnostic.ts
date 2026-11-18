/**
 * The mapping layer's own diagnostic type.
 *
 * Kept independent from the parser, timing, alignment and drum modules'
 * diagnostic types for the same reason those are independent from each
 * other: a module that recovers from a bad input states the finding in
 * its own terms, and the renderer is the one place they meet.
 */
export type MappingDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface MappingDiagnostic {
  readonly severity: MappingDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
}

export function mappingDiagnostic(
  severity: MappingDiagnosticSeverity,
  code: string,
  message: string,
): MappingDiagnostic {
  return { severity, code, message };
}
