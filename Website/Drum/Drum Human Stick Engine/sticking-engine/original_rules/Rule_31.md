# RULE 31 — MULTI-SCALE PERFORMANCE MEMORY, PATTERN LEARNING & ADAPTATION

## Purpose
Remember behavior across event, beat, measure, pattern, phrase, section and song scales.

## Primary Inputs
Committed PerformanceEvents; state history

## Core Process
Detect repetitions, store exact and family-level patterns, retrieve relevant memories, manage decay and controlled variation.

## Primary Outputs
PerformanceMemory / AdaptationContext

## Core Principle
> Memory influences future behavior without overriding physical or musical constraints.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Memory Rule
Committed behavior becomes evidence; rejected speculative branches do not become learned truth.

## Rule 31 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 31 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
