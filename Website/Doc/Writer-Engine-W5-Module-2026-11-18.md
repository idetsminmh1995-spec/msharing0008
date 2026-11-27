# Writer Engine W5 — သီးခြား Module ခွဲထုတ်ခြင်း

**Date:** 2026-11-18
**Package:** `Website/Writer/Writer Engine/`
**Published asset:** `Website/Website/assets/writer-engine.js`

## Goal

`notation-doc.js` သည် Editor page ရဲ့ script တစ်ခုအနေဖြင့်သာ ရှိခဲ့သည်။ W5 သည် ၎င်းကို
**DOM မပါသော module** အဖြစ် ခွဲထုတ်ပြီး၊ Editor ရဲ့ command logic ကို ထို module ထဲ
ရွှေ့ကာ Node ထဲတွင် DOM မလိုဘဲ test လုပ်နိုင်စေရန် ဖြစ်သည်။ အပြုအမူ လုံးဝ မပြောင်း။

## Package ဖွဲ့စည်းပုံ

```
Website/Writer/Writer Engine/
├── package.json                  # private၊ build step မရှိ
├── src/index.js                  # score document + edit commands + MusicXML
├── test/helpers/writer.js        # engine + writer ကို vm sandbox တစ်ခုတည်းတွင် load
├── test/writer-commands.test.js  # command တစ်ခုချင်း (DOM မပါ)
└── tools/sync-writer-engine.mjs  # src → Website/Website/assets/writer-engine.js
```

`src/index.js` သည် ယခင် `notation-doc.js` ပင် ဖြစ်သည် (`git mv` ဖြင့် ရွှေ့)။
ပြောင်းလဲမှု နှစ်ခုသာ ရှိသည် —

1. `window.NotationEngine` → `root.NotationEngine`၊ `window.NotationDoc` → `root.WriterEngine`
   (`(function (root) { … })(globalThis)` wrapper)။ ထို့ကြောင့် browser page၊ `vm`
   sandbox နှင့် plain Node သုံးမျိုးလုံး တူညီသော ကုဒ်ကို load နိုင်သည်။
2. Global အမည် `NotationDoc` → `WriterEngine`။ Editor က `window.WriterEngine` ကို ဖတ်သည်။

## ရွှေ့ခဲ့သော Command များ

Editor ထဲတွင် ရှိခဲ့သော pure logic ကို Writer Engine သို့ ရွှေ့ပြီး၊ Editor က
ခေါ်သုံးရုံသာ ကျန်သည်။ Command တိုင်းသည် **plan** (doc → edit list) ကို ပြန်ပေးသည်၊
Editor က ၎င်းကို `commit` တစ်ခုတည်းအဖြစ် လုပ်သည် — undo က gesture တစ်ခုလုံးကို ပြန်ယူသည်။

| Function | ယခင် နေရာ | အလုပ် |
|---|---|---|
| `tiePlan(doc, cells)` | `toggleTie` ကိုယ်တိုင် ရေးခဲ့ | tie နှစ်ဖက် ထည့်/ဖျက် |
| `slurPlan(doc, cells)` | `toggleSlur` ကိုယ်တိုင် ရေးခဲ့ | slur နံပါတ် ခွဲဝေ၊ start/stop တွဲ |
| `applyPlan(doc, edits)` | — | plan ကို doc အသစ်အဖြစ် အကောင်အထည်ဖော် |
| `respellPlan(doc, cells)` | `respellSelection` | enharmonic ပြောင်း (အသံ မပြောင်း) |
| `stackedChord(existing, note, tick)` | `stackedWith` | chord ထဲ ထပ်တူ notehead မထည့် |
| `intervalPlan(doc, cell, n, clef, fifths)` | `addInterval` | Alt+1–9 interval ကို top note ပေါ် stack |
| `durationPlan(doc, cells, factor, limits)` | `scaleSelectionDuration` | Q/W ထက်ဝက်/၂ဆ |
| `transposeNote(pitch, steps, clef)` | `transposeNote` | diatonic ရွှေ့ |
| `transposeSemitone(pitch, dir)` | `transposeSemitone` | semitone ရွှေ့ (♯/♭ spelling) |
| `eventNotes`၊ `eventAfter` | Editor helper များ | note စာရင်း၊ နောက် event ရှာခြင်း |

`intervalPlan` သည် မလုပ်နိုင်လျှင် အကြောင်းရင်းကို ပြန်ပေးသည် —
`'no-note'`၊ `'unwritable'`၊ `'same-note'`၊ `'already'`။ Editor က ၎င်းကို status line
အဖြစ် ပြန်ပြောသည်၊ ထို့ကြောင့် အသုံးပြုသူ မြင်ရသော စာသား မပြောင်း။

## Asset နှင့် Cache Key

`tools/sync-writer-engine.mjs` သည် `src/index.js` ကို `Website/Website/assets/writer-engine.js`
သို့ ကူးသည် (`--check` ဖြင့် stale ဖြစ်မဖြစ် စစ်)။ Page က `assets/writer-engine.js?v=…`
ဖြင့် load သည်။ `?v=` key ကို Notation Engine ၏ `scripts/sync-website-bundle.mjs` က
ဖိုင် bytes မှ တွက်သည်၊ ထို့ကြောင့် `npm run build` တိုင်း key အလိုအလျောက် ပြောင်း။

## စမ်းသပ်ချက်

**Writer Engine ၏ ကိုယ်ပိုင် test** (`npm test`, DOM မပါ၊ ၂၂ ခု) —

- module က global ပေါ် command များ ထုတ်ကြောင်း
- tie: တူညီသော pitch ကို တွဲသည်၊ မတူလျှင် ငြင်းသည်၊ ဒုတိယ run တွင် ဖျက်သည်၊ rest တွင် မရ
- slur: မတူသော pitch ကို တွဲနိုင်၊ နံပါတ် ခွဲဝေ၊ ပြန်ဖျက်
- respell: ♯ → ♭၊ အသံ (MIDI) မပြောင်း၊ rest တွင် မရ
- interval: C4 ပေါ် Alt+3 = E4၊ D major တွင် key signature accidental၊ unison = same-note
- duration: quarter → half၊ 64th ကို ထက်ဝက်၍ မရလျှင် မလုပ်
- transpose: C♯ + 1 step = D♯ (accidental ပါလာ)၊ semitone ♯/♭ spelling၊ drum တွင် မရ
- chord: pitch အသစ် ထပ်နိုင်၊ ထပ်တူ pitch ကို မထပ်

**Notation Engine ၏ test** (page-level) — 1558/1558 pass ဆက်ဖြစ်သည်။
`editor-integration.test.js` နှင့် `newscore-wizard.test.js` သည် ယခု
`assets/writer-engine.js` ကို load သည်။ `website-bundle.test.js` သည် asset အသစ်၏
`?v=` key ကို bytes နှင့် ကိုက်ကြောင်း စစ်သည်။

## ရလဒ်

- Writer Engine ကို DOM မပါဘဲ Node ထဲတွင် test လုပ်နိုင်ပြီ။
- Editor သည် command logic မရှိတော့ — toolbar၊ selection နှင့် render သာ ကျန်။
- အသုံးပြုသူ မြင်ရသော အပြုအမူ မပြောင်း (1558/1558 pass)။
