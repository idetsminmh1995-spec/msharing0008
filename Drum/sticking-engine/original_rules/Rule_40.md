# RULE 40 — SOLVER PERFORMANCE, CACHING, PARALLELISM & REAL-TIME OPTIMIZATION

## Purpose
Make the complete solver scalable without sacrificing drummer realism.

## Primary Inputs
Rule 39 pipeline; caches; compute budgets; runtime constraints

## Core Process
Use precomputation, cache layers, state deltas, safe parallel speculative work, adaptive beam widths, coarse-to-fine solving, deadlines, profiling and graceful degradation.

## Primary Outputs
OptimizedSolver / PerformanceReport

## Core Principle
> Optimize computation rather than simplifying the drummer; cached or parallel results must remain deterministic and correct.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Optimization Rule
Cache stable work, reject impossible candidates early, parallelize only read-only/speculative work, escalate to expensive physics only when uncertainty requires it, and keep correctness invariant across FAST/HIGH modes.

## Rule 40 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 40 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
