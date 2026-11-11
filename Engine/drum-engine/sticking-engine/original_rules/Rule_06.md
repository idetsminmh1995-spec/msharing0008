# RULE 6 — PHYSICAL REACHABILITY & TARGET ACCESS

## Purpose
Determine which limbs and hand states can physically reach a target within the available time.

## Primary Inputs
DrumEvent; drum geometry; rig; DrummerState

## Core Process
Evaluate distance, direction, reach range, movement time, crossing, target accessibility, and safety margins.

## Primary Outputs
ReachabilityResult

## Core Principle
> Physical feasibility is a hard boundary; unreachable actions are rejected rather than visually faked.

## Candidate Logic
Hard physical impossibilities are rejected. Soft preferences are scored. Multiple valid alternatives should remain available until the sequence solver has enough future context.

## Human-Performance Requirement
The engine should prefer coherent, economical, repeatable technique with bounded variation rather than random hand assignment.

## Rule 6 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 6 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
