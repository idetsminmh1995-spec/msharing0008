# Notation Engine Completeness Roadmap

**Audit date:** 2026-11-12
**Audited baseline:** `origin/main` at `8906127` (includes Notation Engine phases 55–60)
**State:** Requirements and audit findings; the phases below are not marked implemented.
**Authority:** [`../PLAN.md`](../PLAN.md), §25. This document expands that master plan; it does not replace the existing phase history or close any implementation gap by itself.

## 1. Purpose and honest boundary

The goal is to make the Notation Engine dependable for every input and notation profile it explicitly claims to support—not to promise that one renderer can correctly open every file ever created. “Any MusicXML” and “any note file” are not testable support statements unless they identify a standard version, profile, feature set, runtime limits, and expected behavior for unsupported content.

Completeness is a chain of distinct guarantees:

1. **Accept:** recognize the declared file/container/version and reject corrupt, unsupported, or over-limit input clearly.
2. **Parse and preserve:** retain source meaning such as pitch spelling, timing, voice/staff, cue/grace identity, notation marks, and relevant source placement.
3. **Resolve:** derive display, playback, and layout meaning only where the input and selected profile define it; do not silently guess.
4. **Engrave:** render the supported semantics accurately without losing, clipping, detaching, or colliding with score content.
5. **Explain:** report partial support, unsupported valid features, recovery, and fatal errors with stable diagnostics.
6. **Verify:** demonstrate those guarantees against independent semantic expectations, representative files, visual references, and integration tests.

A successful parse is not proof of correct engraving. A visible SVG is not proof that all source events survived. A passing phase checklist is not proof of universal standard conformance.

## 2. Current audited baseline

The repository already contains substantial, useful functionality. This audit does **not** reset or devalue that work.

### 2.1 Implemented foundations to keep

- A TypeScript score model, MusicXML/XML parser, score-timewise conversion, MXL wrapper, SVG engraving pipeline, layout modes, diagnostics, playback-position APIs, and MIDI event/timing tools.
- Tested common staff-notation behavior: notes, rests, chords, voices/staves/parts, clefs, key/time signatures, beams, ties/slurs/tuplets, dynamics, text (lyrics/chord symbols/rehearsal marks/direction words), note marks (tremolo/arpeggio/harmonic), transpose/pedal, cue notes/octave shifts, slides/glissandi, percussion, tablature, and layout.
- Phases 55–60 add the text layer, selected semantic note marks, transpose/pedal, cue/octave-shift and slide/glissando handling, plus visual proportion/edge polish. Keep their documented limits; these features are not open gaps merely because the earlier audit did not include them.
- Regression coverage for real reported failures, including the 44130 notehead-loss and beam-continuity cases and the 115 BPM covered-rest case.
- Bundle synchronization, website consumers, browser rollout tests, API documentation checks, and a large unit/fixture suite.

These are concrete implemented layers, not evidence that every legal element in every version of MusicXML or every notation tradition is supported.

### 2.2 Confirmed gaps that motivate this roadmap

The following are audit findings against the source, tests and plan; they are work to schedule, not claims that a fix has already been made.

| Area | Confirmed gap | Consequence / required direction |
|---|---|---|
| MusicXML direction timing | `src/parser/musicxml/direction.ts` does not read `<offset>`; direction and harmony events are recorded at the current cursor. | Valid tempo/dynamics/wedge/harmony positions can be wrong. Apply measure-local offsets without moving the note cursor; represent visual and playback positions separately where MusicXML semantics require it. Respect the sound-level offset override. |
| MusicXML coverage claim | Older plan rows describe MusicXML 3.0/3.1/4.0 as “Full,” but current tests do not establish version-wide schema conformance. The phase-55–60 additions close several earlier gaps; other note-child content (for example `notehead-text`, `play`, or `listen`) still needs explicit coverage or a diagnostic. | “Full” overstates tested behavior. Publish an element/attribute matrix by version and profile; every in-scope field must be parsed/preserved/rendered or receive a stable, location-bearing unsupported-feature diagnostic. |
| Placement and pitch context | Phase 57 adds transpose metadata and sounding-pitch conversion; phase 58 adds octave-shift spans. Clef-octave changes and relevant note `default-x`/`default-y` behavior still need independent coverage against the MusicXML profile. | Some scores may have incorrect written/display positions or lose source placement. Preserve written and sounding meaning distinctly; implement the declared subset and diagnose the rest. |
| Drum engraving | Phases 41 and later drum fixes cover GM note mapping, grace-note positions, missing heads, beam continuity, and covered-rest grouping. Remaining custom notehead/SMuFL mapping, mapped chord/beam stem precedence, glyph-aware spacing, dense-voice collision, and output-bound cases need verification against the current renderer and corpus. | A correct source event may still look wrong even when present. Define precedence, use exact-glyph APIs and complete ink extents, and add geometry/render regressions; do not reopen closed 44130/115 BPM fixes without a new reproducer. |
| MXL resource safety | `src/parser/musicxml/mxl.ts` uses `unzipSync` on the complete archive before selecting `container.xml`/the rootfile; the audited upload path buffers a complete file. No explicit compressed/expanded byte, entry-count, or expansion-ratio ceilings were found. | A small hostile archive can cause excessive allocation or work. Define limits and reject over-limit files before expensive processing wherever the library allows. |
| MIDI validation and parser parity | The engine parser accepts a zero PPQ division and its event reader is not constrained to the declared `MTrk` end; a browser preview also contains a separate MIDI parser. | Malformed timing can yield invalid normalized positions or consume bytes past a track boundary; browser and engine behavior can diverge. Validate header/division/chunk bounds and share one parser or test intentional differences. |
| XML diagnostics and input boundaries | Parser-error detection, XML size/depth/time policy, DTD/external-resource policy, and user-visible structured diagnostics are not consistently specified across runtimes. | Malformed or adversarial input can be confusing or resource-intensive. Define safe limits, stable diagnostic codes/severity/location and predictable failed-upload recovery. This audit does not claim a reproduced XXE vulnerability. |
| Test evidence | The suite has meaningful targeted regressions, but producer diversity, combined-feature fixtures, independent end-to-end semantic goldens and perceptual notation references are incomplete. Browser visual tests are relatively coarse and may skip when the local browser/font is absent. Status text also contains historical test-count discrepancies. | Claims must be based on reproducible current CI evidence and a versioned corpus, not a single screenshot, a stale count, or a test that only checks nonempty output. |
| Other file and notation families | There is no direct MEI, ABC, Humdrum `**kern`, native MuseScore/Guitar Pro, or PDF/image OMR parser in the audited notation upload paths. Non-Western profiles are separately documented but not implemented as complete notation systems. | Each is a separate adapter/profile project. MIDI is performance/timing data, not a lossless engraved-score format; PDF/images need optical music recognition and human review. |

## 3. Versioned input-support matrix

A single matrix in the master plan and user-facing upload documentation must be the source of truth. It must separately state file suffix, content validation, container/version/profile, entry route, engine API, semantic coverage, render/playback role, resource limits, unsupported behavior and test evidence.

| Input family | Current status | Supported meaning / boundary | Roadmap decision |
|---|---|---|---|
| MusicXML `.musicxml` / `.xml`, partwise and timewise | Existing parser; substantial common staff subset. Version-wide conformance is **not demonstrated** by the current corpus. | Semantic notation input only for explicitly listed features and versions. Distinguish parsed, preserved, laid out, rendered and playback-resolved features. Do not label the entire 3.0/3.1/4.0 schema “Full” until conformance evidence exists. | Tier 1: stabilize and publish the bounded profile first. |
| Compressed MusicXML `.mxl` | Existing container/extraction support; audited resource and container validation gaps remain. | MusicXML rootfile semantics after extraction, with explicit container rules and byte/entry/decompression limits. | Tier 1: keep, harden, and test independently from plain XML. |
| Standard MIDI File format 0/1, PPQ | Existing parser and timing/alignment flows for notes and selected metadata. | Performance/timing and event alignment, not faithful recovery of score spelling, beams, ties, staves, voices or original page appearance. Any MIDI-to-notation reconstruction needs separate quantization, spelling and grouping policies. | Tier 1 ancillary input: retain with clear product labels and stronger validation. |
| MIDI format 2 and SMPTE-timed MIDI | Explicitly rejected by the audited parser. | Unsupported until deliberately scoped. Never silently reinterpret as supported PPQ format. | Unsupported current profile; test named diagnostics. |
| MEI | No parser or upload route found. | Broad semantic notation encoding; must select a named version/customization/module profile rather than claim the whole MEI model. | Tier 2 candidate after current-profile correctness and corpus need are established; MEI Basic is a candidate, not a commitment. |
| ABC and Humdrum `**kern` | No parser or upload route found. | Distinct text/spine-oriented symbolic formats with different syntax and layout fidelity. | Tier 3 candidates chosen by user corpus; define and test each dialect separately. |
| MuseScore `.mscz`/`.mscx`, Guitar Pro `.gp`/`.gp5`/`.gpx` | No direct parser or route found. | Application-native formats may carry data beyond interchange MusicXML; versions, container security, licensing and semantic mapping need decisions. | Defer. Document export-to-MusicXML as the interim path, including possible fidelity loss. |
| PDF or raster score images | No OMR parser/service or correction flow found. | Visual page input, not direct symbolic notation. Recognition is probabilistic and may infer notes incorrectly. | Not a notation-parser input. Consider only as a separately funded OMR conversion product with confidence and human correction. |
| Non-Western, mensural/early, or other non-staff systems | The current core is a Western staff-oriented renderer; some fractional alterations and glyph names do not constitute full tuning or tradition support. | Preserve tradition-specific written pitch, rhythm/cycle, context and glyph semantics. Do not flatten into Western `Pitch`/meter fields when that changes meaning. | Future independent notation profiles with their own importer/model/layout and domain-reviewed corpus. |

## 4. Prioritized roadmap and exit gates

The order is intentional: establish what we claim, protect the parser boundary, correct the current profile, and prove it before adding more formats. The existing phases 1–54 stay in the historical record; these follow-up stages use `C0`–`C8` so they cannot be confused with old phase numbers.

### C0 — Define support contract and reproducible evidence (P0 prerequisite)

**Deliverables**

- Publish the versioned input/feature matrix described in §3 and make picker filters, runtime validation and documentation match it.
- Replace unqualified “Full” claims with the tested, bounded profile. Clarify that “Phase 35/36 complete” means the original listed implementation work is present, not that every legal MusicXML/MXL construct is universally supported.
- Reconcile `PLAN.md`, `STATUS.md`, fixture README, website help text and CI reports. Mark fixtures as authentic or synthetic and record producer/version, source/provenance, license, covered features and expected outcome.
- Make CI publish its own passed/failed/skipped counts, runtime/browser/font versions and commit SHA. Do not carry conflicting historical totals forward as current proof.

**Exit criteria**

- Every accepted upload suffix and MIME/content path maps to one matrix row and one integration test; an automated test detects drift between the matrix and UI controls.
- Unsupported, malformed, mismatched-extension and over-limit inputs have an explicit outcome and stable diagnostic.
- Documentation does not promise arbitrary files, all schema elements, or universal cross-program visual equivalence.

### C1 — Harden untrusted import boundaries and diagnostics (P0 safety)

**Deliverables**

- Set measured compressed-upload, expanded-MXL, per-entry, archive-entry-count, XML-byte/depth/element, MIDI-byte/event-count, and processing-time ceilings for target environments. Enforce before full buffering/decompression where feasible; use cancellation or worker isolation where practical.
- Validate MXL container/rootfile selection, media type, duplicate/missing entries and safe paths. Reject unsupported/encrypted or over-limit entries with stable codes and without reflecting unsafe path text into UI messages.
- Detect XML parser errors explicitly. Define DTD/external-resource policy for each supported runtime; do not claim an XXE exploit unless reproduced. Surface diagnostic code, severity, message and available part/measure/source location to users.
- Validate MIDI header length, format/track relationship, nonzero PPQ and each `MTrk` boundary. Reject or explicitly represent partial recovery instead of returning success-shaped malformed data. Align the browser parser with `parseMidiFile`, or maintain explicit differential tests.
- Define failed replacement behavior (retain last good score or clear it), and prove the UI remains usable after error and successful retry.

**Exit criteria**

- Tests at every configured size limit and limit+1 prove predictable bounded rejection.
- Malformed XML, bad containers, truncated MIDI/VLQ/meta data, zero PPQ and events crossing declared track ends never throw uncaught exceptions, hang, produce NaN/Infinity ticks or cross chunk boundaries.
- Every emitted diagnostic code has test coverage across importer directories. A deterministic seeded mutation suite runs at least 10,000 mutations per supported byte format in a scheduled/nightly job; the committed malformed-input corpus has zero crashes in required CI.

### C2 — Fix high-impact semantics and engraving in the existing MusicXML profile (P1 correctness)

**Deliverables**

1. **Offsets:** parse `<direction><offset>` and `<harmony><offset>` in divisions without advancing note cursor; honor `sound/@offset` precedence and `sound="no"` visual/playback semantics. If one tick field cannot express both, add separate visual and playback positions.
2. **Placement and clefs:** verify `clef-octave-change` and relevant note `default-x`/`default-y`; keep written pitch, sounding pitch and source engraving placement separate where they differ. Do not list cue notes or octave-shift spans as open: phase 58 implements them.
3. **Note-child semantics:** cover or diagnose every in-scope MusicXML note child, including notehead text and playback/listening extensions. Unknown or unsupported legal content must not disappear silently.
4. **Drum map semantics:** verify exact mapped SMuFL glyph names through the exact-glyph path and define precedence among voice forcing, source `<stem>` and map direction for single notes, chords and beams. Mapped grace positions are already fixed; any remaining grace-head work must identify a new unsupported case.
5. **Geometry:** use selected glyph and complete chord ink extents in spacing; derive output/viewBox bounds from emitted ink; test collisions for 2-, 3- and 4-voice scores or publish and enforce a supported voice ceiling. Fix remaining clipping and multi-voice articulation/mark placement cases based on measured failures.
6. **Text marks:** phases 55–56 provide text rendering and selected note marks. Verify script shaping, fallback, directionality, combining-mark layout and measured extents for the explicitly supported scripts; do not describe lyrics/chord symbols/rehearsal text as wholly undrawn.

**Exit criteria**

- Add table-driven tests for positive/negative offsets, divisions changes, measure boundaries and sound-offset override; exact ticks match independent expected data and the note cursor is unchanged.
- Existing phase-58 cue/octave-shift tests stay green; additional placement fixtures conserve source events and match independently parsed positions within 0.25 staff-space; no expected event ID is missing or clipped.
- Exact-glyph, stem-precedence, grace-head, dense-spacing, output-bounds and collision tests pass; existing 44130 and 115 BPM regressions remain unchanged and pass.

### C3 — Publish a version-aware MusicXML/MXL conformance matrix (P1 contract)

**Deliverables**

- Classify each element/attribute for each claimed version/profile as `implemented`, `partial`, `preserved-not-rendered`, `intentionally unsupported`, or `ignored-with-diagnostic`.
- Make unsupported-child diagnostics uniform inside `<note>`, `<direction>`, `<harmony>`, `<notations>`, and measure/part-level content. Include stable code and part/measure/note location where available.
- Keep partwise, timewise, XML and MXL behavior separate in the fixture manifest; validate selected MXL container/rootfile semantics and limits.

**Exit criteria**

- For every in-scope element/attribute row, a valid fixture asserts semantic output or a named diagnostic. CI fails if a newly seen unhandled note child has neither an explicit matrix row nor a test.
- Schema-valid representative files for each advertised version have zero silent semantic loss. Version areas not exhaustively tested are explicitly listed as unverified, not implied complete.
- The product's “supported” wording matches the matrix and corpus.

### C4 — Build independent semantic goldens and broaden the producer corpus (P1 evidence)

**Deliverables**

- Create a versioned corpus with independently reviewed expected tuples for `(part, measure, staff, voice, onset, duration, pitch spelling/display position, tie/cue/grace state)` and expected diagnostics.
- At renderer level, assert one-to-one source-to-output event IDs except explicitly documented non-rendered/non-sounding content; assert beam group member IDs, endpoints and stem attachment; assert playback event inventory independently from SVG appearance.
- Add provenance-documented real exports from multiple authoring programs when licenses permit, plus clearly labelled synthetic edge cases and combined-feature fixtures. Isolated single-feature fixtures remain useful but must not stand in for real-world interoperability.
- Add reviewed visual references for single staff, grand staff, multipart, tablature, percussion, dense polyphony, page layout, resize/re-theme and representative text. Pin browser and font versions; store actual/reference/diff SVG/raster output as CI artifacts.

**Exit criteria**

- Every corpus fixture conserves its expected semantic inventory with zero unexplained additions/omissions/reordering.
- Every beam endpoint attaches within 0.05 staff-space in the declared browser geometry tests; every rendered ink bound is within the SVG viewBox; collision checks cover declared density limits.
- Before claiming multi-producer compatibility, target at least two authentic fixtures from each of four producer families where licensing permits. If that corpus cannot be obtained, state the evidence limit instead of claiming broad equivalence.
- Calibrate a deterministic image-diff threshold on the pinned CI renderer (≤0.5% changed pixels is an initial candidate, not a cross-platform guarantee); combine it with semantic and geometry checks so visual noise cannot conceal musical errors.

### C5 — Make route, browser and release gates match the engine contract (P1 delivery)

**Deliverables**

- Test every listed upload route through actual browser file selection for MusicXML, MXL and any MIDI route. Validate content, not just file suffix. Clearly label MIDI as timing/performance input.
- Require the engine browser/font tests in CI rather than silently skipping them; keep host/video export tests clearly separate from engine engraving tests.
- Build and expose a bundle build ID or source revision; assert source bundle, generated website bundle and all versioned URLs are synchronized. Test cold-cache and warm-cache page loads against the expected API/build ID.
- Keep CI-generated verification records and a maintained status page tied to actual code/tests; make failed upload recovery and structured diagnostics user-visible.

**Exit criteria**

- All supported-format route tests pass; rejected formats show actionable messages, never a misleading blank or stale score.
- Required browser tests execute in CI (not skip); visual artifacts and runtime versions are retained on failure.
- The deployed asset provenance/cache smoke test detects a stale or mismatched bundle.

### C6 — Add one explicitly scoped symbolic notation adapter only when user need justifies it (P2)

**Candidate order, not a commitment:** MEI Basic/versioned profile first; ABC and Humdrum `**kern` as separately scoped later candidates. Choose based on actual incoming user files and maintainer capacity.

**Deliverables**

- For each chosen format, name exact standard version/customization/dialect and feature subset before implementation.
- Map semantics into the common score model only where meaning is shared; preserve warnings and format-specific source data where necessary. Do not promise source page layout if the input format does not encode it.
- Keep each importer, fixtures, diagnostics, upload path and support-matrix row independent. Native MuseScore/Guitar Pro formats remain deferred until exact versions, licensing/container risk and product need are established.

**Candidate exit criteria**

- A MEI profile, if selected: at least 20 provenance-documented fixtures from at least three producers/repositories; at least 95% parse without fatal errors for the named subset; exact note/rest inventory for that subset; unsupported constructs diagnosed; semantic round-trip tests for preserved fields.
- ABC or `**kern`, if selected: at least 50 valid fixtures per named dialect; exact supported event counts/durations and malformed-syntax diagnostics; rendering appearance assessed separately from parsing because the source need not preserve page layout.
- Native formats are not listed as supported until exact versions and containers have security tests and at least 30 representative files have an explicit open-or-diagnostic outcome with no silent required-field loss.

### C7 — Decide whether image/PDF OMR is a separate product capability (P2 decision)

Until approved and implemented, PDF/images must be rejected by notation-parser routes with instructions to provide a supported symbolic file. OMR is not direct file parsing: it infers symbols and structure from pixels and needs confidence reporting and correction.

If pursued, specify supported notation domain, scan/page/resolution requirements, instruments/scripts, confidence calibration, correction UI, export format and operational cost before building. Benchmark on at least 100 held-out pages from multiple sources; report pitch and onset/duration metrics separately. A proposed launch gate is at least 95% note-event F1 on a declared restricted domain, with calibrated abstention and mandatory correction for low-confidence cases. This threshold must be validated with domain experts; it is not a claim of current recognition quality.

### C8 — Extend text, tuning and notation traditions as independent profiles (P3 domain work)

- Complete MusicXML staff-profile handling of named accidentals, fractional alterations, non-traditional keys, `key-step`, `key-alter`, `key-accidental`, and `key-octave` only with explicit accidental-state and glyph-placement semantics.
- If supporting non-Western or early notation, build a profile-owned semantic model and layout for the named tradition (for example Jianpu, Sargam, Kepatihan, Byzantine neumes or mensural notation). Keep tonic/mode/tuning, rhythmic cycle, native spelling and glyph meaning intact. Do not coerce these into Western staff `Pitch`/meter fields if that changes meaning.
- If enabling lyrics/chord symbols/words, implement script-aware font fallback/shaping, directionality, combining marks, text extents and collision behavior. Name tested languages/scripts and fonts.
- Do not infer tuning frequency or MIDI pitch where the profile lacks a tonic/tuning reference. Preserve unresolved native information and explain it.

**Exit criteria**

- Every delivered profile names version/variant and publishes supported/unsupported tables, at least 20 semantic fixtures and 10 domain-reviewed visual references.
- Context-dependent pitch remains unresolved unless the selected profile defines its interpretation; written identity and optional sounding realization round-trip independently.
- Text rendering claims are limited to scripts/languages actually tested with pinned fonts and browser shaping.

## 5. Cross-cutting engineering rules

1. **No silent semantic loss.** Every supported input field must be parsed, preserved, rendered/resolved as promised, or given a stable diagnostic and documented fallback/rejection.
2. **Separate layers.** Track parse, preserve, layout, render and playback status independently. MIDI event parsing does not imply notation engraving; glyph availability does not imply full notation semantics.
3. **Bound untrusted work.** Set file, archive, depth, event-count, memory and runtime budgets before expensive operations. Reject safely and recover the user interface predictably.
4. **Use independent oracles.** Do not generate expected outputs from the implementation under test. Review semantic fixtures and golden-image updates.
5. **Make compatibility evidence explicit.** Tag producer, version, provenance, license and feature combinations. Synthetic fixtures are not authentic exports.
6. **Keep CI mandatory and current.** Report passed/failed/skipped counts, commit identity, browser/font version and artifact hashes. Do not treat stale status totals as present proof.
7. **Separate domain adapters.** Share SVG, diagnostics, provenance and other demonstrably neutral infrastructure; use domain-specific pitch/notation models where semantics differ.
8. **Do not encode future status as completed.** This document records requirements. Only code, tests, current CI and updated status evidence may close a row.

## 6. Completed user-reported fixes that remain closed

The following work is already present on the audited merged `main` baseline. The broader roadmap does not reopen these regressions; keep their tests as permanent gates while fixing adjacent gaps.

- **44130 missing drum-note heads:** the mixed shared/local beam path skipped 176 chord heads. The renderer correction and full-score regression preserve all 794 parsed noteheads, including 441 normal drum heads and 353 hi-hat X heads.
- **44130 beam continuity:** the initial note-loss correction split continuous mixed-voice quarter-note runs. The follow-up collects eligible staff-wide attacks and verifies 88 primary beam runs across 88 measures while retaining all 794 heads.
- **115 BPM covered-rest grouping:** a secondary voice’s quarter rest at a tick occupied by another voice’s attack no longer breaks the beam. The small checked-in fixture reproduces the case; the exact user score renders 162/162 heads and each of its 27 active four-hit measures beams through beat 4.
- **Merge and verification provenance:** the drum fixes were delivered through merged PRs #6, #7 and #8. The updated audited baseline is main commit `8906127`, which also contains phases 55–60. Those phases passed `npm run verify` at **1,129/1,129** on 2026-11-12; obtain a fresh result for any later code change rather than treating this historical count as current.

These repairs prove that the reported failures were real and that targeted regression tests matter. They do not establish complete support for all MusicXML elements, all authoring software, arbitrary MIDI variants, image/PDF scores or every notation tradition.

## 7. References

- W3C, [MusicXML 4.0 reference](https://www.w3.org/2021/06/musicxml40/), including [`offset`](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/offset/), [`sound`](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/sound/), [`cue`](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/cue/), [`note`](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/note/) and the [compressed-MXL tutorial](https://www.w3.org/2021/06/musicxml40/tutorial/compressed-mxl-files/).
- [MIDI Association specifications](https://midi.org/specs) and the [Standard MIDI File 1.1 reference](https://midimusic.github.io/tech/midispec.html).
- [Music Encoding Initiative Guidelines](https://music-encoding.org/guidelines/) and the [Library of Congress MEI guide](https://guides.loc.gov/music-notation-preferred-preservation-formats-for-digital-scores/music-encoding-initiative).
- [ABC 2.1 standard](https://abcnotation.com/wiki/abc:standard:v2.1) and [Humdrum `**kern` reference](https://www.humdrum.org/rep/kern/).
- MuseScore Studio Handbook, [file formats](https://musescore.org/en/handbook/4/file-formats); Guitar Pro, [file management](https://www.guitar-pro.com/docs/gp8/basics/first-steps/file-management).
- OWASP, [XML External Entity Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html); PKWARE, [ZIP APPNOTE](https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT).
- Library of Congress, [Recommended Formats for Musical Scores](https://www.loc.gov/preservation/resources/rfs/musical-scores.html); [full-page optical music recognition research](https://arxiv.org/html/2405.12105v4).
- W3C Community Group, [SMuFL specification](https://w3c.github.io/smufl/latest/); MEI, [neume notation](https://music-encoding.org/guidelines/v4/content/neumes.html) and [mensural notation](https://music-encoding.org/guidelines/v4/content/mensural.html).
