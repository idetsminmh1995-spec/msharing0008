# RULE 35 — GENRE, PLAYING SYSTEM & DRUMMING IDIOM ADAPTATION

## Purpose
Shape technical choices using genre and playing idiom without stereotyping or hard-locking behavior.

## Primary Inputs
Genre/subgenre; groove idiom; drummer style; intent; memory

## Core Process
Blend idiom priors with style, intent, section context, motif vocabulary, timing feel and technique preferences.

## Primary Outputs
EffectivePlayingIdiom / IdiomContext

## Core Principle
> Genre shapes vocabulary and weighting; it never overrides the drummer or physics.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Idiom Principle
Genre is a weighted prior. `Genre × Style × Intent × Memory × State` shapes preference while `PhysicalValidity` remains a hard boundary.

## Rule 35 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 35 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
