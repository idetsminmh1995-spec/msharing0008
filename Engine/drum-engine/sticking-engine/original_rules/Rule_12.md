# RULE 12 — CONTROLLED HUMAN VARIATION & NON-ROBOTIC BEHAVIOR

## Purpose
Add bounded, context-aware variation without destroying identity or correctness.

## Primary Inputs
Valid candidate pool; style; intent; memory; seed

## Core Process
Select among near-optimal valid alternatives, vary timing/velocity/technique only within configured ranges, and use deterministic randomness.

## Primary Outputs
HumanizationContext / VariationDecision

## Core Principle
> Variation comes after validity and candidate generation; randomness never repairs impossible behavior.

## Candidate Logic
Hard physical impossibilities are rejected. Soft preferences are scored. Multiple valid alternatives should remain available until the sequence solver has enough future context.

## Human-Performance Requirement
The engine should prefer coherent, economical, repeatable technique with bounded variation rather than random hand assignment.

## Rule 12 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 12 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
