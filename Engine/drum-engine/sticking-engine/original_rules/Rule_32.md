# RULE 32 — DRUMMER PROFILE CALIBRATION, LEARNING & ADAPTIVE PARAMETER SYSTEM

## Purpose
Turn repeated evidence into stable drummer-specific parameters without overreacting to outliers.

## Primary Inputs
PerformanceMemory; validated observations; base profile

## Core Process
Aggregate behavior statistics, estimate confidence, update learned parameters, separate global/local scopes, support locks, bounds and rollback.

## Primary Outputs
LearnedDrummerProfile / EffectiveDrummerProfile

## Core Principle
> Learning is gradual, confidence-weighted, context-tagged and subordinate to explicit user constraints.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Profile Hierarchy
`BaseProfile → LearnedProfile → Song/Section adjustment → Intent → Fatigue/State → EffectiveProfile`, all bounded by explicit locks and physical constraints.

## Rule 32 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 32 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
