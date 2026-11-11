"""
rule20_31_33_memory.py

RULE 20 — PERFORMANCE MEMORY
Principle: "Memory records committed behavior only; speculative branches
never contaminate long-term memory." -> This module is only ever fed
PerformanceEvents that already passed Rule 39's commit point.

RULE 31 — MULTI-SCALE PERFORMANCE MEMORY, PATTERN LEARNING & ADAPTATION
Principle: "Memory influences future behavior without overriding physical or
musical constraints." Memory Rule: "Committed behavior becomes evidence;
rejected speculative branches do not become learned truth."

RULE 33 — PATTERN RECOGNITION, MOTIF FINGERPRINTING & REUSABLE DRUMMING
VOCABULARY
Principle: "Vocabulary provides prior structure and reuse; it never forces a
physically invalid pattern." Vocabulary Principle: use known motifs as
priors, preserve motif identity under controlled transformation, keep
novelty as a valid alternative.
"""

from __future__ import annotations
from collections import defaultdict
from typing import List, Dict
from .datamodel import Limb, PatternFingerprint, MotifCandidate, SequenceDecision


def fingerprint(sequence: List[Limb]) -> str:
    """RULE 33: normalize a limb sequence into a comparable fingerprint."""
    return " ".join(l.value for l in sequence)


class PerformanceMemory:
    """RULE 20/31 primary object: append-only history of committed decisions,
    queryable at multiple n-gram scales (event/beat/measure-ish via n)."""

    def __init__(self, ngram_sizes: List[int] = (2, 3, 4, 6, 8)):
        self.ngram_sizes = list(ngram_sizes)
        self.full_history: List[Limb] = []
        self.event_id_history: List[str] = []
        self.fingerprints: Dict[str, PatternFingerprint] = {}

    def record_committed(self, decisions: List[SequenceDecision]) -> None:
        """RULE 20 entry point. Only committed decisions may be recorded
        (Rule 39 guarantees the caller only has committed decisions to give
        us — speculative beam branches are discarded before this is called)."""
        decisions_sorted = sorted(decisions, key=lambda d: d.event_id)
        for d in decisions:
            self.full_history.append(d.limb)
            self.event_id_history.append(d.event_id)
        self._update_fingerprints()

    def _update_fingerprints(self) -> None:
        """RULE 31/33: detect repeated n-grams across the committed history
        and accumulate occurrence counts — this is the raw evidence Rule 32
        later turns into calibrated profile parameters."""
        for n in self.ngram_sizes:
            if len(self.full_history) < n:
                continue
            window = self.full_history[-n:]
            key = fingerprint(window)
            if key not in self.fingerprints:
                self.fingerprints[key] = PatternFingerprint(fingerprint=key, length=n, occurrences=0)
            self.fingerprints[key].occurrences += 1

    def top_motifs(self, min_occurrences: int = 2, limit: int = 10) -> List[MotifCandidate]:
        """RULE 33 entry point: retrieve reusable vocabulary discovered so
        far, ranked by evidence strength. Confidence is bounded (0,1) and
        never treated as a hard rule elsewhere (Rule 33 Core Principle)."""
        candidates = [
            fp for fp in self.fingerprints.values() if fp.occurrences >= min_occurrences
        ]
        candidates.sort(key=lambda fp: (-fp.occurrences, -fp.length))
        out = []
        for fp in candidates[:limit]:
            limbs = [Limb(tok) for tok in fp.fingerprint.split(" ")]
            confidence = min(0.95, fp.occurrences / (fp.occurrences + 3))
            out.append(MotifCandidate(fingerprint=fp.fingerprint, limb_sequence=limbs,
                                       confidence=confidence))
        return out

    def recent(self, n: int) -> List[Limb]:
        return self.full_history[-n:]
