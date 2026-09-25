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
export const TIMELINE_SCHEMA_VERSION = '1.0.0' as const;

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
}

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
    readonly name: 'guitar-finger-engine';
    readonly version: string;
    readonly presetId: string;
    readonly seed: number;
    readonly configHash: string;
  };
  readonly instrument: {
    readonly kind: 'guitar';
    readonly numStrings: number;
    /** [DM-01/OUT-05] string 1 is the lowest-pitched one. */
    readonly stringOrder: 'lowToHigh';
    readonly tuning: readonly number[];
    readonly capo: number;
    readonly numFrets: number;
  };
  /** Seconds, to the end of the last note. */
  readonly duration: number;
  readonly notes: readonly TimelineNote[];
  readonly leftHand: {
    readonly hand: readonly HandKeyframe[];
    readonly fingers: Readonly<Record<FingerKey, readonly FingerKeyframe[]>>;
    readonly barres: readonly TimelineBarre[];
  };
  readonly rightHand: {
    readonly mode: 'pick' | 'fingerstyle';
    readonly events: readonly RightHandEvent[];
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
