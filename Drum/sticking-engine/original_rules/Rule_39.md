# RULE 39 — PERFORMANCE EXECUTION LOOP, EVENT SOLVING CYCLE & STATE COMMIT PIPELINE

## Purpose
Define the actual step-by-step execution cycle from one decision window to the next.

## Primary Inputs
Implementation interfaces; current state; event timeline

## Core Process
Initialize, preprocess, build windows, generate/filter/simulate/score, solve physical details, validate, repair, atomically commit and advance.

## Primary Outputs
CommittedPerformance / SolverTrace

## Core Principle
> Search is read/clone/simulate; commit is the only authoritative mutation point.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Commit Rule
Search branches are speculative. Only validated selections mutate authoritative state. Rollback uses explicit snapshots or state deltas.

## Rule 39 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 39 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
