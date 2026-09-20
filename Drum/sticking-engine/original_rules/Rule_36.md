# RULE 36 — END-TO-END PERFORMANCE SOLVER & FINAL DRUMMER BEHAVIOR INTEGRATION

## Purpose
Integrate all prior rules into one continuous performance-solving system.

## Primary Inputs
Musical, physical, stylistic, memory, intent, idiom and solver contexts

## Core Process
Build the full decision loop from source MIDI through candidates, future simulation, state transitions, motion, impact, timing, validation and approval.

## Primary Outputs
FinalValidatedPerformance

## Core Principle
> The drummer is solved as a continuous stateful performance, not generated as isolated animation from MIDI.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## End-to-End Loop
Perceive → Understand → Remember → Predict → Generate → Simulate → Decide → Move → Impact → Recover → Adapt → Continue.

## Rule 36 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 36 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
