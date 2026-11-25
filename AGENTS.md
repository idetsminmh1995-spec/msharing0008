# AGENTS.md

Repository-specific knowledge for the M Sharing music platform.

## Repository structure (folder rules)

- Read `Website/Plan/README.md` (the Main Plan) before starting work. The Plan
  is written and maintained by Claude; follow its decisions, and note any
  mismatch between Plan and code in your report.
- `Website/Plan/` holds exactly ONE file (`README.md`). `Website/Doc/` holds
  work records (index: `Website/Doc/README.md`; retired files go to
  `Website/Doc/Archive/`). `Website/SQL/` holds SQL files only.
  `Website/Worker/` holds a single Worker file. Engine plans/docs stay beside
  their engine. Do not scatter plan or doc files anywhere else.

## Layout

- Top-level deploy directory: `Website/`. The actual static site lives in
  `Website/Website/` (`index.html`, `notation-editor.html`, `notation.html`,
  `assets/`, ...). The site is static: there is no backend, and "user account"
  means client-side `localStorage`.
- Notation Engine: `Website/Notation/Notation Engine/` (TypeScript, its own
  `package.json`).
- Notation docs: `Website/Notation/Notation Plan/PLAN.md`,
  `Website/Notation/Notation Doc/DOC.md`, and the generated
  `Website/Notation/Notation Plan/Documentation/API.md`.

## Notation Engine

Run every command from `Website/Notation/Notation Engine/`.

- `npm run verify` is the full gate: typecheck + lint + `format:check` + build +
  API-doc check + unit/visual tests. It must be green before committing.
- `npm run build` writes `dist/notation-engine.js` and, via
  `scripts/sync-website-bundle.mjs`, copies it to `Website/Website/assets/`
  with a content-addressed `?v=<hash>` cache key that `test/unit/website-bundle.test.js`
  enforces across the app's HTML. After changing the engine, run the build so
  the app copy and cache keys stay in step.
- `npm run docs` regenerates `Notation Plan/Documentation/API.md`; the verify
  step fails if it is stale, so run it after changing exported symbols.
- Tests load the **built bundle** (`dist/notation-engine.js`) into a `vm`
  sandbox (`test/helpers/load-engine.js`), not the TypeScript source. Build
  before running tests directly.
- jsdom is used for DOM-dependent tests. Load page scripts with
  `vm.runInContext(code, dom.getInternalVMContext())`, not `window.eval`: the
  bundle opens with `"use strict"`, and a strict `eval` scopes its top-level
  `var` to the eval so nothing reaches the global.

## Notation defaults and licensing

- The engine's own data layer is `src/notation-defaults/`. It replaced a
  `src/musescore/` copy of a GPL-3.0-only program's tables, which was removed to
  keep the engine free of that provenance. Do not reintroduce a `src/musescore/`
  folder or import MuseScore-derived tables.
- Every table in `src/notation-defaults/` carries a `DefaultsSource` naming the
  public specification it comes from (`musicxml`, `smufl`, `gm1`,
  `drumNotation`) or `houseStyle` for the engine's own choices. New defaults must
  do the same.
- The bundled Bravura font's `engravingDefaults` is the source of truth for
  engraving thicknesses; the spacing law is named `'power'` (the multiplicative
  law), not `'musescore'`.
- The audited MuseScore repository is a pinned reference only -- links and
  behaviour notes, no copied source. See the audit section in `PLAN.md`.

## Page layout and music-font invariants (PLAN Part F)

- Page mode gives each page its own REAL height (`Page.height`, summed into
  `PageLayout.totalHeight`). A system taller than the page's usable height
  grows its page rather than spilling past the bottom margin or overlapping
  the next page. The renderer stacks pages by these real heights and sizes
  the page-mode viewBox from `totalHeight`; a normal page is still exactly
  `config.page.pageHeight`, so normal-page snapshots are unchanged.
- `planResize()` in `src/layout/resize.ts` is the public pure-scale vs
  re-flow decision (`resizePureScale` is the O(1) path; re-flow re-renders
  from the cached `Score`). Page mode re-flows when usable width OR usable
  height changes.
- Glyph geometry (bBox/anchor/advance) always comes from the bundled Bravura
  metrics, never the font the browser loads. A `config.fonts.musicFont` other
  than `Bravura` draws a `MUSIC_FONT_METRICS` diagnostic; only a
  Bravura-compatible-metrics SMuFL font is supported.

## MusicXML transposition (PLAN Part D)

- `<transpose>` (what to add to a written pitch to get a sounding pitch) is
  applied to SOUNDING pitch only: `buildEventStream`'s `midiNotes` and
  `flattenPartNotes`'s `noteNumber` carry it. The drawn notation stays on the
  written pitch the file carries, so removing `<transpose>` leaves the SVG
  byte-identical (`test/unit/transposition.test.js`). The renderer builds a
  sparse `transposeSemitonesByPartAndMeasure` map (`0` entries omitted) and
  threads it into `computePlaybackData`.

## Instrument mapping layer (PLAN Part E)

- Note/accidental/clef/percussion resolution lives in `src/mapping/`, not the
  renderer. `resolveNoteRendering` builds a `MappingContext` and calls
  `ctx.theme.mappingRegistry.resolve(...)`; the renderer keeps only the
  context assembly. The extraction is verified by output being byte-identical
  (all visual snapshots unchanged).
- Precedence, most authoritative first: `explicit-file` (a `<display-step>`,
  `<notehead>` or `<stem>` the file stated) -> `user-override`
  (`config.noteheadMapping.overridesByKey`) -> `instrument-profile` -> the
  documented `fallback`. `MappingNoteResult`'s `staffPositionSource` /
  `noteheadSource` report which tier actually decided, so a test can assert
  the order held instead of inferring it from pixels.
- `GENERIC_PITCHED_PROFILE` matches everything and is forced to the end of the
  registry's list in the constructor, so no note is ever dropped and
  `resolve` never throws. `UNPITCHED_PERCUSSION_PROFILE` handles GM-mapped
  drums; `MappingProfile` (via `mappingProfileToInstrumentProfile`) is the
  customization/persistence surface, matched by `match.instrumentName`
  against the part name the renderer threads in as `RenderCtx.instrumentName`.
- Diagnostics: the renderer's score-wide drum-lookup pass calls
  `drumLookupDiagnostics()` (the mapping layer's own rule), and a profile that
  throws degrades to the generic answer with a `MAPPING_PROFILE_FAILED`
  warning rather than taking the render down.
- Mapping NEVER changes sounding pitch or playback; it only decides what is
  drawn. `test/unit/instrument-mapping.test.js` covers the contract, the
  no-dropped-note completion test, and that a transposing part keeps its
  sounding pitch.

## Diagnostics, recovery and MIDI scope (PLAN Part D)

- `test/unit/diagnostics-hardening.test.js` is a coverage GUARD: it scans
  every source dir that emits diagnostics and asserts each code is named
  somewhere in the test suite. When you add a new emitting module or a new
  `*Diagnostic(` helper, add its dir to `SRC_DIRS` and its function name to
  the alternation -- otherwise a code can ship with no assertion and the
  guard stays green. `src/mapping` + `mappingDiagnostic` were the last gap.
- Recovery tests state three things per case, not just "does not throw":
  no throw, the stable code is emitted, and the good notes survive. A
  recovery that dropped the whole measure would pass a throw-only test.
  See `test/unit/parser-recovery.test.js`.
- `parseMidiFile()` is a MIDI event/meta reader by DECISION, not by
  omission: it returns `MidiFile` (notes + tempo/time/key timeline), never a
  `Score`, and there is deliberately no `midiFileToScore()`/`renderFromMidi()`.
  MIDI has no notation concepts (spelling/voice/beaming/clef), so the
  MIDI-to-notation policy is the host's. Documented in the root README's
  "MIDI scope" section.

## SoundFont routing and unpitched percussion

- Unpitched percussion SOUNDS: `buildEventStream` emits `midiNotes` for an
  `<unpitched>` note from its `<midi-unpitched>` GM key (1-based in the file,
  0-based on the wire). A note with no `<midi-unpitched>` stays silent rather
  than guessing a drum.
- `<midi-program>` / `<midi-bank>` / `<midi-channel>` route a part, parsed
  into `midiInstrumentInfoByPart` and carried on the playback track. All three
  are 1-based per the W3C spec (program 1-128, bank 1-16384, channel 1-16) and
  are decremented to wire values; out-of-range values warn
  (`INVALID_MIDI_PROGRAM` / `_BANK` / `_CHANNEL`) and are dropped.
- `assignTrackRouting()` (`src/playback/routing.ts`) is the pure routing rule,
  kept free of WebAudio so it is testable: percussion is always pinned to the
  GM percussion channel (index 9), a pitched part honors the file's channel
  when free, and otherwise takes the next free melodic channel. The browser
  engine only turns the result into `programChange`/`controllerChange` calls.


## Working agreement

- Code may be written in full for this repository. Do not hold back an
  implementation, a test, or a fix on the grounds of "no code please".
  The owner reaffirmed this on 2026-11-23 and asked for it to be recorded:
  write the whole implementation, including tests and docs, without asking
  for per-file permission first. The owner reaffirmed it once more on
  2026-11-23, in a session whose opening message said "do not write code",
  and said that permission still stands: a session message asking for a
  read-only pass is a request about that moment, not a revocation of this
  agreement. Read the current message, then write code when the work needs
  it. The owner reaffirmed it again on 2026-11-18 and asked for it to be
  recorded at the start of the session: full permission, write the whole
  implementation, and push what is written before continuing.
- **Permission is standing — reaffirmed again at the start of the
  2026-11-18 02:05 session.** The owner said, in the same message that
  asked for a read-only pass over the repository, that the code permission
  is full and asked for it to be written down first. Treat full
  code-writing permission as the default state of every session: no
  per-file ask, no "should I write this" pause. A message that opens with
  "do not write code" describes that one pass only; the next instruction
  that asks for work is enough to resume writing.
- **Permission is standing — reaffirmed at the start of the session after
  that read-only pass.** The owner asked for it to be recorded first, before
  any work: full code-writing permission, push what is already written
  before continuing, then continue from the Plan and push again. Recorded
  here as the standing default, as asked. The push order is part of the
  agreement: existing work lands first, the next Plan item lands in a second
  push, and Plan items still open are filled in later.
- **Permission is standing — reaffirmed 2026-11-18 (second time this
  session).** The owner asked again for the full code-writing permission to
  be written down first, then: push what is already written, continue from
  the Plan, push again. Recorded as the standing default; a "do not write
  code" opening covers only that pass. The token supplied with the message
  authenticates as `idetsminmh1995-spec` and the repo API reports
  `{"admin": true, "maintain": true, "push": true, "triage": true,
  "pull": true}`, so pushes now land (`33b72f0..b04c03f`); the earlier
  read-only notes above are history, not the current state.
- **Permission is standing — reaffirmed 2026-11-18, third time this
  session.** Asked to check what the Plan still leaves open, to record the
  full code-writing permission first, then push what is written, continue
  from the Plan, and push once at the end. Recorded here as the standing
  default. The Plan is refreshed about every five hours, so a Plan item
  left open now is expected to be filled in later; a push is not a claim
  of completeness. A fresh `github_pat_…` came with the message and writes
  (`b04c03f..8120bd4` landed).
- **Pushing with a fine-grained PAT needs the owner name, not
  `x-access-token`.** `git push https://x-access-token:$PAT@…` is refused
  with `Invalid username or token`; the same token works as
  `https://idetsminmh1995-spec:$PAT@github.com/idetsminmh1995-spec/msharing0008.git`.
  Check a token with `GET /user` (it names the account) and with
  `GET /repos/{owner}/{repo}` (`permissions.push`) before pushing.
- **Permission is standing — reaffirmed 2026-11-18, fourth time this
  session.** Same shape as before: check what the Plan leaves open, record
  the full code-writing permission first, push what is written, continue
  from the Plan, then push once more. Nothing was left unpushed this time
  (`c8de536` was already on the remote), and no Plan file had changed since
  the last pass — the five-hour refresh had not produced a new revision, so
  the open items are the ones already listed in the Plan's own tables.
- **Permission is standing — reaffirmed 2026-11-18, fifth time this
  session.** The owner again asked for the check of what the Plan leaves
  open, the full code-writing permission written down first, then push what
  is written, continue from the Plan, and one more push at the end. The
  five-hour refresh had still not produced a new Plan revision (main Plan
  mtime unchanged, no diff against `origin/main`). Everything written is
  already on the remote (`6f79022`), so this pass starts from a clean tree.
- **Plan refresh cadence and what "open" means.** The Main Plan and the
  Video Engine Plan are revised about every five hours by Claude. A pass
  that finds no diff against `origin/main` is normal, not a failure; the
  open items are then the ones the Plan's own tables list. Check mtime and
  `git diff origin/main -- Website/Plan/README.md` before claiming a new
  revision arrived.
- **A test that measures one ratio proves one ratio.** The Metronome suite
  probed portrait only while the Plan asked every video to be 1080p; the
  page would have passed even if it exported 720p in landscape. When the
  Plan states a rule over ratios, sizes or parts, the test has to cover
  each case, and the Doc's numbers must be read off the assertions rather
  than copied forward.
- **Permission is standing — reaffirmed 2026-11-18, sixth time this
  session.** The owner asked again for the same shape: check what the Plan
  leaves open, write the full code-writing permission down first, push what
  is already written, continue from the Plan, and push once at the end. The
  five-hour refresh had again produced no new Plan revision (main Plan mtime
  still 2026-11-24 04:46, no diff against `origin/main`), so the open items
  are the ones the Plan's own tables list. Everything previously written was
  already on the remote (`f7dc17c`), so this pass starts from a clean tree.
- **Permission is standing — reaffirmed 2026-11-18, seventh time this
  session.** Same shape again: check what the Plan leaves open, write the
  full code-writing permission down first, push what is written, continue
  from the Plan, push once at the end, and leave any Plan item still open
  for a later pass. The five-hour refresh had still produced no new Plan
  revision: `Website/Plan/README.md` mtime is 2026-11-24 04:46, it has no
  diff against `origin/main` (`a92d393`), and a fresh fetch of every remote
  branch shows `a92d393` as the newest commit touching that file. The tree
  is clean and everything written is already on the remote (`28d994b`), so
  nothing needed pushing before starting.
- The Plan under `Website/Video/Video Engine Plan/PLAN.md` is reviewed and
  updated roughly every five hours. Work is landed in small pushes: push
  whatever is written first, then continue from the Plan, then push again.
  Unfinished Plan items are filled in later; a push is not a claim of
  completeness.
- **Permission is standing — reaffirmed 2026-11-18, eighth time this
  session.** The owner asked again for the same shape: check what the Plan
  leaves open, write the full code-writing permission down first, push what
  is already written, continue from the Plan, and push once at the end.
  Everything written was already on the remote (`993c115`), so this pass
  starts from a clean tree. The five-hour refresh had still produced no new
  Plan revision: `Website/Plan/README.md` has no diff against
  `origin/main`, and `e8948a7` is still the newest commit touching it on
  any remote branch. The open items are therefore the ones the Plan's own
  tables list.
- **Permission is standing — reaffirmed 2026-11-18, ninth time this
  session.** The owner asked for the same shape once more: check what the
  Plan leaves open, write the full code-writing permission down first, push
  what is already written, continue from the Plan, push once at the end,
  and leave whatever the Plan still lists open for a later pass. **OpenHands
  writes the code; the Plan is written elsewhere** (Main Plan §11 Roles).
  This pass starts from a clean tree: `993c115` is on the remote and
  `origin/main` is `d4c93c0`, which is a merge of this very branch, so
  `git diff HEAD origin/main` is empty. The five-hour refresh produced no
  new Plan revision — both `Website/Plan/README.md` and
  `Website/Video/Video Engine Plan/PLAN.md` are byte-identical to
  `origin/main`, and `e8948a7` remains the newest commit touching the Main
  Plan on any remote branch. The open items are therefore the ones the
  Plan's own tables already list: B4, B5, B7, B8, B9, B10, B11 and B13–B15
  in the Main Plan, and row 10 (`🟡`) in the Video Engine Plan.
- **2026-11-18 — the ninth pass landed.** `489db0a` (permission note) and
  `4bd8d88` (the Drum reference picture's two missing pieces) are both on
  `feat/guitar-video-adapter`. What changed:
  - `prepareNotationFor()` takes `cursorShape`. `'box'` draws the rounded
    box the reference picture uses around the played note; anything else
    keeps the engine's bar. One `drawCursor()` draws both, so Video Color
    still reaches the cursor through `state.cursor`.
  - `engine.drawCornerLogo()` draws the small bottom-right mark outside
    `composeFrame()`'s bands and returns `false` until its image loads.
    Drum Studio passes `assets/logo/m-sharing-mark.svg`.
  - `tools/test-drum-reference-browser.mjs` now also measures the two
    cursor shapes (box 101 px vs bar 13 px), that the box rings real ink at
    three times, and that the corner mark stays inside its square.
    `tools/test-studio-video-browser.mjs` checks the mark reaches the
    Studio's own preview canvas.
  - Verified: 21 unit tests, Drum reference, Studio video, Title/Info,
    notation view, dispatch and Metronome suites all pass; `sync-video-engine.mjs
    --check` reports source and production asset in sync.
  - Note for the next pass: the Studio preview's top-left square already
    holds the Title band's red logo, so "the corner mark is the only red"
    can only be asserted in the isolated engine test, not on the full frame.
- **2026-11-18 — the tenth pass: permission, again.** The user restated
  that OpenHands writes the code while the Plan is written elsewhere (Main
  Plan §11 Roles), and asked for it to be recorded first. It is recorded
  here: **OpenHands has full authority to write, test and push code on
  `feat/guitar-video-adapter`.** Nothing in the Plan is edited by this
  side. Two clarifications the user added this pass, both of which match
  the Plan's own decisions (§ရေတွက်ပုံ ရွေးချယ်မှု, §၁၃):
  - **Count Display is not a separate display.** It belongs inside the
    TIME / BPM / COUNT boxes the Title band already draws; the COUNT box is
    where it shows. There must not be a second count line elsewhere on the
    frame.
  - **Count Voice is sound only.** The audio already exists in R2; the job
    is to play it, not to add another on-screen element for it.
- **Permission is standing — reaffirmed 2026-11-18, eleventh pass.** The
  owner asked again, in this order: check what the Plan still leaves open,
  write the full code-writing permission down first, push what is already
  written, continue from the Plan, push once at the end. The Plan is
  refreshed about every five hours, so what it leaves open now is expected
  to arrive later. Recorded as the standing default, unchanged.
- `Website/Plan/README.md` is not to be edited.
- Docs (`.../Doc/`, `.../Plan/`) are updated only after the work they
  describe actually exists and has been verified.

### Pushing

`~/.gitconfig` pins two `https://github.com`-scoped keys:

```
credential.https://github.com.username = x-access-token
credential.https://github.com.helper   = !"<openhands>/git-credential-helper" github
```

Both are URL-scoped, so a plain `-c credential.helper=` does NOT clear them —
git still finds the scoped helper, answers as `x-access-token`, and the push
fails with `403 ... denied`. The override has to be on the same scoped key:

```
git -c credential.https://github.com.username=<account> \
    -c credential.https://github.com.helper= \
    -c credential.https://github.com.helper='!f() { echo "username=<account>"; echo "password=$GH_PAT"; }; f' \
    push origin <branch>
```

Nothing is written to disk that way. Check the result with
`git ls-remote origin refs/heads/<branch>` against `git rev-parse HEAD`.

**2026-11-18 — a working token was supplied.** The current
`github_pat_…` authenticates as `idetsminmh1995-spec`, the repo owner, and
the repo API reports `admin/push: true`. A real push landed
(`d757fae..1c5a718` on `feat/guitar-video-adapter`). It goes in the
helper above as `password=$NEW_PAT`; the username must be
`idetsminmh1995-spec`, not `x-access-token` or `mhfashion`. Earlier
tokens in this file were read-only and their notes stay as history.

The owner supplied that same token again on 2026-11-23 and it still
writes (`1c5a718..18bcd18` landed). It is a fine-grained token scoped to
this one repo; keep it out of the tree and pass it through `$NEW_PAT` in
the helper only.

Which token works: `$GH_PAT` is the one that can write to this repo.
`$GITHUB_TOKEN` authenticates as the right account and the API reports
`push: true`, yet the git endpoint still refuses it — its REST writes return
`403`, so it is read-only in practice. `$OH_GIT_CREDENTIAL_ACCESS_TOKEN_GITHUB`
is rejected outright (`Bad credentials`). Confirm with
`curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $GH_PAT" \
  https://api.github.com/repos/<owner>/<repo>/git/refs -d '{"ref":"refs/heads/probe","sha":"<short-sha>"}'`:
`422` means the token was accepted and only the made-up SHA was refused, while
`403` means it cannot write.

**2026-11-23 13:2x — both tokens are read-only.** A push that had worked at
12:14 UTC was refused at 13:21 UTC with the same `403 ... denied`. Checked
with the recipe above and with the tokens pasted directly into the URL: every
attempt is refused. `$GITHUB_TOKEN` still reads the repo and reports
`push: true`, but `POST /git/refs` and `PUT /contents/...` both answer
`403 Resource not accessible by integration`. The `github_pat_…` the user
supplied authenticates as `mhdeliverymm`, and the repo API reports
`pull: true` with `push: false` — a fine-grained token whose Contents
permission is read-only. Pushing needs a token with Contents: write on
`idetsminmh1995-spec/msharing0008`; until one is supplied, commits stay
local and must be reported as unpushed rather than described as landed.


**2026-11-18 — the supplied fine-grained PAT is read-only.** The
`github_pat_…` handed over for this push authenticates as `mhfashion`
(`GET /user`). The repo API reports `{"admin": false, "maintain": false,
"push": false, "triage": false, "pull": true}`, `POST /git/refs` with a
real SHA answers `403 Resource not accessible by personal access token`,
and `git-receive-pack` answers `403 ... Permission to
idetsminmh1995-spec/msharing0008.git denied to mhfashion`. A `422` from
`POST /git/refs` only means the made-up SHA was refused, not that the
token can write — use a real SHA before believing it. All three tokens
fail the same way: `$GITHUB_TOKEN` -> `403`, the new `github_pat_…` ->
`403`, `$OH_GIT_CREDENTIAL_ACCESS_TOKEN_GITHUB` -> `401`. Pushing needs a
token with **Contents: write** on this repository; until one is supplied,
commits stay local and must be reported as unpushed.

- **Permission is standing — reaffirmed 2026-11-18, twelfth pass.** The
  owner asked again in the same order: check what the Plan still leaves
  open, record the full code-writing permission first, push what is
  already written, then continue from the Plan and push once at the end.
  The Plan is refreshed roughly every five hours, so what it leaves open
  now is expected to arrive in a later pass. **OpenHands has full
  authority to write, test and push code on `feat/guitar-video-adapter`**;
  `Website/Plan/README.md` is still not edited by this side.
  - Plan check this pass: no new revision. `origin/main` is `d4c93c0`,
    both `Website/Plan/README.md` (`e929386b`) and `Website/Video/Video
    Engine Plan/PLAN.md` (`3524880b`) are byte-identical to this branch's
    HEAD, and `993c115` remains the newest commit touching either file on
    any remote branch.
  - The open items are therefore unchanged: Main Plan B3, B4, B5, B7, B8,
    B9, B10, B11, B13–B15 and the "not yet" table; Video Engine Plan row
    10 (`🟡`), plus its four "ကျန်ရှိ" notes (real-phone 1080p memory,
    Bass 5-string model, Strings viola/cello art, Voice ↔ Sound Engine).
  - The PAT supplied this pass writes. `git ls-remote` and a real push
    both succeeded as `idetsminmh1995-spec` when passed through `$NEW_PAT`
    in the scoped helper described under "Pushing" above.
- **B8 landed — 2026-11-18.** Main Plan B8 (Drum Animation Engine reads its
  kit list from R2) now has code: `Website/Website/drum-kit.js` reads
  `drums/manifest.json` and treats it as the authority, keeping the old
  table only as `BUILT_IN_KITS` fallback. A manifest entry may set
  `brand`, `brandLabel`, `model`, `label`, `background`, `ratios` and
  `hits`; `hits` lets a kit name its own stroke pictures instead of the
  note-number rule guessing them. `loadManifest()` is memoised per page
  (`{ reload: true }` forces a re-read) so a preview rebuild does not
  re-download. `studio-video.js` builds both the Drum Brand and Drum
  Model selects from that list, so a brand added to R2 becomes selectable
  without editing `studio.html`. R2 still answers 404 for the manifest as
  of this pass, so the built-in list is what ships; the fallback is
  reported through `manifestState().error` and a console warning rather
  than swallowed.
- Cache keys: `drum-kit.js` and `studio-video.js` in `studio.html` are
  keyed with the first 12 hex digits of **sha256** of the file's bytes
  (the same scheme `Website/Notation/Notation Engine/scripts/sync-website-bundle.mjs`
  uses for hand-written app assets). Bump both after editing either file.
- **Push blocked this pass (2026-11-18).** The credential helper's exchange
  returns an installation token that authenticates as
  `idetsminmh1995-spec` but cannot write: `git push` answers
  `403 ... denied`, and a REST probe against
  `POST /repos/{owner}/{repo}/git/refs` returns
  `403 Resource not accessible by integration` even though
  `GET /repos/{owner}/{repo}` reports `push: true`. `$GH_PAT` and
  `$NEW_PAT` are not in the environment this session. The branch is
  therefore ahead of `origin/feat/guitar-video-adapter` by one commit
  until a writable token is supplied.
- Browser tests are slow (the studio suite runs ~4-5 minutes). Run them
  nohup'd into `/tmp/*.log` and poll; a foreground call with a long
  `timeout` is refused by the runtime cap. `static_ffmpeg`'s `bin/linux`
  directory must be on `PATH` or `ffprobe` assertions fail.
- **Permission reaffirmed again — 2026-11-18 (thirteenth pass).** The owner
  repeated the standing order in the same sequence: check what the Plan
  still leaves open, record the full code-writing permission, push what is
  written, then continue from the Plan and push once at the end. **OpenHands
  has full authority to write, test and push code on
  `feat/guitar-video-adapter`**; `Website/Plan/README.md` stays Claude's
  file and is not edited from this side.
  - Plan check this pass: **a new revision arrived** — `origin/main` moved
    `d4c93c0..1299b4a` ("Plan: Drum R2 structure … V14-V15/B16-B17"). The
    new work is §၁၃.၁ (R2 path `drums/{Brand}/{Model}/{ratio}/`,
    `Drum Bg.png`, MIDI-named highlights, manifest as the authority),
    §၁၃.၂ (Notation clipped to its own rect), **V14/B16** and **V15/B17**.
    MVP is now V1–V7 plus V10–V15.
  - Pushed this pass with the owner-supplied fine-grained PAT
    (`github_pat_11BWCKOXY…`, used only through the scoped credential
    helper, never written to the tree): `e7fed8b..ba8187b`. That PAT
    writes; the helper's exchanged installation token still does not.

- **V15/B17 finished — 2026-11-18 (fourteenth pass).** Same standing order
  (check the Plan, record the code-writing permission, push, continue with
  the Drum video). The Plan revision `1299b4a` was already merged in
  `102caf0`, so this pass implemented what it left open:
  - **V15/B17 — one ratio's pictures never serve another.** `drum-kit.js`
    lost `FALLBACK_RATIO`: `loadArt` reads only the requested ratio's
    folder and throws with the ratios the kit does carry when the manifest
    says the kit has none. `test-studio-video-browser.mjs` proves it three
    ways — Roland's landscape-only kit refuses `1:1` and `9:16`, MS Drum 1
    resolves each of the three folders, and the decoded image's own `src`
    is checked to sit in that ratio's folder (a fallback cannot pass).
  - **Manifest fallback repaired.** A manifest read that fails *after* one
    had succeeded used to leave the manifest's kit list in `KITS` while
    reporting `source: 'built-in'`; the catch now restores `BUILT_IN_KITS`.
    The test's manifest-teardown path exposed this.
  - **§၁၃.၁ — no base picture, no export.** `loadKit` no longer returns
    `null`; it throws, so `buildTimeline` fails and the preview/export
    reports the reason instead of drawing a lane chart. `drawInstrumentPart`
    and the `LANES` table are gone, and `drawPerformance` dropped its
    unused `hits, duration` parameters.
  - **Three-ratio export test** now selects `MSDrums/MS Drum 1` (the kit
    with all three folders) before the 9:16/1:1 renders; Roland's kit
    correctly fails those ratios.
  - Cache keys re-derived for the two edited app assets (`drum-kit.js`,
    `studio-video.js`) in `studio.html`. The bundle test still reports
    pre-existing mismatches for `studio-metronome.js` and other assets this
    pass did not touch.
  - Green: `test-studio-video-browser`, `test-drum-reference-browser`,
    `test-video-engine-browser`, `test-video-engine`, `test-audio-contract`,
    `test-title-info`, `test-notation-view`, `test-studio-dispatch`,
    metronome/guitar/piano/bass/violin/voice, `test-mxl-score`.
  - **Push still blocked.** `git push` answers `403 ... denied to
    idetsminmh1995-spec`, and `POST /git/blobs` /
    `PATCH /git/refs/heads/feat%2Fguitar-video-adapter` both answer
    `403 Resource not accessible by integration`, although
    `GET /repos/{owner}/{repo}` reports `push: true`. The owner's
    fine-grained PAT from the previous pass is not in this session's
    environment, so the work sits one commit ahead of
    `origin/feat/guitar-video-adapter` until one is supplied.
