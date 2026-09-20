# RULE 37 — ENGINE IMPLEMENTATION SPECIFICATION, CLASS MODEL & INTER-MODULE INTERFACES

## Purpose
Translate the architecture into explicit classes, interfaces, data ownership and API contracts.

## Primary Inputs
Rule specifications and unified data model

## Core Process
Define modules, classes, interfaces, dependency direction, result objects, state stores, validators, runtime APIs and versioning.

## Primary Outputs
ImplementationArchitecture / InterfaceSet

## Core Principle
> One decision, one owner, one source of truth; logic and data remain separated.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Ownership Rule
One decision, one owner, one source of truth. Orchestrators coordinate execution order but do not become domain-logic containers.

## Rule 37 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 37 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
