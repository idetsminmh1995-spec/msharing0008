# RULE 4 — DENSITY, SPACING & TEMPORAL PRESSURE

## Purpose
Measure local event density and the physical pressure created by short inter-event gaps.

## Primary Inputs
DrumEvent[]; TimingContext[]

## Core Process
Analyze local density, spacing before/after events, burst states, simultaneous-event count, and tempo-adjusted stroke rate.

## Primary Outputs
DensityContext[]

## Core Principle
> Density is contextual; note count alone never defines difficulty.

## Core Constraints
- Preserve source-event identity.
- Keep musical analysis deterministic.
- Do not perform downstream hand, stroke, motion or animation decisions prematurely.

## Integration
The output of this rule becomes a typed input to the next analytical layer. Downstream modules may enrich the data but must not silently rewrite upstream truth.

## Rule 4 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 4 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
