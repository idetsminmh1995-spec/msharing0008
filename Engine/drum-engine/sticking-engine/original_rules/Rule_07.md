# RULE 7 — HAND CANDIDATE GENERATION

## Purpose
Generate viable hand assignments for manual events before sequence optimization.

## Primary Inputs
DrumEvent; ReachabilityResult; current state; style/context

## Core Process
Generate right/left candidates, apply dominance and position bias, and retain alternatives for sequence solving.

## Primary Outputs
StickingCandidate[]

## Core Principle
> Hand preference is a bias, not a hard rule; future targets must influence candidate quality.

## Candidate Logic
Hard physical impossibilities are rejected. Soft preferences are scored. Multiple valid alternatives should remain available until the sequence solver has enough future context.

## Human-Performance Requirement
The engine should prefer coherent, economical, repeatable technique with bounded variation rather than random hand assignment.

## Rule 7 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 7 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
