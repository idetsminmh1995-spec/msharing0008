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

| Group | Tools |
|---|---|
| Navigation | Back to Notation Lab |
| History | Undo, Redo |
| Note input | Note input (N), Add measure, Remove last measure |
| Note duration | Whole, Half, Quarter, Eighth, Sixteenth, Thirty-second, Dot, Rest |
| Accidentals | Sharp, Flat, Natural |
| Part | Which instrument you are writing into (hidden for a single-part score) |
| Score setup | Clef, Key signature, Time signature |
| Playback | Play/Pause, Metronome, tempo readout |
| View | Zoom −, zoom readout, Zoom + |

Bottom bar: SoundFont picker, Hear, Test, Score, Page/Horizontal view, Save,
Export (PDF/SVG/PNG).

Keyboard shortcuts: `Ctrl+S` save, `Ctrl+Z`/`Ctrl+Y` undo/redo, `Ctrl+±` zoom,
`Space` play/pause, `M` metronome, `N` note input, `.` dot, `0`/`R` rest,
`1`–`6` note values.

## Behaviour

- **Fixed toolbar.** `position:sticky; top:var(--header-height)` ဖြစ်သောကြောင့် scroll လုပ်လည်း Header Bar အောက်တွင် ဆက်ရှိသည်။
- **Responsive wrapping.** Wide screens တွင် tool groups အားလုံး ပြသည်။ `≤1500px` တွင် ခလုတ် label များ ဖျောက်ပြီး icon-only ဖြစ်သည်။ `≤1280px` တွင် တစ်တန်းတည်း ထားပြီး ဘေးတိုက် scroll လုပ်နိုင်သည် (score အတွက် နေရာ မယူဘဲ)။
- **Entry handoff.** `?intent=create` → empty starter score; `?intent=open` → Notation Lab entry box မှ sessionStorage ဖြင့် ပို့လာသော ဖိုင်ကို render လုပ်သည်။
- **Starter score.** Create လုပ်သည့်အခါ treble clef, 4/4, 4 measures rest ပါသော MusicXML ကို ထုတ်ပြီး render လုပ်သည်။ Clef/Key/Time ပြောင်းလျှင် starter score ကို ပြန် render လုပ်သည်။
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

Note entry (တကယ် note ရေးခြင်း/ရွှေ့ခြင်း), undo/redo history, selection model, playback cursor, နှင့် MXL save တို့သည် နောက်အဆင့်များ ဖြစ်သည်။ Toolbar ရှိ Undo/Redo ခလုတ်များသည် ထိုအဆင့် အတွက် နေရာ ချန်ထားသည်။
