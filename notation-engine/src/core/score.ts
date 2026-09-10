import type { Part } from './part.js';

/** The whole piece: every Part, plus optional piece-level metadata. */
export interface Score {
  readonly parts: readonly Part[];
  readonly title?: string;
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
