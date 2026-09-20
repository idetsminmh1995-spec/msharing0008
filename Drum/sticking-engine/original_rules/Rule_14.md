# RULE 14 — JOINT KINEMATICS, IK/FK & RIG REALIZATION

## Purpose
Realize abstract motion on an actual drummer rig while respecting joint constraints.

## Primary Inputs
MotionPlan; rig definition; body state

## Core Process
Solve joint chains, IK/FK blending, elbow/wrist behavior, limits, retargeting, and pose continuity.

## Primary Outputs
JointMotionPlan / PoseTimeline

## Core Principle
> Rig realization cannot change the high-level performance decision.

## Physical Continuity
Never teleport, snap to a neutral pose, or invent an impossible acceleration to preserve a visual target. Physical time, path length, joint limits and recovery all participate in feasibility.

## Feedback
A detailed physical failure must be able to return a structured rejection or repair signal to the solver without silently changing the source musical event.

## Rule 14 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 14 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
