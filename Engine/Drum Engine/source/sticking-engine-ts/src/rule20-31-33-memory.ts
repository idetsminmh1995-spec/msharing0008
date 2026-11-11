/**
 * rule20-31-33-memory.ts
 *
 * RULE 20 — PERFORMANCE MEMORY: "memory records committed behavior only;
 *   speculative branches never contaminate long-term memory."
 * RULE 31 — MULTI-SCALE MEMORY & PATTERN LEARNING.
 * RULE 33 — MOTIF FINGERPRINTING & REUSABLE VOCABULARY: priors, never
 *   forced patterns.
 */

import type { Limb, MotifCandidate, PatternFingerprint, SequenceDecision } from './datamodel.js';

/** RULE 33: normalize a limb sequence into a comparable fingerprint. */
export function fingerprint(sequence: readonly Limb[]): string {
  return sequence.join(' ');
}

/**
 * RULE 20/31: an append-only history of committed decisions, queryable
 * at several n-gram scales.
 */
export class PerformanceMemory {
  readonly ngramSizes: readonly number[];
  readonly fullHistory: Limb[] = [];
  readonly eventIdHistory: string[] = [];
  readonly fingerprints = new Map<string, PatternFingerprint>();

  constructor(ngramSizes: readonly number[] = [2, 3, 4, 6, 8]) {
    this.ngramSizes = [...ngramSizes];
  }

  /**
   * Only committed decisions may be recorded -- Rule 39 guarantees the
   * caller has nothing else to give, because speculative beam branches
   * are discarded before this is ever called.
   */
  recordCommitted(decisions: readonly SequenceDecision[]): void {
    for (const d of decisions) {
      this.fullHistory.push(d.limb);
      this.eventIdHistory.push(d.eventId);
    }
    this.updateFingerprints();
  }

  /**
   * RULE 31/33: count repeated n-grams across the committed history --
   * the raw evidence Rule 32 later turns into calibrated profile
   * parameters.
   */
  private updateFingerprints(): void {
    for (const n of this.ngramSizes) {
      if (this.fullHistory.length < n) continue;
      const key = fingerprint(this.fullHistory.slice(-n));
      const existing = this.fingerprints.get(key);
      if (existing === undefined) {
        this.fingerprints.set(key, { fingerprint: key, length: n, occurrences: 1 });
      } else {
        existing.occurrences += 1;
      }
    }
  }

  /**
   * RULE 33: the reusable vocabulary discovered so far, ranked by
   * evidence. Confidence is bounded and is never a hard rule elsewhere.
   */
  topMotifs(minOccurrences = 2, limit = 10): MotifCandidate[] {
    const candidates = [...this.fingerprints.values()].filter(
      (fp) => fp.occurrences >= minOccurrences,
    );
    candidates.sort((a, b) => b.occurrences - a.occurrences || b.length - a.length);
    return candidates.slice(0, limit).map((fp) => ({
      fingerprint: fp.fingerprint,
      limbSequence: fp.fingerprint.split(' ') as Limb[],
      confidence: Math.min(0.95, fp.occurrences / (fp.occurrences + 3)),
    }));
  }

  recent(n: number): Limb[] {
    return this.fullHistory.slice(-n);
  }
}
