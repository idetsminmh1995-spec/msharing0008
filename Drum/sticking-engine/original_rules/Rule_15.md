# RULE 15 — IMPACT, CONTACT & REBOUND PHYSICS

## Purpose
Model the physical instant of contact between stick/limb and drum or cymbal surface.

## Primary Inputs
JointMotionPlan; surface geometry; stroke plan; timing

## Core Process
Detect contact, calculate impact state, direction, velocity, surface response, and rebound.

## Primary Outputs
ImpactEvent / ReboundResult

## Core Principle
> Impact timing and identity remain traceable to the originating PerformanceEvent.

## Physical Continuity
Never teleport, snap to a neutral pose, or invent an impossible acceleration to preserve a visual target. Physical time, path length, joint limits and recovery all participate in feasibility.

## Feedback
A detailed physical failure must be able to return a structured rejection or repair signal to the solver without silently changing the source musical event.

## Rule 15 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 15 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
