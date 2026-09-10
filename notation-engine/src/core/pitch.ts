/**
 * The seven natural note names. Accidental alteration is a separate field
 * (see PitchedPitch.alter) rather than baked into the step, so "C sharp"
 * is step 'C' + alter 1, not a distinct step value.
 */
export type PitchStep = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

/**
 * A real, audible pitch -- e.g. a piano or vocal note. Matches MusicXML's
 * <pitch> element: <step>, <alter>, <octave>.
 */
export interface PitchedPitch {
  kind: 'pitched';
  step: PitchStep;
  /** Alteration in semitones: 1 = sharp, -1 = flat, 2 = double-sharp, 0 =
   * natural/unaltered. Fractional values (e.g. 0.5) are reserved for
   * microtonal notation later; not used by any current phase. */
  alter: number;
  /** Scientific pitch notation octave number -- middle C is C4. */
  octave: number;
}

/**
 * An unpitched percussion "position" -- there's no real audible pitch;
 * displayStep/displayOctave exist purely to derive a staff line/space,
 * exactly like MusicXML's <unpitched><display-step>/<display-octave>.
 * Which instrument (kick, snare, hi-hat, ...) this represents is NOT
 * stored here -- that's carried on the owning Note (see note.ts) via its
 * MIDI/instrument reference, per Phase 17's notehead-mapping system.
 */
export interface UnpitchedPitch {
  kind: 'unpitched';
  displayStep: PitchStep;
  displayOctave: number;
}

/**
 * Every Note in the engine has exactly one of these -- there is no
 * separate "is this note pitched?" flag anywhere else. This is what lets
 * Phase 3b's requirement hold structurally: a drum Note and a piano Note
 * are the same type, just carrying a different kind of Pitch.
 */
export type Pitch = PitchedPitch | UnpitchedPitch;

export function isPitched(pitch: Pitch): pitch is PitchedPitch {
  return pitch.kind === 'pitched';
}

export function isUnpitched(pitch: Pitch): pitch is UnpitchedPitch {
  return pitch.kind === 'unpitched';
}

export function pitchedPitch(step: PitchStep, alter: number, octave: number): PitchedPitch {
  return { kind: 'pitched', step, alter, octave };
}

export function unpitchedPitch(displayStep: PitchStep, displayOctave: number): UnpitchedPitch {
  return { kind: 'unpitched', displayStep, displayOctave };
}
