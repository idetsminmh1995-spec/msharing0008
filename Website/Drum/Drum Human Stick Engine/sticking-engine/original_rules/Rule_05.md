# RULE 5 — PATTERN, GROOVE, FILL & PHRASE CLASSIFICATION

## Purpose
Identify the musical role and structural context of each event group.

## Primary Inputs
DrumEvent[]; TimingContext; DensityContext

## Core Process
Segment measures/phrases, classify groove/fill/transition/break/ending/ostinato/linear behavior, and attach structural IDs.

## Primary Outputs
PatternContext[]; PhraseContext[]; SectionContext[]

## Core Principle
> Classification is probabilistic and contextual; labels guide later decisions but do not force them.

## Core Constraints
- Preserve source-event identity.
- Keep musical analysis deterministic.
- Do not perform downstream hand, stroke, motion or animation decisions prematurely.

## Integration
The output of this rule becomes a typed input to the next analytical layer. Downstream modules may enrich the data but must not silently rewrite upstream truth.

## Rule 5 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 5 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
