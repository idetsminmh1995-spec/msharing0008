export type MidiDiagnosticSeverity = 'error' | 'warning' | 'info';

/**
 * §11.2: the MIDI parser never throws on malformed input, matching the
 * same "diagnostic, not exception" discipline §10.7 already established
 * for the MusicXML parser. Kept as its own type (not imported from
 * `parser/musicxml/diagnostic.ts`) rather than sharing one -- these are
 * two independent parser front-ends with no reason to depend on each
 * other, and MIDI's own natural "where did this happen" is a track
 * index/byte offset, not MusicXML's partId/measureNumber.
 */
export interface MidiDiagnostic {
  readonly severity: MidiDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly location?: { readonly trackIndex?: number; readonly byteOffset?: number };
}

export function midiDiagnostic(
  severity: MidiDiagnosticSeverity,
  code: string,
  message: string,
  location?: MidiDiagnostic['location'],
): MidiDiagnostic {
  return location === undefined
    ? { severity, code, message }
    : { severity, code, message, location };
}
