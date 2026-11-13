# RULE 30 — PERFORMANCE STATE MACHINE & CONTINUOUS DRUMMER STATE

## Purpose
Represent the drummer as a continuous physical, musical, energetic and cognitive state.

## Primary Inputs
Performance events; motion; recovery; timing

## Core Process
Maintain hand/foot/body/timing/pattern/memory/fatigue/energy state and apply atomic state transitions with rollback support.

## Primary Outputs
DrummerState / StateTransition

## Core Principle
> A drummer is not a list of isolated hits; every action changes the state from which the next action emerges.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## State Transition
`State(t) + PerformanceEvent(t) + Context(t) → State(t+1)`; simultaneous event groups are committed atomically.

## Rule 30 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 30 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
