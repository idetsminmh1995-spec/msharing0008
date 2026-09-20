# RULE 33 — PATTERN RECOGNITION, MOTIF FINGERPRINTING & REUSABLE DRUMMING VOCABULARY

## Purpose
Identify reusable groove, fill, sticking, timing, motion and coordination motifs.

## Primary Inputs
PatternMemory; committed performance history

## Core Process
Normalize patterns, fingerprint musical and physical features, cluster variants, build a motif graph and retrieve context-compatible vocabulary.

## Primary Outputs
MotifLibrary / PatternFingerprint / MotifCandidate

## Core Principle
> Vocabulary provides prior structure and reuse; it never forces a physically invalid pattern.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Vocabulary Principle
Use known motifs as priors, preserve motif identity under controlled transformation, and keep novelty as a valid alternative so repetition does not become mechanical.

## Rule 33 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 33 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
