# Notation Engine — Full Build Plan (Phase 1 → Phase 50)

**Stack:** TypeScript + SVG (no VexFlow/AlphaTab dependency — everything hand-built)
**Scope:** General-purpose music notation engine — works for ANY instrument (piano,
guitar, drum kit, orchestral parts, etc.), not just drums.
**Status:** Planning only. No code written yet. Nothing in this plan starts until
explicitly approved step-by-step.

---

## GROUP A — Foundation (Phase 1–8)

**Phase 1 — Repo & folder structure**
`notation-engine/` အောက်မှာ:
```
notation-engine/
  src/
    core/          <- data model (Score, Part, Measure, Voice, Note, Duration)
    parser/        <- MusicXML (and later MIDI) → core model
    geometry/      <- staff/glyph/beam math, pure functions, no SVG
    render/         <- SVG DOM building from geometry
    layout/        <- horizontal-scroll engine + paginated engine
    cursor/        <- cursor state machine + sync modes
    theme/         <- colors, fonts, sizes, all overridable tokens
    config/         <- the single JSON/TS config schema for every user-facing setting
    glyphs/         <- SMuFL glyph table + font metadata loader
    export/         <- SVG/PNG/PDF export
    plugins/        <- extension points (custom noteheads, custom instruments)
  test/
    fixtures/      <- sample MusicXML files (piano, guitar, drum, orchestral)
    visual/         <- snapshot/visual-regression tests
  docs/
  PLAN.md          <- this file
```
**Phase 2 — Toolchain**: TypeScript config (strict mode), bundler (esbuild, already
proven working in this project), lint/format rules, package.json scripts.

**Phase 3 — Core data model v1**: `Pitch`, `Duration`, `Note`, `Rest`, `Chord`,
`Voice`, `Measure`, `Part`, `Score` — instrument-agnostic. A "Note" never assumes
pitched vs unpitched; percussion is just a `Note` whose `Pitch` maps through an
"unpitched display" table instead of a clef-derived staff position.

**Phase 3b — Full cross-instrument note fidelity (hard requirement)**: the
engine must correctly write back out **every note** from **any** instrument's
MusicXML — Drum XML, Piano XML, Vocal XML, or any other instrument — with
nothing dropped, misplaced, or silently approximated, **regardless of how
many staff lines that instrument's XML uses** (5-line standard, 1-line
percussion, 6-line tab, or anything else). Concretely, this means:
- **Drum XML** → every unpitched note (kick, snare, hi-hat, cymbals, toms)
  renders on its correct line/space with its correct notehead shape (Phase
  17/38), even on a reduced-line-count drum staff.
- **Piano XML** → every note across both hands renders correctly on the
  treble+bass grand staff (Phase 15), including notes that cross between
  the two staves, chords, and multi-voice passages (Phase 31/32).
- **Vocal XML** → every sung note renders correctly with its matching lyric
  syllable underneath (Phase 33), including ties/slurs across syllables.
- **Any other instrument** (strings, brass, guitar tab, etc.) → the same
  pitch/duration/voice logic from Phase 3/4 applies uniformly; nothing in
  the core data model or renderer may special-case "drums" vs "piano" vs
  "vocals" as separate code paths — they are all just configurations of
  the same general engine (clef choice, notehead mapping, staff line count,
  lyrics on/off).
This requirement gates Phase 39 (the end-to-end XML pipeline test), which
must include real Drum, Piano, and Vocal MusicXML fixtures specifically to
verify this, not just one instrument type.

**Phase 4 — Duration/tick math**: divisions, ticks, tuplet ratios, dotted-note
expansion, tie-across-barline handling. Pure functions, unit-tested against known
MusicXML tick values.

**Phase 5 — SMuFL glyph table**: load Bravura (or any SMuFL font) metadata JSON;
expose `getGlyph(name)` returning codepoint + engraving-default metrics (stem
thickness, notehead anchor points) — this is the single source of truth other
phases read from, instead of hardcoding magic numbers.

**Phase 6 — SVG primitives layer**: thin wrapper for `<path>`, `<text>`,
`<g>`, `<line>` with a consistent coordinate system (staff-space units, not
pixels) so every later phase draws in the same units and one global scale
factor changes the whole rendering.

**Phase 7 — Config schema (the customization backbone)**: a single typed config
object that every phase 8+ feature reads from — nothing is hardcoded anywhere
else. Sections already stubbed for: colors, layout mode, cursor mode, notehead
mapping, beam style, bar-number display, key-signature style. Every later phase
just fills in its own section.

**Phase 8 — Testing harness**: headless SVG render → pixel/DOM snapshot compare
(same technique already validated in the earlier VexFlow debugging session),
so every phase from here has a regression safety net.

---

## GROUP B — Staff, Clef & Key (Phase 9–15)

**Phase 9 — Stave/staff line rendering**: 1–6 line staves (5-line standard, but
1-line/single-line and 6-line tab supported from day one since config-driven).

**Phase 10 — Clef engine**: treble, bass, alto, tenor, soprano, percussion,
tab, octave-shifted (8va/8vb) clefs. Clef determines the pitch↔line mapping
function for pitched staves; percussion clef uses the separate unpitched-display
table instead.

**Phase 11 — Key signature engine**: circle-of-fifths accidental ordering,
correct vertical position of each sharp/flat per clef (this differs per clef —
treble vs bass vs alto all place the same key differently), key signature
**style options**: standard sharps/flats glyphs vs. custom placement overrides,
cancellation naturals when key changes mid-piece.

**Phase 12 — Time signature engine**: numeric (4/4, 7/8...), common/cut time
symbols, compound/irregular signatures, mid-piece time signature changes.

**Phase 13 — Barline & measure engine**: single, double, final, repeat-begin,
repeat-end, repeat-both, dashed. **Bar/measure numbering options** (config-driven):
off / every bar / every N bars / only at system start — each with position
(above stave) and font style configurable.

**Phase 14 — Ledger lines**: automatic above/below-staff ledger line generation
for any clef, any pitch, driven purely by staff-position math from Phase 10.

**Phase 15 — Multi-stave / grand staff**: piano-style linked staves (treble+bass
joined by a brace), and multi-part scores (one staff per instrument) sharing one
horizontal timeline — needed for "works for all instruments," not just single-staff
drum kit.

---

## GROUP C — Notes, Noteheads & Rests (Phase 16–22)

**Phase 16 — Notehead shape library**: round (default), x, diamond, triangle,
square, slash, circle-x, plus-shape — all as SMuFL glyph lookups, not custom
paths, so they stay font-consistent.

**Phase 17 — Notehead-shape mapping system (the "စိတ်ကြိုက်ပြင်" requirement)**:
a config table mapping *(instrument, pitch-or-MIDI-note) → notehead shape*.
Fully user-editable at runtime — e.g. remap kick=round, snare=round,
hi-hat=x, cymbal=x, or any pitched-instrument override (e.g. muted-note = x
notehead on guitar). This generalizes what the drum project needed into a
reusable engine feature.

**Phase 18 — Note color system**: per-note, per-voice, per-instrument, or
per-notehead-shape color overrides via the theme config; also supports a
single global "ink color" default (for the black/white-video use case from
the earlier drum project) that any per-note override can still take precedence
over.

**Phase 19 — Stem engine**: direction rules (auto by staff position, or forced
up/down per voice — needed for multi-voice-on-one-staff like the drum hand/foot
split), stem length rules, stemlets for rests inside beams.

**Phase 20 — Flag engine**: individual note flags (8th/16th/32nd/64th) for
unbeamed notes, direction-aware (flips with stem direction).

**Phase 21 — Rest engine**: all rest durations, correct vertical placement per
clef/voice, rest-collision avoidance between multiple voices on one staff.

**Phase 22 — Accidental engine**: sharp/flat/natural/double placement, correct
horizontal stacking when multiple accidentals collide in a chord, courtesy
accidentals, micro-tonal glyphs (SMuFL has codepoints for these already via
Phase 5).

---

## GROUP D — Beams, Ties, Tuplets & Modifiers (Phase 23–30)

**Phase 23 — Beam grouping algorithm**: duration-based auto-grouping (by time
signature beat structure), manual group-size override, secondary breaks.

**Phase 24 — Beam geometry & style ("မျဥ်းစောင်း/မျဥ်းဖျောင့်" requirement)**:
this is its own phase specifically because the user wants it switchable:
- **Straight/slanted beam** (standard engraving default — angled to follow the
  melodic contour, clamped to a max slope)
- **Flat/horizontal beam** (no slope — common in simplified/rhythm notation
  and some drum charts)
- **Curved beam** (a bezier-based custom style) as a third selectable option
All three share the same underlying note-position data; only the line-drawing
function switches based on `config.beamStyle`.

**Phase 25 — Cross-staff beaming**: beams spanning two staves (grand staff /
multi-voice), needed for full piano-repertoire support.

**Phase 26 — Tie engine**: curved tie rendering between same-pitch notes across
beats/barlines, direction (above/below) auto-selection based on stem direction.

**Phase 27 — Slur engine**: phrasing slurs across multiple notes, independent
curve-shape config from ties (since slurs typically span further and need a
flatter arc).

**Phase 28 — Tuplet engine**: bracket + ratio-number rendering (triplets,
quintuplets, any N:M ratio), nested tuplets.

**Phase 29 — Articulations & ornaments**: staccato, accent, tenuto, marcato,
trill, turn, mordent, fermata — all SMuFL-glyph driven, position auto-computed
relative to notehead/stem.

**Phase 30 — Dynamics & expression text**: pp–ff glyphs, hairpins
(crescendo/decrescendo), tempo markings, rehearsal marks, text directives.

---

## GROUP E — Multi-Voice, Lyrics & Chords (Phase 31–35)

**Phase 31 — Multi-voice-per-staff engine**: N independent voices sharing one
stave (generalizes the drum hand/foot split into an N-voice system for any
instrument — e.g. SATB choir on one staff, or piano LH/RH split voices).

**Phase 32 — Voice collision/formatting**: automatic horizontal offset when two
voices' noteheads collide, rest-position separation per voice (the fix already
proven necessary in the drum prototype, now built as a first-class engine
feature instead of a patch).

**Phase 33 — Lyrics engine**: syllable-per-note text, hyphen/underscore
continuation lines, multiple verses stacked.

**Phase 34 — Chord symbol engine**: text-based chord symbols above the staff
(C, Dm7, G7/B...) with configurable font/position, independent of the
notehead-chord (stacked-pitches) rendering from Phase 3/16.

**Phase 35 — Grace notes**: small-size grace notes/groups (acciaccatura,
appoggiatura) attached to a main note, with slur-to-main-note auto-drawn.

---

## GROUP F — XML Import Pipeline (Phase 36–40)

**Phase 36 — MusicXML parser v1**: pitches, durations, voices, ties, backup/
forward (multi-voice tick tracking — already solved once in the drum prototype,
now generalized), divisions, measures.

**Phase 37 — MusicXML parser v2**: key signatures, time signatures, clefs
(including mid-piece changes), barlines/repeats, tempo, dynamics, articulations,
lyrics, chord symbols — i.e. every notation feature from Groups B–E gets its
matching XML importer.

**Phase 38 — Unpitched/percussion XML handling**: `<unpitched>`,
`<midi-instrument>`, `<notehead>` elements → feeds directly into the Phase 17
notehead-mapping system, so percussion is just one configuration of the
general engine, not a separate code path.

**Phase 39 — "XML in → full notation out" pipeline test**: one function,
`renderFromMusicXML(xmlText, config) → SVG`, exercised against a battery of
real-world sample files (solo piano, string quartet, drum kit, guitar tab,
and a vocal/lyrics score) covering every feature from Groups B–E end to end,
and specifically verifying the Phase 3b cross-instrument fidelity requirement
(drum, piano, and vocal XML each render every note correctly).

**Phase 39b — Cross-software MusicXML compatibility (hard requirement)**: the
parser must correctly render a MusicXML file **no matter which software
exported it** — MuseScore, Sibelius, Finale, Dorico, Guitar Pro, and any DAW's
export are all valid MusicXML but each vendor emits slightly different
element ordering, optional-field usage, and quirks (e.g. some omit
`<divisions>` per part instead of once globally, some encode ties as
`<tied>` notations only, others also duplicate via `<tie>` start/stop, some
put `<backup>/<forward>` differently for multi-voice). Build a compatibility
test suite with real sample exports from each of the above programs (not just
hand-written test fixtures) and treat any of them failing to render correctly
as a bug in our parser, never as "that software's fault." This phase gates
Phase 40.

**Phase 40 — Import error handling & partial-render fallback**: malformed/
incomplete XML should still render whatever can be understood rather than
failing the whole page, with clear diagnostics logged.

---

## GROUP G — Layout Engine (Phase 41–44)

**Phase 41 — Horizontal continuous-scroll layout**: single long system, no page
breaks — the mode already used in the drum-video project (pan-based).

**Phase 42 — Paginated layout**: notation reflows into fixed-size pages
(A4/Letter/custom) with system breaks and margins, matching how MuseScore/
Guitar Pro print output looks — user picks `config.layoutMode: 'scroll' |
'page'`.

**Phase 43 — Formatter/spacing algorithm**: horizontal note-spacing
proportional to duration (with a configurable spacing curve), justification
to fill system width, minimum-padding rules between accidentals/noteheads/
articulations so nothing overlaps.

**Phase 44 — Responsive re-layout / arbitrary W×H resize (hard requirement)**:
the whole rendered notation must be resizable to **any width and height**
on demand — not just a few preset zoom levels — without re-parsing the XML.
Concretely: `engine.resize(width, height)` re-flows systems, re-wraps
measures, and re-scales glyphs/staff-space to fit the new box, for both the
scroll layout (Phase 41) and the page layout (Phase 42). This is needed for:
the video-export use case (arbitrary frame sizes — 16:9, 9:16, custom), an
embeddable web widget (container size unknown ahead of time), and print
output at different paper sizes. Re-layout must be fast enough to run on
every resize event, not just once at load.

---

## GROUP H — Cursor System (Phase 45–47)

**Phase 45 — Cursor data model**: a time-position (quarter-note position or
seconds, convertible via tempo map) independent of layout — the cursor concept
is decoupled from rendering so it works under both scroll and page layouts.

**Phase 46 — Sync mode A: "Cursor moves, notation stays still"**: a vertical
line/marker sweeps across a fixed, fully-rendered notation view (like a
karaoke bouncing ball) — good for page layout / print-style display.

**Phase 47 — Sync mode B: "Notation moves, cursor stays still"**: the notation
pans/scrolls underneath a fixed cursor reference point (the mode already built
for the drum video project) — good for scroll layout / narrow video frames.
Both modes are selected via `config.cursorMode: 'cursorMoves' | 'notationMoves'`
and share the same underlying time→pixel-position mapping function from
Phase 45, so switching modes is a config change, not a rewrite.

---

## GROUP I — Theming, Customization & Export (Phase 48–50)

**Phase 48 — Full theming API (hard requirement: color is always changeable)**:
every visual token exposed through one config object — ink/background color,
per-element color overrides (Phase 18: per-note, per-voice, per-instrument,
per-notehead-shape, and one global override-everything ink color), font
family/size for text elements, staff-line thickness, glyph size scale, beam
style (Phase 24), notehead mapping (Phase 17), bar-number display (Phase 13),
key-signature style (Phase 11), layout mode (Phase 42), cursor mode (Phase 47),
and W×H resize (Phase 44) — i.e. this phase is where every
"စိတ်ကြိုက်ပြင်ဆင်" requirement from earlier phases gets unified into one
documented, typed settings object rather than scattered flags. Color changes
and resize calls must both be runnable live on an already-rendered score
(re-theme / re-flow in place) — neither requires re-parsing the source XML.

**Phase 49 — Export engine**: SVG-to-PNG rasterization (for video-frame
compositing, matching the drum project's needs), direct SVG export, and PDF
export (multi-page, using the Phase 42 paginated layout).

**Phase 50 — Plugin/extension points & documentation**: a stable public API
so custom notehead glyphs, custom instruments, or custom render passes (e.g.
a new beam style beyond straight/flat/curved) can be added without touching
engine internals; full API reference docs generated from TypeScript types.

---

## Notes on sequencing

- Groups A→D must be built roughly in order (each depends on the data model
  and glyph table from Group A).
- Group E (multi-voice/lyrics/chords) can start once Group C is stable.
- Group F (XML import) intentionally comes *after* Groups B–E exist, so the
  parser has real rendering features to map onto — importing into an engine
  that can't yet draw a tuplet would just mean re-doing the importer later.
- Groups G (layout) and H (cursor) are independent of each other and can be
  built in parallel once Group F's pipeline exists to feed them real scores.
- Group I is deliberately last: it's the phase that *exposes* all the
  configurability the earlier phases already built in, rather than adding new
  rendering features.

**Nothing above is implemented yet.** This is the full roadmap only, per your
instruction. Tell me which phase to start with.

---

# ADDENDUM — Production / Industry-Grade Requirements

The Phase 1–50 roadmap remains the canonical rendering roadmap. The additions below are required to make the engine robust enough for a serious notation editor, interchange library, playback system, and long-term platform.

## GROUP J — Semantic Model & Architecture Hardening (Phase 51–56)

**Phase 51 — Stable identity & provenance model**: every Score/Part/Staff/Measure/Voice/Event/Note/Notation object gets a stable ID that survives layout, reflow, rendering, editing, and export. Preserve source provenance (`sourceId`, source file, XML path where useful) separately from engine IDs so importer/debugger/exporter can trace any rendered object back to input.

**Phase 52 — Canonical timeline / event graph**: introduce an internal time model independent of MusicXML ordering. Store musical position in exact rational units (no floating-point accumulation for rhythmic time), while keeping derived seconds/pixels in separate layers. Support simultaneous events, voices, grace-note zero-time events, tuplets, pickups, hidden/cue content, and cross-staff events without encoding them as parser-specific hacks.

**Phase 53 — Immutable score state + derived caches**: distinguish authoritative musical state from derived geometry/layout/render caches. A resize, theme change, or cursor movement must invalidate only the required cache layers and never re-parse source notation. Support deterministic serialization of the canonical state for debugging and persistence.

**Phase 54 — Diagnostic and error model**: replace ad-hoc logs with typed diagnostics (`error`, `warning`, `info`, `recovered`) carrying source location, object ID, phase, and human-readable explanation. Import must be recoverable where possible, but never silently discard unsupported content; preserve unknown XML/extensions in an extension bucket when safe.

**Phase 55 — Event / observer API**: expose stable events such as `scoreLoaded`, `layoutChanged`, `selectionChanged`, `cursorChanged`, `rendered`, `diagnostic`, `exported`, and `historyChanged`. This decouples the core engine from any particular UI framework.

**Phase 56 — Versioned public schema/API**: define explicit engine-version and serialized-model versions. Provide migration hooks so stored scores/configs can be upgraded without breaking older documents.

## GROUP K — MusicXML 4.x Fidelity & Interchange (Phase 57–63)

**Phase 57 — Full score-header fidelity**: preserve and render `work`, movement data, identification, credits, defaults, fonts, scaling, page layout, system layout, staff layout, appearance, part-list, groups, and related metadata. MusicXML 4.0 explicitly separates score-header data from musical data and includes these areas as first-class parts of the format.

**Phase 58 — Full musical-content coverage**: extend parser/IR coverage beyond basic notes to all practical MusicXML content: `direction`, `sound`, harmony, figured bass, print/layout instructions, grouping, links/bookmarks, listening/assessment-related elements, repeats/jumps, and other schema-defined constructs. Do not treat these as optional “extra decorations” if they affect playback, structure, or engraving.

**Phase 59 — Notation-vs-performance dual representation**: preserve MusicXML's distinction between notation information and sound/performance information. For example, `<tie>` and `<tied>` are not interchangeable, and `<sound>` carries playback state that may not have a visible symbol. Keep both channels in the internal model.

**Phase 60 — Exact layout-hint ingestion**: import page/system/staff layout hints and per-element graphical attributes when present, including default-x/default-y, relative-x/relative-y, print-object, print-style, placement, and related properties. Treat imported positions as hints/overrides with an explicit precedence policy versus automatic engraving.

**Phase 61 — Cross-software fixture matrix**: maintain real exported files from MuseScore, Sibelius, Finale, Dorico, Guitar Pro and representative DAWs/sequencers. Test both common features and vendor quirks. Keep each compatibility case as a named fixture with expected semantic and visual output.

**Phase 62 — Validation + semantic linting**: validate against MusicXML schema plus engine-level semantic checks for invalid-but-schema-valid combinations, impossible timing, orphaned start/stop notations, mismatched tuplets, duplicate IDs, broken references, and contradictory layout directives.

**Phase 63 — Lossless extension preservation**: when encountering unsupported MusicXML extensions or vendor-specific namespaces, preserve them where possible so import → edit supported fields → export does not unnecessarily destroy information.

## GROUP L — Engraving / Layout Quality (Phase 64–72)

**Phase 64 — Constraint-based spacing model**: formalize horizontal spacing as constraints rather than only “duration × width”. Accidental clusters, dots, ledger lines, articulations, lyrics, chord symbols, dynamics, clefs, key signatures, courtesy symbols, and system text must contribute minimum distances and alignment constraints.

**Phase 65 — Vertical collision / stacking engine**: create a reusable vertical placement solver for dynamics, lyrics, rehearsal marks, tempo text, hairpins, ottavas, pedal markings, chord symbols, articulations, slurs and system text. Support minimum distances, attachment anchors, and collision groups.

**Phase 66 — Beaming decision engine**: separate beam grouping semantics from beam geometry. Support beat-structure grouping, secondary beam breaks, rests inside beams, mixed beam levels, tuplets, grace-note beams, cross-staff beams, and explicit imported beam overrides. Keep geometry style (`straight`, `flat`, `curved`) independent from grouping logic.

**Phase 67 — System/page breaking intelligence**: add automatic line/page break scoring based on fullness, collisions, phrase boundaries, rehearsal marks, lyrics, long spanners, and user-specified breaks. Avoid orphan/widow systems where possible. Permit encoded/manual breaks to override automatic decisions.

**Phase 68 — Condensing / part extraction preparation**: design the internal representation so multiple instruments/parts can later be condensed into a conductor score and extracted back into individual parts without rewriting musical semantics.

**Phase 69 — Optical / facsimile positioning mode**: support a mode where imported absolute positioning can be retained or edited without forcing reflow. This is useful for archival/facsimile workflows and follows the distinction between automatic layout and explicitly positioned content used in advanced notation systems.

**Phase 70 — Engraving profiles**: allow named profile presets such as `standard`, `choral`, `drum-chart`, `jazz-lead-sheet`, `education`, and `facsimile`, each expressed only through config tokens/rules rather than instrument-specific rendering code.

**Phase 71 — Measurement / bounding-box infrastructure**: every drawable object can expose semantic bounds, visual bounds, attachment anchors, and collision bounds. This supports hit-testing, collision solving, accessibility, debugging overlays, and reliable export.

**Phase 72 — Deterministic layout**: identical score + identical config + identical font resources must produce deterministic layout coordinates and SVG structure so visual regression and cached rendering remain reliable.

## GROUP M — Interaction / Editing (Phase 73–80)

**Phase 73 — Selection model**: selection by note, chord, rest, beat, voice, measure, staff, part, range, or arbitrary set. Selection must be semantic and survive re-layout.

**Phase 74 — Hit testing**: map SVG/geometry objects back to semantic IDs using stable IDs and bounds. Hover, click, drag, context menus, and keyboard interaction must operate on the semantic model rather than brittle DOM selectors.

**Phase 75 — Command-based editing**: implement edits as commands (`insertNote`, `deleteEvent`, `changeDuration`, `transpose`, `splitMeasure`, `mergeMeasure`, `changeClef`, `setLyric`, etc.) instead of direct mutation from UI code.

**Phase 76 — Undo/redo history**: command history with grouping, coalescing, branching policy, and serialization rules. Large operations should be transaction-based so a single user action undoes atomically.

**Phase 77 — Notation-aware editing rules**: inserting/editing a note must automatically reconcile duration, voices, rests, ties, beams, accidentals, tuplets, measure validity, and layout where appropriate. Never leave the score in a structurally corrupt intermediate state.

**Phase 78 — Keyboard and accessibility editing**: complete keyboard navigation, focus management, semantic labels, high contrast support, scalable text, and reduced-motion behavior.

**Phase 79 — Collaboration-ready change model (optional but architecturally valuable)**: model changes as addressable operations so future multiplayer/collaborative editing can be added without replacing the core score model. Collaboration is not required for v1, but stable operation IDs and conflict boundaries are valuable early.

**Phase 80 — Clipboard interchange**: define an internal clipboard format plus MusicXML fragment import/export for copying notes, measures, lyrics, and chord symbols between engine instances.

## GROUP N — Playback / MIDI / Temporal Services (Phase 81–88)

**Phase 81 — Tempo map**: central tempo model supporting metronome marks, gradual tempo changes, ritardando/accelerando, fermata policies, and imported playback tempo information.

**Phase 82 — Playback timeline**: resolve repeats, endings, jumps, segno/coda, D.C./D.S., Fine, and other navigation instructions into a playable event sequence without mutating the written score.

**Phase 83 — MIDI import/export**: import MIDI into the canonical timeline with quantization policy; export notation events to MIDI with tempo, program/instrument, channel, dynamics, pedal, and repeat-resolution policy documented.

**Phase 84 — Playback-state model**: note-on/off, velocity, articulation modifiers, sustain, program changes, instrument changes, pan, dynamics, and playback techniques must be represented independently from visual notation where appropriate. MusicXML 4.0's `<sound>` and `<play>` elements demonstrate why these channels cannot be collapsed into notation glyphs alone.

**Phase 85 — Cursor synchronization service**: make cursor ↔ musical time ↔ playback time a single shared service used by both cursor modes, timeline APIs, selection playback, loop regions, and future audio-following features.

**Phase 86 — Loop / practice transport**: loop range, count-in, metronome, tempo multiplier, pause/resume, seek, current measure/beat, and pre-roll.

**Phase 87 — Audio/MIDI scheduling abstraction**: keep the notation engine independent of a single browser audio implementation. Expose a scheduling interface so Web Audio, MIDI hardware, or external players can be plugged in.

**Phase 88 — Score-following readiness**: reserve stable mappings from audio/playback time to score events and measures for future automatic score-following/assessment use cases. MusicXML 4.0 explicitly added support relevant to score following and machine-listening applications.

## GROUP O — Font / SMuFL / Rendering System (Phase 89–94)

**Phase 89 — SMuFL profile loader**: load not only glyph codepoints but ranges, glyph classes, bounding boxes, anchors, recommended codepoint relationships, and engraving defaults from the selected SMuFL font metadata. SMuFL engraving defaults include staff-line, stem, beam, ledger-line and other layout-related metrics.

**Phase 90 — Font fallback policy**: detect missing SMuFL glyphs and text-font glyphs; provide explicit fallback behavior and diagnostics rather than silently substituting visually incompatible symbols.

**Phase 91 — Embedded / linked font export policy**: SVG export must define whether music fonts are embedded, linked, or omitted, with deterministic behavior across browser and server rendering. SVG should use a viewBox and stable data/semantic attributes for downstream integration.

**Phase 92 — Font metrics calibration**: support per-font calibration and engraving profile overrides while keeping the engine's canonical geometry in staff-space units.

**Phase 93 — Glyph cache**: cache parsed font metadata and rendered glyph definitions; do not repeatedly parse metadata or recreate equivalent SVG paths/text nodes for large scores.

**Phase 94 — Rendering backends**: keep geometry independent from SVG so a future Canvas/WebGL or server raster backend can be added without rewriting notation rules.

## GROUP P — Export / Document / Print (Phase 95–100)

**Phase 95 — PDF fidelity**: guarantee multi-page pagination, fonts, clipping, links/metadata policy, and consistent metrics between on-screen SVG and PDF output.

**Phase 96 — PNG/video export**: frame-accurate rendering at arbitrary W×H, deterministic fonts, transparent/background modes, and efficient partial redraw for video generation.

**Phase 97 — Print policy engine**: page size, margins, orientation, headers/footers, system/page breaks, part names, bar numbers, and print scaling should be explicit profile settings. MusicXML 4.0 has score-wide defaults plus per-page/per-system print/layout elements that may affect appearance.

**Phase 98 — Export verification**: every exporter should have semantic and pixel-level regression fixtures, including multi-page scores and extreme aspect ratios.

**Phase 99 — Document package format**: optional native package format containing score state, assets, fonts/license metadata, theme/config, and provenance. Keep this separate from MusicXML so native persistence can be lossless without pretending to be an interchange standard.

**Phase 100 — Backward-compatible migration / recovery**: document import/export version migration, backup/recovery, autosave checkpoint format, and corrupted-document recovery strategy.

## GROUP Q — Testing / Performance / Reliability (Phase 101–108)

**Phase 101 — Golden-score corpus**: maintain a permanent corpus spanning piano, SATB/vocal, orchestral, chamber, guitar/tab, drum kit, percussion, lead sheet, jazz, tuplets, polymeter, microtones, lyrics, repeats, grace notes, and dense multi-voice passages.

**Phase 102 — Semantic round-trip tests**: parse → canonical model → export → parse and compare semantics, not only XML text. XML ordering differences should not fail a semantic round trip.

**Phase 103 — Visual golden tests**: render canonical fixtures to SVG and compare both DOM structure and rasterized appearance with controlled tolerances.

**Phase 104 — Fuzz / adversarial input tests**: randomize malformed XML, large scores, pathological tuplets, giant lyrics, missing references, unusual staff counts, and vendor extensions. The parser must fail safely and emit diagnostics.

**Phase 105 — Performance budgets**: define explicit budgets for parse time, layout time, render time, memory, resize latency, cursor updates, and export throughput at several score sizes.

**Phase 106 — Incremental invalidation**: editing one note should not cause full-score recalculation unless dependency analysis requires it. Measure-level, system-level, page-level, and global invalidation scopes should be explicit.

**Phase 107 — Concurrency / worker strategy**: allow parsing, layout, or export work to run off the UI thread where practical. The public API should support async operations without leaking worker implementation details.

**Phase 108 — Deterministic crash reports**: diagnostics should capture engine version, font version, config hash, source-file fingerprint, and stable object IDs so rendering bugs can be reproduced.

## GROUP R — Compatibility / Future Standards Readiness (Phase 109–114)

**Phase 109 — MNX mapping layer**: keep the internal model expressive enough to map to/from emerging MNX concepts without making MusicXML element order the internal data structure. MNX is actively evolving in 2026, so this should be a compatibility boundary rather than a hard dependency.

**Phase 110 — Instrument knowledge abstraction**: create a machine-readable instrument capability registry covering staff count/line count, clefs, transposition, ranges, notation conventions, percussion mappings, tablature systems, playback defaults, and common techniques. Do not hardcode instrument behavior in renderer branches.

**Phase 111 — Generic staff-definition support**: support staff line count/separation and staff configuration as dynamic score data, including changes over time. This is particularly important because current MNX work is considering use cases such as two-line staves, augmented staff-line systems, and changing staff-line counts.

**Phase 112 — External interchange adapters**: architecture for future import/export adapters such as MNX, MEI, ABC, Humdrum, MIDI variants, and custom APIs. Each adapter maps into the canonical model instead of creating a separate rendering path.

**Phase 113 — Capability negotiation**: exporters and importers should expose what features they fully support, partially support, preserve opaquely, or cannot represent. This prevents silent fidelity loss.

**Phase 114 — Standards tracking**: maintain a small compatibility matrix for MusicXML, SMuFL, MNX, MIDI, and MEI versions, with a policy for when the engine adopts newer specs.

---

# ADDENDUM — Architecture Rules (Non-negotiable)

1. **Canonical musical state is never SVG.** SVG is a rendering target only.
2. **Parser order is never canonical event order.** MusicXML is an interchange format; the engine owns a normalized timeline.
3. **No instrument-specific rendering branches.** Instruments are data/configuration/capability profiles.
4. **No floating-point authority for rhythmic position.** Use exact integer/rational tick math for canonical time.
5. **No silent data loss.** Unsupported or malformed input becomes a diagnostic and/or preserved extension data.
6. **Geometry is pure and testable.** Geometry must not depend on DOM state.
7. **Layout is deterministic.** Same inputs + same fonts + same config = same output.
8. **Editing uses commands.** UI code never mutates deep score structures directly.
9. **Every drawable object is traceable.** Rendered SVG/geometry must map back to a stable semantic ID.
10. **Config is layered.** Default → profile → document → object-level override, with explicit precedence.
11. **Caches are disposable.** They can be invalidated/rebuilt from canonical state at any time.
12. **Exporters are adapters.** Export is not allowed to change canonical score semantics.

# ADDENDUM — Recommended Internal Type Graph

```text
SourceDocument
    ↓
Importer / Validator
    ↓
Canonical Score Model
    ├── Metadata
    ├── Parts
    │    ├── Instruments / Capabilities
    │    └── Staves
    ├── Measures
    │    └── Voices / Events
    ├── Navigation / Repeats
    ├── Tempo Map
    └── Extension Data
         ↓
Semantic Services
    ├── Timing Resolver
    ├── Notation Rules
    ├── Collision / Constraints
    ├── Selection / Hit Testing
    └── Playback Timeline
         ↓
Geometry
    ↓
Layout
    ↓
Render Tree / SVG
    ├── Interactive DOM
    └── Export Backends

Cross-cutting:
Config · Theme · Diagnostics · Cache · History · IDs · Metrics · Fonts
```

# ADDENDUM — Priority Tiers

**P0 — Must exist before serious implementation continues**
- Stable IDs / provenance
- Canonical rational timeline
- Canonical vs derived state separation
- Diagnostics/error model
- Full SMuFL metadata usage
- Stable SVG semantic IDs / bounding boxes
- Deterministic geometry/layout
- MusicXML fidelity matrix
- Exact invalidation/cache model

**P1 — Required for a complete product**
- Selection + hit testing
- Command editing
- Undo/redo
- Full playback timeline
- MIDI import/export
- Tempo/repeat/jump resolution
- PDF/PNG verification
- Accessibility
- Performance budgets

**P2 — Platform-level capabilities**
- Native document package
- Collaboration-ready operations
- MNX adapter
- Instrument capability registry
- Additional interchange formats
- Facsimile/absolute-positioned mode
- Multiple rendering backends

# ADDENDUM — Research Notes / Why These Were Added

- MusicXML 4.0 is broader than pitches/durations: its score header and music-data model includes metadata, layout, directions, sound, harmony, grouping, print data, links/bookmarks, and more. Treating the parser as “notes + a few markings” leaves important interoperability gaps.
- MusicXML explicitly separates notation and sound information, which is why playback state should not be collapsed into visible notation objects.
- MusicXML 4.0 includes score-wide defaults and page/system/staff layout data; importing these as structured layout hints improves interoperability with files authored in other notation programs.
- Verovio's current production toolkit exposes extensive layout controls, bounding-box options, page/system break modes, dynamic spacing controls, SVG viewBox/data attributes, and semantic SVG structure. These are strong indicators that an industry-grade renderer benefits from explicit layout policy, semantic render IDs, and measurement infrastructure rather than a single draw pass.
- SMuFL defines not only glyph mappings but also engraving defaults and font metadata used by layout/rendering. The engine should therefore treat the font metadata package as a first-class dependency, not just a codepoint table.
- The W3C Music Notation Community Group is actively developing MNX in 2026. Current discussions include staff line counts, changing staff definitions, dynamics, measure repeats, and broader notation representation. The engine should remain expressive enough to map to future standards without making MusicXML itself the core data model.
