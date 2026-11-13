# RULE 38 — CLASS, INTERFACE & DATA SCHEMA SPECIFICATION

## Purpose
Lock concrete types and schemas used by the implementation.

## Primary Inputs
Implementation architecture

## Core Process
Specify IDs, enums, transforms, contexts, candidates, decisions, motion/impact/timing plans, state objects, validators, serialization and deterministic randomness.

## Primary Outputs
SchemaSet / ContractedClasses

## Core Principle
> Typed data, explicit units, explicit ownership and testable interfaces are mandatory.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Schema Rule
Units, identifiers, versioning and mutability must be explicit. `Candidate`, `Decision`, `Plan`, `Result`, `Context` and `State` are distinct concepts.

## Rule 38 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 38 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
