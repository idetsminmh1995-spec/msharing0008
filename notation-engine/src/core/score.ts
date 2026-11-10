import type { Part } from './part.js';

/** The whole piece: every Part, plus optional piece-level metadata. */
export interface Score {
  readonly parts: readonly Part[];
  /** Work title, falling back to the movement title when no work title is provided. */
  readonly title?: string;
  /** The creator marked as the composer in the source metadata, when present. */
  readonly composer?: string;
}

export interface ScoreInit {
  parts: readonly Part[];
  title?: string;
  composer?: string;
}

export function score(init: ScoreInit): Score {
  return { ...init };
}
