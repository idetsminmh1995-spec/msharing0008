# `<forward>` gaps, and the playback cursor on the drum page

**Found by:** the user, comparing our render of `Drum_Lesson_5.musicxml`
against MuseScore's render of the same file, and reporting that the
preview showed no cursor during playback.

**Status:** all fixed. `npm run verify` clean, 826/826 tests. Sections
4-6 are the follow-up round, from the user's second screenshot.

## 1. The notation bug: a voice that skips time

### What was wrong

MuseScore drew the kick drum's beamed eighth-note pair on **beat 3**. We
drew it on **beat 2**. Same file, same measure.

### Why

The file writes the kick like this — which is how MuseScore writes any
drum voice that does not play continuously:

```xml
<backup><duration>8</duration></backup>       <!-- back to the measure start -->
<note>…F4 quarter…</note>                     <!-- beat 1 -->
<forward><duration>2</duration></forward>     <!-- skip beat 2, no rest written -->
<note>…F4 eighth, beam begin…</note>          <!-- beat 3   -->
<note>…F4 eighth, beam end…</note>            <!-- beat 3.5 -->
<forward><duration>2</duration></forward>     <!-- skip beat 4 -->
```

The parser read `<forward>` correctly — §10.1's tick cursor advanced, and
each record carried the right tick. Then it **threw that tick away**: a
`Voice` was built as a plain ordered list of events, and every consumer
downstream re-derived each event's tick by **summing the durations before
it**:

```ts
let tick = 0;
for (const ev of events) { starts.push(tick); tick += ev.duration.ticks; }
```

That is only correct for a voice with no gaps. With a gap, every event
after it is pulled early — here by exactly the two skipped beats.

Four places did this independently: `eventStartTicks` and `totalTicks` in
the renderer, `buildEventStream` in `playback/`, and `flattenPartNotes` in
`timing/alignment/`. So the same wrong tick reached the **layout**, the
**playback event stream** and the **MIDI↔XML alignment**.

**31 of the drum file's 342 events were in the wrong place.**

### The fix

`Note`, `Rest` and `Chord` gained an optional `startTick`, set by the
parser from the cursor it already had:

```ts
events.push({ ...buildEvent(group, location, diagnostics), startTick: head.tick });
```

and all four consumers now prefer it, falling back to the running sum
only when it is absent — which is exactly right for a hand-built `Score`,
where a voice has no gaps by construction. `totalTicks` also became
"where the last event *ends*" rather than "the sum of the durations",
which are different numbers as soon as there is a gap.

This also fixes a case that had never been reported: a voice that simply
**starts late** (enters on beat 3 with no leading rest) was pulled to the
start of its measure for the same reason.

### Why no test caught it

The engine already had a `forward.musicxml` fixture. It was parsed by a
test that checked the resulting note count — and **nothing asserted where
the notes landed**. The new `test/unit/event-start-tick.test.js` asserts
ticks and drawn x positions, on that fixture and on a reduced copy of the
drum file's own measure (`drum-forward-gap.musicxml`).

## 2. A malformed `<backup>`, surfaced by the same fix

Honouring the real ticks made a second problem visible.
`tie-dot-staff.musicxml` plays 10 divisions and then writes
`<backup><duration>16</duration></backup>` — six divisions **before the
measure started**. MusicXML forbids that; writing the measure's *length*
where the *elapsed* amount belongs is a common real-world mistake.

The parser let the cursor go negative. Nothing noticed before, because
everything downstream ignored the tick anyway and started from 0.

Now `<backup>` is clamped to the measure start and reports
`BACKUP_BEFORE_MEASURE_START` — §10.7's rule being to say so rather than
silently absorb it.

## 3. The playback cursor

The preview showed no cursor because the page **discarded the playback
data**: `renderFromMusicXml` returns `{ svg, diagnostics, playback }` and
only `svg` was used.

Everything needed already existed in the engine (Phases 48–49). §17.3
draws the boundary: the engine reports *where a moment in the music is*;
drawing a marker and scrolling to it is the host's job. So the fix is
entirely in `website/video-create/drum/index.html`:

- keep `rendered.playback` from each render;
- append one `<line class="playback-cursor">` into the rendered SVG;
- on every animation frame while playing (not just `timeupdate`, which
  fires about four times a second and would visibly stutter), convert
  `audio.currentTime` → tick with `secondsToTick(playback.tempoMap, …)`,
  then tick → x with `positionToX`;
- scroll the strip when the marker approaches either edge.

Verified in headless Chromium against the real page: at 6.0 s the marker
lands at x=72.86, which is measure 4's first note (measure 4 starts at
x=66.86, and its notes begin after a 6.0-unit header). 0 s, 2 s and 4 s
land on measures 1, 2 and 3 the same way.

### Two honest limits, stated rather than hidden

- **The audio must be at the score's notated tempo.** The mapping goes
  through the score's own tempo map, so a recording at a different tempo
  drifts. The uploaded `Drum Lesson 5.mp3` is 2:26 where 32 measures at
  ♩=120 is 1:04, so this file does not match and the marker reaches the
  end of the written music well before the audio ends. A calibration
  control (offset + tempo scale) is the fix, and is host-side work.
- **Repeats are not followed.** §17.2 is deliberate about this: the
  engine never simulates playback order, because a repeat, a D.S. and a
  manual seek are all just "some tick" to it. A host that wants the
  marker to jump back at a repeat must supply the tick it jumped to.

Past the last event the marker now stops at the final note rather than
running off into whitespace, so neither limit looks like a crash.

## 4. Follow-up: the gap after every barline

The user's next screenshot circled the **empty space between a barline
and the first note of the measure after it** — present on every measure,
and not there in MuseScore's output.

`MEASURE_HEADER_ALLOWANCE = 6.0` was reserved at the start of **every**
measure, for a clef/key/time-signature header that most measures never
draw. It was honest about being an approximation ("at the cost of some
wasted blank space on ordinary measures — stated directly as a
limitation"), but the waste was 5.5 staff spaces per measure, which on a
32-measure drum chart is a fifth of the whole width.

The final review had already computed each measure's **real** header
width (for the cursor bug above), and then kept 6.0 as a *floor* to avoid
snapshot churn. Keeping that floor was the wrong call: it preserved
exactly the defect the user was pointing at. The floor is now
`MEASURE_LEADING_PAD = 0.5` — the small pad that stops a clef or notehead
sitting flush against the barline — and the real width is used
everywhere.

The drum file's total width went from 817 to 664 staff spaces, with
nothing overlapping.

Two consequences had to be handled:

- **The measure's own width** is computed before layout, but the real
  header depends on `isSystemStart`, which layout decides. So the width
  pass *predicts* it (the score's first measure, plus any `<print
  new-system>`/`new-page`) — exact in scroll mode, and in page mode a
  measure that unexpectedly starts a system just ends up slightly tight.
  Nothing drifts: the post-layout pass records the exact width, and both
  the notes and `positionToX` read that.
- **A repeat-begin barline needs room.** It is drawn *at* the boundary
  and extends right, into the measure it opens — nearly two staff spaces
  for a heavy-light plus its dots. The old blanket 6.0 hid that; with it
  gone, the first note landed on the dots. `headerWidths` now adds the
  opening barline's own geometry width, which is what caught this in the
  existing Integration Q test rather than in a screenshot.

## 5. Follow-up: a cursor that stops in an empty bar

The same screenshot asked why the marker did not move through measure 1,
which is a whole rest: *"even if there is no note, in 4/4 it should still
travel four beats."* Correct, and it did not.

`positionToX` is a **step function** by design — §17.1 defines it as "the
x of the note currently sounding at `tick`". That is what note
highlighting wants, and it is what `xToPosition` inverts. But a marker
driven by it freezes on each note and jumps to the next, and across a
measure containing no notes at all it does not move for the entire
measure.

So there is now a second function, `playheadX`, for the moving marker:

- between two notes it interpolates proportionally to the tick;
- after a measure's last note it continues toward that measure's own
  right edge;
- a measure with no events at all is crossed from its note area to its
  barline;
- **at a note's exact tick it returns exactly what `positionToX` does**,
  so the two can never disagree about where a note *is* — only about
  what happens in between.

`computeCursorPlacement` now drives `markerX` from `playheadX` while
`noteX` keeps reporting the note itself, which is what it has always
meant. Measured on the drum file, the marker across the opening rest bar
now reads 6.00 → 8.31 → 10.63 → 12.94 → 17.62 where it used to read 6.00
five times.

## 6. A test-infrastructure fix this turned up

`npm run docs:check` was implemented as "regenerate, then `git diff
--quiet`". That conflates **stale** (the code moved and nobody
regenerated) with **not committed yet** (the normal state in the middle
of a change), so `npm run verify` failed on every legitimate docs update
until it was committed. It now compares the generated text against the
file's contents directly and never asks git anything.

## 7. How to revert

Drop `startTick` from `core/note.ts`/`rest.ts`/`chord.ts` and the spread
in `parse.ts`; restore the four running-sum loops; delete
`test/unit/event-start-tick.test.js` and
`test/fixtures/musicxml/drum-forward-gap.musicxml`. Remove the
`BACKUP_BEFORE_MEASURE_START` clamp to let ticks go negative again. For
the cursor, delete the `attachCursor`/`updateCursor`/`startCursorLoop`
block and the transport listeners that call them.

**Do not revert any of it without a reason** — each one is a case where
the engine disagreed with what the file actually said.
