# RULE 34 — ADVANCED STICKING GRAMMAR, TECHNIQUE LIBRARY & HAND-PATTERN GENERATOR

## Purpose
Generate rich technical sticking possibilities beyond simple R/L alternation.

## Primary Inputs
Motifs; accents; instruments; state; timing; style

## Core Process
Expand singles, doubles, grouped patterns, paradiddles, ghosts, grace/flams, linear and hybrid grammars into hand-pattern candidates.

## Primary Outputs
StickingGrammarContext / TechniqueLibrary / StickingPatternCandidate

## Core Principle
> Grammar generates possibilities; the solver chooses among them using state, future context and physical feasibility.

## Implementation Contract
Inputs, intermediate state and outputs must be explicit. No hidden global state, implicit random choices, or silent downstream re-decisions are permitted.

## Determinism
Where randomness or parallelism exists, results must be reproducible from explicit seeds, versions, ordered tie-breakers and state snapshots.

## Grammar Principle
`Generate ≠ Select`: Rule 34 creates technical language; Rule 29 chooses the best sequence for the current state and future context.

## Rule 34 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 34 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
