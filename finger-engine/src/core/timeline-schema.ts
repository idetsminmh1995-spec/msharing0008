/**
 * timeline-schema.ts — the contract with the renderer (Plan Part 09).
 *
 * This JSON is the ONLY thing the video layer knows about the engine.
 * [README rule 5] Anything that breaks a reader needs a new major
 * schema version; the version travels inside every timeline so a
 * renderer can refuse one it does not understand instead of drawing
 * nonsense.
 */
import type { LHFinger, RHFinger, Technique } from './types.js';

export const TIMELINE_SCHEMA = 'finger-timeline' as const;
/**
 * [BOUT-01] 1.1.0 adds the bass's optional fields and removes
 * nothing: every 1.0.0 field keeps its meaning, so a renderer written
 * for 1.0.0 still draws a bass timeline correctly -- it simply does
 * not know about the things it ignores.
 */
export const TIMELINE_SCHEMA_VERSION = '1.1.0' as const;

/** What the engine calls itself in the timeline it writes. */
export const ENGINE_NAME = 'guitar-finger-engine' as const;
/** The engine's own version, which is not the schema's: code may change without the contract changing. */
export const ENGINE_VERSION = '1.0.0';

export type FingerKey = '1' | '2' | '3' | '4' | 'T';

export interface TimelineNote {
  readonly noteId: string;
  readonly time: number;
  readonly duration: number;
  readonly pitch: number;
  readonly string: number;
  readonly fret: number;
  /** null = open string, or held by a capo: played by no finger. */
  readonly finger: FingerKey | null;
  readonly techniques: readonly string[];
  /** What came from the file and must not have been changed (V-06). */
  readonly locked: { readonly string: boolean; readonly fret: boolean; readonly finger: boolean };
  /** [SV-24] why this fingering, in codes the debug report explains. */
  readonly reasons: readonly string[];
  /** [SV-23] 0..1. */
  readonly confidence: number;
  /**
   * [BOUT-04] A dead note: muted and percussive, with no real pitch.
   * Its `fret` is where the hand happened to be touching, so the
   * usual `tuning + fret = pitch` check does not apply to it.
   */
  readonly dead?: boolean;
  /** [BOUT-04] Pitched, but played quietly under the line. */
  readonly ghost?: boolean;
  /** [BOUT-04] A natural harmonic; `fret` is the node, a whole number. */
  readonly harmonic?: boolean;
  /** [BOUT-04, BLH-04] Which fingering system the hand was in here. */
  readonly system?: FingeringSystem;
}

/**
 * [BLH-04] The two ways a bassist's left hand is laid out.
 *
 * `simandl` uses index, middle and little across two frets, with the
 * ring finger pressing alongside the little one; `ofpf` gives each of
 * the four fingers its own fret. Which one applies is decided by the
 * millimetres the shape actually spans, not by the fret number, which
 * is why it is carried per note rather than set once.
 */
export type FingeringSystem = 'simandl' | 'ofpf';

export interface FingerKeyframe {
  readonly t: number;
  /** Fractional while the finger is crossing strings. */
  readonly string: number;
  /** [OUT-04] fret index minus the fingertip offset: fret 5 at k=0.3 is 4.7. */
  readonly fret: number;
  readonly pressed: boolean;
  /** false = lifted or hovering; the renderer hides the dot. */
  readonly visible: boolean;
  readonly bend?: number;
  /** [OUT-02] how to travel from THIS keyframe to the next. */
  readonly ease?: 'linear' | 'easeInOut' | 'step';
  readonly noteId?: string;
  /**
   * [BOUT-03] What this finger is doing, when it is not simply
   * fretting the note: `support` is a finger pressing alongside
   * another (the Simandl ring finger behind the little one, or a
   * finger backing a bend), `mute` is a finger touching the string
   * without pressing it. A `mute` keyframe is always `pressed:
   * false`. Absent means `fret`.
   */
  readonly role?: 'fret' | 'support' | 'mute';
}

export interface HandKeyframe {
  readonly t: number;
  readonly fret: number;
  readonly ease?: 'linear' | 'easeInOut';
}

export interface TimelineBarre {
  readonly finger: '1' | '2' | '3' | '4';
  readonly fret: number;
  readonly fromString: number;
  readonly toString: number;
  readonly start: number;
  readonly end: number;
}

export interface RightHandEvent {
  /** Seconds; for a strum, when the FIRST string is hit (RH-P06). */
  readonly time: number;
  readonly noteIds: readonly string[];
  /** In the order they are hit. */
  readonly strings: readonly number[];
  readonly kind: 'pick' | 'strum' | 'pluck' | 'tap';
  readonly direction?: 'down' | 'up';
  /** [RH-F*] fingerstyle: one finger per string in `strings`. */
  readonly fingers?: readonly RHFinger[];
  /** [RH-P06] a strum hits its strings one after another; this is when each one is hit. */
  readonly stringTimes?: readonly number[];
  readonly muted?: boolean;
  /** Why this stroke: 'GRID_DOWN', 'ECONOMY', 'LOCKED', 'HOME_STRING'. */
  readonly reason?: string;
  /**
   * [BOUT-06] The same finger carried on to a lower string rather
   * than alternating -- what a bassist calls a rake, and the reason
   * a descending line does not read as broken alternation.
   */
  readonly rake?: boolean;
  /** [BOUT-06] Struck with the thumb, or hooked and pulled with a finger. */
  readonly slap?: boolean;
  readonly pop?: boolean;
  /** [BOUT-06] Which way the thumb or pick travelled. */
  readonly stroke?: 'down' | 'up';
  readonly ghost?: boolean;
  readonly dead?: boolean;
}

export interface EngineWarning {
  readonly code: string;
  readonly time?: number;
  readonly noteIds?: readonly string[];
  readonly message: string;
}

export interface FingerTimeline {
  readonly schema: typeof TIMELINE_SCHEMA;
  readonly schemaVersion: typeof TIMELINE_SCHEMA_VERSION;
  readonly engine: {
    readonly name: 'guitar-finger-engine' | 'bass-finger-engine';
    readonly version: string;
    readonly presetId: string;
    readonly seed: number;
    readonly configHash: string;
  };
  readonly instrument: {
    readonly kind: 'guitar' | 'bass';
    readonly numStrings: number;
    /** [DM-01/OUT-05] string 1 is the lowest-pitched one. */
    readonly stringOrder: 'lowToHigh';
    readonly tuning: readonly number[];
    readonly capo: number;
    readonly numFrets: number;
    /** [BOUT-02] What was analysed, when it was not the plain default. */
    readonly fretless?: boolean;
    readonly octaveShift?: number;
    /** [BOUT-02, BIN-06] What the engine read off the part, for the UI to confirm. */
    readonly suggestion?: {
      readonly numStrings: number;
      readonly tuning: readonly number[];
      readonly reasons: readonly string[];
    };
  };
  /** Seconds, to the end of the last note. */
  readonly duration: number;
  readonly notes: readonly TimelineNote[];
  readonly leftHand: {
    readonly hand: readonly HandKeyframe[];
    readonly fingers: Readonly<Record<FingerKey, readonly FingerKeyframe[]>>;
    readonly barres: readonly TimelineBarre[];
    /** [BOUT-05] Which fingering system was in use, as step segments. */
    readonly system?: readonly { readonly t: number; readonly mode: FingeringSystem }[];
  };
  readonly rightHand: {
    /** [BOUT-01] `thumb`, `slap` and `mixed` are 1.1.0. */
    readonly mode: 'pick' | 'fingerstyle' | 'thumb' | 'slap' | 'mixed';
    readonly events: readonly RightHandEvent[];
    /** [BOUT-06] When the hand changed what it was doing. */
    readonly segments?: readonly {
      readonly start: number;
      readonly end: number;
      readonly mode: string;
    }[];
    /**
     * [BOUT-07] Where the plucking thumb is resting, which is what
     * keeps the strings it is not playing quiet: a string number, the
     * pickup, or the palm.
     */
    readonly thumbRest?: readonly {
      readonly t: number;
      readonly on: 'pickup' | 'palm' | number;
    }[];
  };
  readonly warnings: readonly EngineWarning[];
  readonly debug?: unknown;
}

/** The finger keys, in hand order, so every writer emits the same shape. */
export const FINGER_KEYS: readonly FingerKey[] = ['1', '2', '3', '4', 'T'];

/** An empty per-finger map -- a timeline always has all five keys (Part 09 §3). */
export function emptyFingerTracks(): Record<FingerKey, FingerKeyframe[]> {
  return { '1': [], '2': [], '3': [], '4': [], T: [] };
}

/** [DM-03] A finger as the timeline writes it. */
export function fingerKey(finger: LHFinger | null): FingerKey | null {
  return finger === null ? null : (String(finger) as FingerKey);
}

/** Techniques always carry at least 'normal', so a reader never sees an empty list. */
export function techniqueNames(techniques: readonly Technique[]): readonly string[] {
  return techniques.length > 0 ? techniques.map(String) : ['normal'];
}
