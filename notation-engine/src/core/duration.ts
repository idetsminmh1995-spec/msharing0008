/** MusicXML-style duration "type" names, whole down to 1024th. */
export type DurationType =
  | 'whole'
  | 'half'
  | 'quarter'
  | 'eighth'
  | '16th'
  | '32nd'
  | '64th'
  | '128th'
  | '256th'
  | '512th'
  | '1024th';

/**
 * A tuplet ratio -- e.g. a standard eighth-note triplet is
 * { actualNotes: 3, normalNotes: 2 } (3 notes played in the time of 2).
 * Turning this + `ticks` into an actual on-screen beam grouping is Phase
 * 4/23's job -- this is just the raw data as MusicXML provides it.
 */
export interface TupletRatio {
  readonly actualNotes: number;
  readonly normalNotes: number;
}

/**
 * A note/rest's duration. `ticks` is the authoritative absolute length (in
 * the source MusicXML's own <divisions> units) -- `type`/`dots`/`tuplet`
 * are the DISPLAYED duration, which is normally derived from ticks but is
 * kept alongside it since MusicXML provides both and they can occasionally
 * disagree (e.g. a note tied across a barline). Phase 4 owns reconciling
 * the two; this type just holds both without judgment.
 */
export interface Duration {
  readonly type: DurationType;
  readonly dots: number;
  readonly ticks: number;
  readonly tuplet?: TupletRatio;
}

export function duration(
  type: DurationType,
  dots: number,
  ticks: number,
  tuplet?: TupletRatio,
): Duration {
  return tuplet === undefined ? { type, dots, ticks } : { type, dots, ticks, tuplet };
}
