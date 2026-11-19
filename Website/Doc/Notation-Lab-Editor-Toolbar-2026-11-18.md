# Notation Lab Editor — Fixed Toolbar and Score Workspace

**Date:** 2026-11-18
**Route:** `Website/Website/notation-editor.html`

## Goal

Notation Lab ၏ box များကို နှိပ်လိုက်သည့်အခါ Editor သို့ ရောက်ရမည်။ Editor တွင် Header Bar အပေါ်၌ ရှိပြီး၊ ၎င်း၏ အောက်တွင် ရွေ့မသွားသော (sticky) toolbar တစ်ခု ရှိရမည်။ Toolbar ထဲတွင် notation ကို ပြင်လို့ရသောဟာများ၊ ရေးလို့ရသောဟာများ ပါရမည်။ ပုံစံသည် MuseScore နှင့် တူညီသော ခံစားချက် ရှိရမည်၊ သို့သော် အတိအကျ တူရန် မလိုပါ — အသုံးပြုရ ပိုလွယ်ကူရမည်။

## Structure

Header Bar အောက်တွင် တိုက်ရိုက် ကပ်နေသော secondary toolbar တစ်ခု၊ ထို့နောက် score workspace။

```
┌──────────────────────────────────────────────────────┐
│ Site Header Bar — fixed, page တိုင်းတူ               │
├──────────────────────────────────────────────────────┤
│ Editor Toolbar — sticky, scroll လုပ်လည်း မရွေ့        │
├──────────────────────────────────────────────────────┤
│                                                      │
│              Score workspace (Bravura render)        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Toolbar groups

The main toolbar follows MuseScore's order and its visual language: one flat
row of square icon buttons separated by hairlines, and a filled accent for the
tools that are currently ON. MuseScore keeps transport in the main toolbar
rather than in a status bar, so Play, metronome and the tempo readout live
here too; the bottom bar keeps only the things that are about the file and the
page (SoundFont, view, Save, Export).

The header bar is MuseScore's **main toolbar**, in MuseScore's own order:
file operations, then history, then zoom and view, then transport.

| Group | Tools |
|---|---|
| Navigation | Back to Notation Lab |
| History | Undo, Redo |
| File | New, Open, Save, Print |
| Zoom | Zoom −, zoom readout, Zoom + |
| Score view | Page / Horizontal |
| Playback | Rewind, Play/Pause, Metronome, tempo readout |

Bottom bar: note input (N), Add / Remove measure, note duration and dot and
rest, accidentals, Part, Voice, score setup (Clef, Key, Time), Sidebar,
SoundFont picker, Hear, Test, Score, Export (PDF/SVG/PNG). The editing tools
that act on the note you are about to write live here, next to the SoundFont
controls, so the header bar stays the short row of file and transport commands
MuseScore shows.

The bottom bar's last panel button is the **Sidebar** toggle, which opens the
dock described in [Sidebar Dock, Properties and Instruments](Notation-Lab-Editor-Sidebar-Dock-2026-11-18.md).

Keyboard shortcuts: `Ctrl+S` save, `Ctrl+Z`/`Ctrl+Y` undo/redo, `Ctrl+±` zoom,
`Space` play/pause, `M` metronome, `N` note input, `.` dot, `0`/`R` rest,
`1`–`6` note values. **New** hands off to the Notation Lab wizard
(`notation.html?intent=create`), so a new score is set up there rather than in
a toolbar dropdown; **Print** calls the browser's own print dialog.

## Behaviour

- **Fixed toolbar.** `position:sticky; top:var(--header-height)` ဖြစ်သောကြောင့် scroll လုပ်လည်း Header Bar အောက်တွင် ဆက်ရှိသည်။
- **Responsive wrapping.** Wide screens တွင် tool groups အားလုံး ပြသည်။ `≤1500px` တွင် ခလုတ် label များ ဖျောက်ပြီး icon-only ဖြစ်သည်။ `≤1280px` တွင် တစ်တန်းတည်း ထားပြီး ဘေးတိုက် scroll လုပ်နိုင်သည် (score အတွက် နေရာ မယူဘဲ)။
- **Entry handoff.** `?intent=create` → empty starter score; `?intent=open` → Notation Lab entry box မှ sessionStorage ဖြင့် ပို့လာသော ဖိုင်ကို render လုပ်သည်။
- **Starter score.** Create လုပ်သည့်အခါ treble clef, 4/4, 4 measures rest ပါသော MusicXML ကို ထုတ်ပြီး render လုပ်သည်။ Clef/Key/Time ကို bottom bar မှ ပြောင်းလျှင် starter score ကို ပြန် render လုပ်သည်။
- **Playback.** `soundfonts/manifest.json` သည် လက်ရှိ deploy တွင် မရှိသေးသောကြောင့် Play ကို နှိပ်လျှင် error message ဖြင့် ညင်သာစွာ ရပ်တန့်သည်။ R2 manifest ထည့်ပြီးပါက အလိုအလျောက် အလုပ်လုပ်မည်။
- **Bravura font.** `styles.css` တွင် `@font-face` ပြန်ထည့်ထားသည် (`assets/fonts/Bravura.woff2`). Glyph များအားလုံး `<text font-family="Bravura">` ဖြင့် render ဖြစ်သည်။

## Files

- `Website/Website/notation-editor.html` — Header Bar + sticky toolbar + workspace (Header Bar သည် အခြား page များနှင့် တူညီသည်)
- `Website/Website/notation-editor.js` — render, zoom, layout, playback, export, toolbar state, entry handoff
- `Website/Website/styles.css` — `@font-face` နှင့် `.editor-*` styles

## Verification (headless Chromium, 2026-11-24)

- Toolbar is a single flat row; active tools (note value, accidental, dot,
  rest, note input, metronome, Play) render with the filled accent.
- Transport moved out of the bottom bar: `data-editor-play`,
  `data-editor-metronome` and `data-editor-tempo` now resolve inside
  `[data-editor-toolbar]`, and the bottom bar no longer duplicates them.
- Thirty-second note (`6`) selects and announces; `M` toggles the metronome.
- A one-instrument score hides the Part group and its divider; a two-part
  score shows the selector listing both instruments.
- `npm run verify` green: 1320 tests pass, lint and format clean.

## Verification (headless Chromium, 2026-11-18)

- Header element matrix page ၄ ခုလုံး (index, notation, notation-editor, studio) တူညီသည် (normalized header block byte-identical)။
- Toolbar သည် width အားလုံးတွင် single visual row ဖြစ်ပြီး `≤1280px` တွင် ဘေးတိုက် scroll လုပ်သည်။
- Create flow: `notation.html` → Create box → editor တွင် treble clef + 4 measures ကို render လုပ်ပြီး `Score ready.` ပြသည်။
- Open flow: entry box မှ `beamed-eighths.musicxml` ကို editor တွင် render လုပ်သည်။
- Export: `exportSvg`, `exportPng`, `exportPdf` အားလုံး bytes ထုတ်ပေးသည်။
- Zoom bounds 50%–200% တွင် ရပ်သည်။
- Mobile menu နှင့် phone bottom nav အလုပ်လုပ်သည်။

## Not in this milestone

This document records the toolbar milestone only. Note entry, the selection
model, undo/redo history and the playback cursor shipped afterwards (see
Part K in `Notation/Notation Plan/PLAN.md`), and the sidebar dock followed
(see [Sidebar Dock, Properties and Instruments](Notation-Lab-Editor-Sidebar-Dock-2026-11-18.md)).
Still open: MXL save, and the Page / Horizontal view switch this table lists
but the toolbar does not carry yet.
