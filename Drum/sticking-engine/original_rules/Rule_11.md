# RULE 11 — FOUR-LIMB COORDINATION & SIMULTANEOUS EVENT SOLVING

## Purpose
Coordinate both hands and both feet as one drummer system.

## Primary Inputs
Event groups; limb states; target/timing context

## Core Process
Resolve simultaneous events atomically, detect limb conflicts, share body resources, and maintain timing coherence.

## Primary Outputs
CoordinationResult / event-group solution

## Core Principle
> Hands and feet do not solve independently when simultaneous or mechanically coupled.

## Candidate Logic
Hard physical impossibilities are rejected. Soft preferences are scored. Multiple valid alternatives should remain available until the sequence solver has enough future context.

## Human-Performance Requirement
The engine should prefer coherent, economical, repeatable technique with bounded variation rather than random hand assignment.

## Rule 11 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 11 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
