# Phase 58 — Cue notes and octave-shift spans

The audited MusicXML remainder now carries `<cue/>` metadata through the core note model and uses the MusicXML `<defaults><appearance><note-size type="cue">` multiplier (default 75%) for cue-note drawing and attack-width spacing. Notehead, stem, ledger, dot, and flag content is scaled as one note event so existing stem/flag geometry remains coherent.

`<direction-type><octave-shift type="up|down|stop" size="8|15" number="N"/>` is parsed into a side table, matched by staff and number, rendered as an above-staff bracket with an 8/15 label, and reserved in the above-staff layout band. Invalid attributes and unmatched endpoints produce stable diagnostics. Slides and glissandi remain outside this phase.

Focused coverage is in `Engine/notation-engine/test/unit/cue-octave-shift.test.js`; run `npm run typecheck`, `npm run build`, and the focused test file from the notation-engine package.
