"""
rule34_grammar.py — RULE 34: ADVANCED STICKING GRAMMAR, TECHNIQUE LIBRARY &
HAND-PATTERN GENERATOR

Purpose: Generate rich technical sticking possibilities beyond simple R/L
alternation.

Grammar Principle: "Generate != Select": this module creates the technical
vocabulary (candidate multi-note hand patterns); Rule 8/29's solver is what
actually picks the best one for the current state and future context. This
module MUST NOT commit anything — it only proposes StickingPatternCandidate
sequences that the solver may or may not use.
"""

from __future__ import annotations
from typing import List, Dict
from .datamodel import Limb, StickingPatternCandidate

R, L = Limb.RIGHT_HAND, Limb.LEFT_HAND

# Canonical named rudiments / hand-patterns, expressed as an R/L template that
# can be tiled over any run of N consecutive manual (non-foot) events.
RUDIMENT_LIBRARY: Dict[str, List[Limb]] = {
    "singles_RL":            [R, L],
    "singles_LR":             [L, R],
    "doubles_RRLL":          [R, R, L, L],
    "paradiddle_RLRR_LRLL":  [R, L, R, R, L, R, L, L],
    "double_paradiddle":     [R, L, R, L, R, R, L, R, L, R, L, L],
    "triple_paradiddle":     [R, L, R, L, R, L, R, R, L, R, L, R, L, R, L, L],
    "paradiddlediddle":      [R, L, R, R, L, L],
    "inverted_paradiddle":   [R, R, L, R, L, L, R, L],
    "triplets_RLL_LRR":      [R, L, L, L, R, R],
}


def prior_weight(template: List[Limb]) -> float:
    """How ordinary a rudiment is.

    Length is the honest proxy: a two-element template (singles) is the
    default motion of two hands, and every longer one is a deliberate
    figure a drummer chooses for a reason. Expressed as a weight on Rule
    34's prior rather than a score of its own, because the library's job
    is to offer vocabulary, not to rank it against physics.
    """
    return 2.0 / len(template) if template else 0.0


def tile_pattern(template: List[Limb], length: int) -> List[Limb]:
    """Repeat/truncate a rudiment template to exactly `length` limb slots."""
    if length <= 0:
        return []
    out = []
    i = 0
    while len(out) < length:
        out.append(template[i % len(template)])
        i += 1
    return out


def generate_pattern_candidates(event_ids: List[str], style_hint: str = "generic",
                                 starting_limb: Limb | None = None) -> List[StickingPatternCandidate]:
    """RULE 34 entry point: for a contiguous run of manual events, propose a
    handful of grammatically valid multi-note hand-pattern candidates. The
    solver (Rule 8/29) scores and picks among these, or overrides with plain
    per-note candidates from Rule 7 if none of these fit better.
    """
    n = len(event_ids)
    if n == 0:
        return []

    candidates: List[StickingPatternCandidate] = []
    for name, template in RUDIMENT_LIBRARY.items():
        seq = tile_pattern(template, n)
        if starting_limb is not None and seq[0] != starting_limb:
            # offer a rotated variant that starts on the requested limb too,
            # since continuity (Rule 8) may require matching the previous hand
            rotated = tile_pattern(template[1:] + template[:1], n)
            if rotated[0] == starting_limb:
                seq = rotated
        candidates.append(StickingPatternCandidate(
            pattern_name=name,
            limb_sequence=seq,
            event_ids=list(event_ids),
            grammar_tags=[style_hint],
            prior_weight=prior_weight(template),
        ))
    return candidates
