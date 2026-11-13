# RULE 17 — WHOLE-BODY BALANCE, POSTURE & COMPENSATION

## Purpose
Integrate all limb actions into believable whole-body behavior.

## Primary Inputs
Limb motion; target positions; seat/root setup

## Core Process
Solve center of mass, torso rotation, pelvis/shoulder compensation, balance, posture, and global collision risk.

## Primary Outputs
BodyState / GlobalBodyMotion

## Core Principle
> Body movement is a consequence of limb actions and musical intent, not decorative animation.

## Physical Continuity
Never teleport, snap to a neutral pose, or invent an impossible acceleration to preserve a visual target. Physical time, path length, joint limits and recovery all participate in feasibility.

## Feedback
A detailed physical failure must be able to return a structured rejection or repair signal to the solver without silently changing the source musical event.

## Rule 17 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 17 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
