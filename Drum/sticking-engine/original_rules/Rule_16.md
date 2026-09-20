# RULE 16 — POST-IMPACT RECOVERY & TRANSITION

## Purpose
Carry the performer smoothly from impact through rebound to the next prepared state.

## Primary Inputs
ImpactEvent; next target; current body/limb state

## Core Process
Calculate recovery trajectory, next-target preparation, momentum continuity, and transition cost.

## Primary Outputs
RecoveryPlan / transition result

## Core Principle
> Recovery is continuous and stateful; no automatic return to a default pose.

## Physical Continuity
Never teleport, snap to a neutral pose, or invent an impossible acceleration to preserve a visual target. Physical time, path length, joint limits and recovery all participate in feasibility.

## Feedback
A detailed physical failure must be able to return a structured rejection or repair signal to the solver without silently changing the source musical event.

## Rule 16 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 16 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
