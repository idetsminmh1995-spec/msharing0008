# RULE 13 — WHOLE-LIMB MOTION PLANNING

## Purpose
Convert selected performance decisions into continuous physical trajectories.

## Primary Inputs
PerformanceDecision; DrummerState; target geometry

## Core Process
Plan preparation, travel, impact approach, and recovery paths with velocity/acceleration profiles.

## Primary Outputs
MotionPlan

## Core Principle
> Motion must preserve continuity, timing feasibility, and physical plausibility.

## Physical Continuity
Never teleport, snap to a neutral pose, or invent an impossible acceleration to preserve a visual target. Physical time, path length, joint limits and recovery all participate in feasibility.

## Feedback
A detailed physical failure must be able to return a structured rejection or repair signal to the solver without silently changing the source musical event.

## Rule 13 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 13 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
