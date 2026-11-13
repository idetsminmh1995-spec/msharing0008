# RULE 28 — ENGINE MODULE ARCHITECTURE & RULE ORCHESTRATION

## Purpose
Organize Rules 1–27 into clean software modules with explicit dependency boundaries.

## Primary Inputs
Unified data contracts; rule registry; module interfaces

## Core Process
Separate import, analysis, decision, physical, motion, impact, timing, animation, validation and runtime modules; orchestrate them through a pipeline.

## Primary Outputs
EngineArchitecture / RuleRegistry / ExecutionPlan

## Core Principle
> Orchestrator owns when; specialized modules own what/how; circular hidden dependencies are forbidden.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Rule 28 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 28 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
