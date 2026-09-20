# RULE 19 — ANIMATION TIMELINE ASSEMBLY

## Purpose
Assemble body, limb, impact, and recovery plans into a coherent animation timeline.

## Primary Inputs
JointMotionPlan; BodyState; ImpactEvent; timing

## Core Process
Layer base posture, body motion, limb motion, impact response, recovery, and presentation detail.

## Primary Outputs
AnimationTimeline / AnimationEvent[]

## Core Principle
> Animation executes the performance decision; it does not reinterpret sticking.

## Boundary
This rule shapes or validates its own layer but does not usurp decision ownership from other layers. Cross-layer changes are made through explicit contexts and repair requests.

## Traceability
Every meaningful change remains linked to event IDs, rule IDs, configuration/version data and, when relevant, the current state.

## Rule 19 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 19 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
