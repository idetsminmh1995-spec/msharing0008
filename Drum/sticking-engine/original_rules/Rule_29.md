# RULE 29 — PERFORMANCE SOLVING PIPELINE, LOOKAHEAD WINDOW & ITERATIVE SOLVER

## Purpose
Search ahead in the musical and physical future instead of making greedy note-by-note decisions.

## Primary Inputs
PerformanceContext; DrummerState; future events

## Core Process
Build adaptive lookahead windows, generate candidates, hard-filter, simulate, beam-search, rank, repair, and commit a near horizon.

## Primary Outputs
SolvedPerformanceWindow

## Core Principle
> Look far, commit near; current decisions depend on future preparation and sequence quality.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Solver Pattern
Lookahead > current-only reasoning; speculative state > destructive mutation; near-term commit > whole-song premature locking.

## Rule 29 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 29 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
