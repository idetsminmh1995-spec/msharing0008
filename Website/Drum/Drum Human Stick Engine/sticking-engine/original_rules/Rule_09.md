# RULE 9 — STROKE TECHNIQUE & ARTICULATION SELECTION

## Purpose
Choose plausible stroke techniques for each selected hand assignment.

## Primary Inputs
Selected hand candidates; instrument/surface; accents; spacing

## Core Process
Evaluate singles, doubles, accents, ghosts, grace/flam, rim/cross-stick, rebound and articulation compatibility.

## Primary Outputs
StrokeCandidate[] / TechniquePlan

## Core Principle
> Technique is constrained by timing, physical state, and next-stroke preparation.

## Candidate Logic
Hard physical impossibilities are rejected. Soft preferences are scored. Multiple valid alternatives should remain available until the sequence solver has enough future context.

## Human-Performance Requirement
The engine should prefer coherent, economical, repeatable technique with bounded variation rather than random hand assignment.

## Rule 9 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 9 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
