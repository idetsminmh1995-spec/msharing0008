# RULE 10 — RECOVERY & NEXT-STROKE PREPARATION

## Purpose
Treat recovery as a first-class part of the current stroke rather than a reset to neutral.

## Primary Inputs
Stroke plan; current state; next target

## Core Process
Plan rebound, recovery path, preparation position, direction change, and readiness for the next action.

## Primary Outputs
RecoveryPlan

## Core Principle
> No-reset principle: every stroke ends in a state that prepares the next stroke.

## Candidate Logic
Hard physical impossibilities are rejected. Soft preferences are scored. Multiple valid alternatives should remain available until the sequence solver has enough future context.

## Human-Performance Requirement
The engine should prefer coherent, economical, repeatable technique with bounded variation rather than random hand assignment.

## Rule 10 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 10 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
