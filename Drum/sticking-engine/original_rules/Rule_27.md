# RULE 27 — UNIFIED PERFORMANCE DATA MODEL, EVENT GRAPH & DATA CONTRACT

## Purpose
Give every stage a common, traceable representation of the same performance.

## Primary Inputs
All rule outputs

## Core Process
Define canonical PerformanceEvent objects, event groups, references, contexts, versions, validation metadata, repair traces and indices.

## Primary Outputs
UnifiedPerformance / EventGraph / ContextStore

## Core Principle
> One source of truth; explicit references; immutable source data; traceable derived data.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Rule 27 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 27 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
