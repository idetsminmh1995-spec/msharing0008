# Notation Engine Plan ပြင်ဆင်မှုနှင့် MuseScore source စိစစ်ချက် — 2026-11-14

## အကျဉ်းချုပ်

Notation Engine Plan ပြင်ဆင်မှု၊ MuseScore source audit၊ license အခြေအနေနှင့် မပြီးသေးသည့်အလုပ်များကို ဤမှတ်တမ်းတွင် စုစည်းထားသည်။ အသုံးပြုသူက 2026-11-14 တွင် Engine ကို Drum/Piano နှစ်မျိုးအတွက်သာ မဟုတ်ဘဲ တူရိယာအားလုံးနှင့် orchestra score များကိုပါ ပံ့ပိုးရမည်ဟု ထပ်မံရှင်းလင်းခဲ့သည်။ ထို့ကြောင့် လက်ရှိ TypeScript engine ကို ပြန်သုံးပြီး generic instrument-neutral rendering ကို အခြေခံကာ လိုအပ်သည့် instrument-specific profile များကိုသာ ထပ်ထည့်ရန် Plan ကို ချဲ့ထွင်ထားသည်။ MuseScore behavior ကို reference ယူသော်လည်း project ၏ style ကိုယ်ပိုင်ဖြစ်စေရမည်။ License မကိုက်ညီသော code ကို တိုက်ရိုက်မကူးဘဲ လိုအပ်သည့် behavior ကို independent TypeScript ဖြင့် ပြန်တည်ဆောက်မည်။

ဤအလုပ်အတွင်း engine implementation code ကို မပြောင်းခဲ့ပါ။ MuseScore C++ source ကို repo ထဲသို့ download/copy မလုပ်ခဲ့ပါ။

## ပြီးစီးခဲ့သည့်အလုပ်များ

### 1. လက်ရှိ TypeScript code ကို ပြန်သုံးမည့်နေရာများ သတ်မှတ်ခြင်း

- `src/core/pitch.ts`, `note.ts`, `chord.ts`, `duration.ts`, `part.ts`, `voice.ts` တို့တွင် ရှိပြီးသား score model ကို mapping အတွက် ဆက်သုံးရန် Plan ထဲတွင် မှတ်တမ်းတင်ထားသည်။ Mapping feature အသစ်အတွက် ဒုတိယ score model တစ်ခု မဖန်တီးရန် သတ်မှတ်ထားသည်။
- `src/drums/drum-map.ts` တွင် ရှိပြီးသား `DrumMappingTable`, lookup နှင့် override-merge logic ကို Drum mapping ၏ အခြေခံအဖြစ် ပြန်သုံးရန် သတ်မှတ်ထားသည်။
- `src/musescore/drumset.ts`, `adapters.ts`, `staff-position.ts` ရှိ MuseScore reference data/conversion ကို ရှိပြီးသား provenance နှင့်အတူ အသုံးပြုရန်၊ ထပ်နေသည့် Drum mapping table အသစ် မဖန်တီးရန် မှတ်တမ်းတင်ထားသည်။
- `src/geometry/notehead.ts` ရှိ MusicXML notehead, SMuFL glyph နှင့် configured override ရွေးချယ်မှုကို ပြန်သုံးရန်၊ `clef.ts` နှင့် `staff.ts` ကို clef-aware position mapping အတွက် ဆက်သုံးရန် သတ်မှတ်ထားသည်။

ဆက်စပ် code: [core note model](../Notation/Notation%20Engine/src/core/note.ts), [pitch model](../Notation/Notation%20Engine/src/core/pitch.ts), [drum mapping](../Notation/Notation%20Engine/src/drums/drum-map.ts), [MuseScore drum reference data](../Notation/Notation%20Engine/src/musescore/drumset.ts), [notehead mapping](../Notation/Notation%20Engine/src/geometry/notehead.ts).

### 2. P2B — တူရိယာအားလုံးနှင့် Orchestra/ensemble score များအတွက် Plan ထည့်သွင်းခြင်း

[Notation Engine Plan](../Notation/Notation%20Plan/PLAN.md) ထဲတွင် Engine ကို Piano/Drum ဖြင့်သာ မကန့်သတ်ဘဲ generic pitched mapping နှင့် orchestra/ensemble full-score support ပါဝင်စေရန် P2B ကို ပြင်ဆင်ထားသည်။ Piano နှင့် Drum သည် specialized mapping ၏ ဥပမာများသာဖြစ်ပြီး တူရိယာတစ်ခုချင်းစီအတွက် သီးခြား map ရှိမှသာ support ဖြစ်မည်ဟု မသတ်မှတ်ရ။

- `NoteMapping` သည် pitched/unpitched `Note` နှင့် part/staff/clef/instrument context ကို လက်ခံပြီး staff position, notehead, stem/voice preference စသည့် display-only result ကို ပြန်ပေးမည်။ Canonical pitch, duration, MIDI playback note နှင့် မူရင်း MusicXML metadata ကို မပြောင်းရ။
- `GenericPitchedMapping` ကို ပုံမှန် pitched instrument အားလုံးအတွက် default ထားပြီး `InstrumentProfile` ဖြင့် part/instrument identity, clef, staff အရေအတွက်, transposition, octave transposition နှင့် လိုအပ်သော engraving setting များကို ဖော်ပြမည်။
- `MappingRegistry` သည် instrument/part identity နှင့် profile ကို အခြေခံ၍ generic mapping သို့မဟုတ် လိုအပ်သည့် specialized mapping ကို ရွေးမည်။ Profile မရှိသော instrument ၏ valid note များကိုလည်း generic mapping ဖြင့် render လုပ်ရမည်။
- Piano, strings/tablature, transposing instruments, keyboard/organ, vocal parts နှင့် pitched/unpitched percussion အတွက် generic support လုံလောက်သည့်နေရာတွင် generic rule သုံးပြီး၊ အထူး notation လိုအပ်သည့်နေရာတွင်သာ သီးခြား profile/module ထည့်မည်။
- `DrumMapping` သည် လက်ရှိ `DrumMappingTable` ကို adapter ဖြင့် shared contract ထဲသို့ ချိတ်မည်။ MIDI pitch သို့မဟုတ် `instrumentId` မှ drum identity, staff position, notehead, voice နှင့် articulation ကို သတ်မှတ်မည်။
- Orchestra/ensemble support တွင် part များစွာ၊ part တစ်ခုအတွင်း staff/voice များစွာ၊ part အမည်/အစီအစဉ်၊ transposition နှင့် full-score system layout ကို ထိန်းသိမ်းပြီး render လုပ်ခြင်း ပါဝင်မည်။ Orchestra သည် instrument အမျိုးအစားတစ်ခုမဟုတ်ဘဲ ensemble ဖြစ်သည်။
- `MappingProfile` သည် MuseScore ကိုးကားထားသော default နှင့် project ၏ ကိုယ်ပိုင် house style ကို ခွဲထားမည်။ Config မှ profile တစ်ခုချင်း override လုပ်နိုင်ရမည်။
- Resolution precedence ကို tests ဖြင့် သတ်မှတ်မည် — MusicXML ၏ explicit display/notehead/stem metadata → user profile override → instrument mapping → documented fallback နှင့် diagnostic။ Mapping မတွေ့ခြင်းကြောင့် note ကို မဖယ်ရှားရ။
- Mapping ပြောင်းလဲသော်လည်း sounding pitch နှင့် playback MIDI data မပြောင်းကြောင်း စစ်ဆေးမည့် regression tests ကို Plan ထဲတွင် ထည့်ထားသည်။

ဤအရာများသည် Plan အဆင့်တွင်သာ ရှိသေးပြီး `GenericPitchedMapping`, `InstrumentProfile`, `MappingRegistry`, orchestral full-score layout သို့မဟုတ် instrument-specific TypeScript module အသစ်များကို မရေးရသေးပါ။

### 3. MuseScore source audit နှင့် provenance မှတ်တမ်း

Official `musescore/MuseScore` repository ၏ `main` branch ကို commit `e32154cc04e12a05f52942cd9dc7b7e7f67685ce` တွင် စစ်ဆေးခဲ့သည်။ ၎င်းသည် audit လုပ်စဉ် branch-head snapshot ဖြစ်ပြီး release tag မဟုတ်ပါ။ Plan ထဲတွင် note-related source ကို အောက်ပါအုပ်စုများအလိုက် reference အဖြစ် စာရင်းသွင်းထားသည်။

- **Score/note model:** `src/engraving/dom/note.h/.cpp`, `pitchspelling.h`, `chord.h`, `chordrest.h`, `rest.h`, `tie.h`, `durationtype.h`, `staff.h`, `segment.h`။ Pitch spelling, duration, chord, tie, staff နှင့် voice/track ဆိုင်ရာ behavior ကို လေ့လာရန်။
- **MusicXML note import:** `src/importexport/musicxml/internal/import/importmusicxmlnotepitch.cpp/.h`, `importmusicxmlnoteduration.cpp/.h`, `importmusicxmlpass2.cpp`, `musicxmlvoicedesc.cpp/.h`။ Pitch, divisions, voice/chord, instrument ID နှင့် unpitched note များ၏ behavior ကို လေ့လာရန်။
- **Engraving:** `src/engraving/dom/note.cpp`, `stem.cpp`, `beam.cpp`, `accidental.cpp`, `ledgerline.cpp`, `notedot.cpp`, `tie.cpp`, `clef.cpp`, `src/engraving/rendering/score/horizontalspacing.cpp`။ MuseScore ၏ layout rules ကို reference လုပ်ပြီး TypeScript geometry ကို သီးခြားတည်ဆောက်ရန်။
- **Note entry/editing:** `src/notation/inotationnoteinput.h`, `src/notation/internal/notationnoteinput.cpp`, `src/engraving/editing/noteinput.h`, `editnote.h`, `editduration.h`, `editchord.h`။ Desktop C++/Qt interaction code ဖြစ်သဖြင့် browser engine ထဲသို့ တိုက်ရိုက်ယူရန်မဟုတ်ဘဲ behavior ကို လေ့လာရန်။
- **Instrument family/Piano/Drum:** `share/instruments/instruments.xml`, `src/engraving/dom/instrument.h/.cpp`, `drumset.h/.cpp`, `staff.h/.cpp`။ Instrument profile, transposition, staff နှင့် percussion data တို့ကို engraving/playback dependency များမှ ခွဲပြီး စိစစ်ရန်။
- **Style/glyph:** `src/engraving/dom/engravingstyle.h/.cpp`, `symnames.cpp`, `fonts/bravura/Bravura.json`။ Code, glyph metadata/data နှင့် font binary တို့ကို license သီးခြားစီဖြင့် ကိုင်တွယ်ရန်။

လက်ရှိ project ၏ `src/musescore/provenance.ts` သည် ယခင် commit `9140c5e4b7b5b48357b8d38dfebd0dd979653d21` ကို pin လုပ်ထားသည်။ Audit လုပ်ခဲ့သော commit က မတူသဖြင့် ရှိပြီးသား data/provenance ကို အလိုအလျောက် မပြောင်းရန် Plan တွင် သတိပြုချက် ထည့်ထားသည်။

### 4. License-aware reuse မူဝါဒ ထည့်သွင်းခြင်း

Audit လုပ်ထားသော MuseScore note/model/import source များတွင် `GPL-3.0-only` license သတ်မှတ်ချက်ရှိသည်။ Repo root တွင် project license file မရှိသလို Notation Engine package ကို `private: true` ဟု သတ်မှတ်ထားပြီး အနာဂတ် ဖြန့်ချိမှုအခြေအနေ မဆုံးဖြတ်ရသေးပါ။ MuseScore license ထဲရှိ font exception သည် ဖော်ပြထားသော font/document ကန့်သတ်ချက်များအတွက်သာ ဖြစ်ပြီး source code သို့မဟုတ် font binary အားလုံးကို ကူးယူခွင့်ပြုသည့် အထွေထွေခွင့်ပြုချက် မဟုတ်ကြောင်း မှတ်တမ်းတင်ထားသည်။

အသုံးပြုသူ၏ 2026-11-14 လမ်းညွှန်ချက်ကိုလည်း Plan ထဲတွင် ထည့်သွင်းထားသည် — ရှိပြီးသား code နှင့် license ကိုက်ညီကြောင်း အတည်ပြုထားသည့် external code/assets များကို ပြန်သုံးရန်၊ notation ကို ကိုယ်ပိုင် style အတိုင်း ပြင်ဆင်ရန်၊ license မကိုက်ညီခြင်း သို့မဟုတ် မရှင်းလင်းခြင်းရှိပါက behavior ကို independent TypeScript ဖြင့် ပြန်ရေးရန်။

အသုံးပြုသူက scope ကို ထပ်မံရှင်းလင်းရာတွင် တူရိယာအားလုံး၏ notation ကို ဖတ်/render လုပ်နိုင်ရမည်၊ orchestra/ensemble score များအတွက် part များစွာနှင့် staff များစွာပါဝင်သည့် full score ကိုလည်း ပံ့ပိုးရမည်ဟု ပြောထားသည်။ Piano နှင့် Drum ကိုသာ ဦးတည်သည့်ပုံစံမဖြစ်စေရန် P2B ကို generic instrument support နှင့် multi-part score support အဖြစ် ထပ်မံတိုးချဲ့ထားသည်။

လက်ရှိအခြေအနေတွင် GPL MuseScore C++ source နှင့် Bravura font binary ကို repo ထဲသို့ မကူးထည့်ပါ။ License ကန့်သတ်ချက် မရှင်းသည့် code ကို pinned source link အဖြစ်သာ ထားမည်။ နောက်ပိုင်း project ၏ distribution/license မူဝါဒ GPL နှင့် ကိုက်ညီကြောင်း ဆုံးဖြတ်ပြီးမှသာ သီးခြား reference bundle ကို အပြည့်အစုံ license, per-file notice, source commit နှင့် manifest ပါအောင် ပြန်သုံးသပ်နိုင်သည်။ ဤမှတ်တမ်းသည် ဥပဒေအကြံပေးချက် မဟုတ်ပါ။

## ပြောင်းလဲခဲ့သည့်ဖိုင်များနှင့် Git မှတ်တမ်း

- `Website/Notation/Notation Plan/PLAN.md` — P2B mapping roadmap, MuseScore source audit, provenance caution နှင့် license-aware reuse policy ကို ထည့်သွင်း/ပြင်ဆင်ခဲ့သည်။
- `Website/Doc/Notation-Engine-Plan-Work-Log-2026-11-14.md` — ဤလုပ်ငန်းမှတ်တမ်း။
- `Website/Doc/README.md` — ဤမှတ်တမ်းကို Documentation index တွင် ချိတ်ဆက်ထားသည်။

မူလ mapping/license Plan ပြင်ဆင်မှုများ `main` branch သို့ push လုပ်ထားသော commit များ:

- `b71e8395788230bb4777404d5d4d6135126a8150` — `docs: extend Notation Engine mapping plan`
- `19523338079330ceb5ee8484da470eae42ebe4b7` — `docs: clarify MuseScore reuse and license policy`

## စစ်ဆေးမှုနှင့် မလုပ်ခဲ့သည့်အရာများ

- မူလ Plan ပြင်ဆင်မှုများတွင် `git diff --check` ဖြင့် whitespace စစ်ခဲ့ပြီး push ပြီးနောက် `main` နှင့် `origin/main` တစ်ပြိုင်တည်းဖြစ်ကြောင်း စစ်ခဲ့သည်။ ယခု all-instrument/orchestra scope ပြင်ဆင်မှုများတွင်လည်း `git diff --check`, Burmese text scan နှင့် local Markdown link စစ်ဆေးမှုတို့ကို အောင်မြင်စွာ ပြီးစီးခဲ့သည်။
- ဤအလုပ်သည် documentation-only ဖြစ်သဖြင့် `npm test`, typecheck, lint, browser rendering သို့မဟုတ် E2E test များကို မလုပ်ခဲ့ပါ။ Plan ထဲရှိ test-file အရေအတွက်သည် ယခုအလုပ်တွင် test အားလုံး run/pass ဖြစ်သည်ဟု မဆိုလိုပါ။
- MuseScore source file download/copy, C++ build/integration, `PianoMapping`, shared mapping interface နှင့် playback routing implementation မလုပ်ခဲ့ပါ။
- Source/asset တစ်ခုချင်း၏ license အပြည့်အစုံကို inventory လုပ်ခြင်း သို့မဟုတ် ဥပဒေသုံးသပ်ချက် ပြုလုပ်ခြင်း မရှိသေးပါ။ Resource အသစ်သုံးမီ file တစ်ခုချင်း၏ license/header/notice နှင့် project distribution policy ကို စစ်ဆေးရန်လိုသည်။

## ကျန်ရှိနေသည့်အလုပ်များ

အောက်ပါအလုပ်များအားလုံး မပြီးသေးပါ (`[ ]`)။ အစီအစဉ်အပြည့်အစုံကို [Notation Engine Plan](../Notation/Notation%20Plan/PLAN.md) တွင် ထိန်းသိမ်းထားပြီး အကြံပြုထားသော အစဉ်မှာ **P0 → P1 → P2 → P2B → P3 → P4 → P5** ဖြစ်သည်။

### P0 — Build, validation နှင့် CI

1. `scripts/sync-website-bundle.mjs` ၏ output/destination နှင့် cache-busting path များကို လက်ရှိ deploy directory structure နှင့် ကိုက်ညီအောင် စစ်ဆေးရန်။ မရည်ရွယ်သော folder overwrite မဖြစ်ကြောင်းလည်း စမ်းသပ်ရန်။
2. `scripts/generate-api-docs.mjs` ၏ output path နှင့် hand-written Plan/API docs တို့၏ canonical location/ownership ကို ဆုံးဖြတ်ရန်။
3. Clean environment တွင် `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run docs:check`, `npm test` ကို အစဉ်လိုက် run လုပ်ပြီး failure တစ်ခုချင်းကို အကြောင်းရင်းနှင့်အတူ မှတ်တမ်းတင်ရန်။
4. CI verification ထည့်ရန်။ Browser tests အတွက် Chromium နှင့် Bravura font ရရှိနိုင်မည့်ပုံကို သတ်မှတ်ရန်။

### P1 — Documentation နှင့် supported scope

1. `src/parser/README.md`, `src/layout/README.md`, `src/export/README.md`, `test/fixtures/README.md` ထဲက placeholder/ခေတ်မမီတော့သည့်စာသားများကို အမှန်တကယ် implementation နှင့်ညီအောင် ပြင်ရန်။
2. Install/build, DOMParser လိုအပ်ချက်, public API, MXL extraction, export behavior နှင့် host/browser ကန့်သတ်ချက်များပါသော root README ကို ပြင်ဆင်ရန်။
3. MusicXML element များအတွက် implemented/partially supported/unsupported matrix တည်ဆောက်ပြီး unknown/malformed input recovery နှင့် diagnostics ကို ရှင်းပြရန်။
4. `src/theme/` သည် `EngineConfig` ဖြင့် အစားထိုးထားပြီး `src/plugins/` ကို လက်တွေ့လိုအပ်ချက် မပေါ်မချင်း ရွှေ့ဆိုင်းထားကြောင်း မှတ်တမ်းတင်ရန်။ Duplicate theme/plugin API မဖန်တီးရန်။

### P2 — Import compatibility နှင့် MIDI scope

1. MusicXML partwise/timewise, MXL, changing divisions/attributes, voices/chords/rests, unpitched percussion, lyrics/directions/harmony တို့အတွက် fixture matrix တိုးချဲ့ရန်။ Fixture တစ်ခုချင်းစီ၏ exporter provenance ကို မှတ်တမ်းတင်ရန်။
2. Instrument transposition, unusual notation, malformed note/chord နှင့် multiple-staff input များအတွက် diagnostic/recovery tests တိုးချဲ့ရန်။
3. `parseMidiFile()` ကို event/meta parser အဖြစ်သာထားမည်လား၊ MIDI-to-Score API သီးခြားဖန်တီးမည်လား ဆုံးဖြတ်ရန်။ MIDI alignment လိုအပ်ပါက multi-part assignment, duplicate pitch/tick, unmatched note နှင့် stable event association ကို သတ်မှတ်ပြီး စမ်းသပ်ရန်။

### P2B — တူရိယာအားလုံးနှင့် Orchestra/ensemble support

1. Generic pitched mapping, `InstrumentProfile`, shared mapping input/context/result types နှင့် `MappingRegistry` တို့၏ contract ကို သတ်မှတ်ပြီး contract/type-level tests ရေးရန်။
2. Profile သတ်မှတ်မထားသော instrument အပါအဝင် ပုံမှန် pitched instrument အားလုံးကို generic rule ဖြင့် render လုပ်နိုင်ကြောင်း စမ်းသပ်ရန်။ မသိသော instrument identifier ကြောင့် note ကို မပယ်ချရ။
3. Piano, strings/tablature, transposing/octave-transposing parts, keyboard/organ, vocal parts, pitched/unpitched percussion အတွက် generic support နှင့် special profile လိုအပ်ချက်ကို တစ်ခုချင်း စစ်ဆေးရန်။ ရှိပြီးသား Drum map ကို adapter ဖြင့် ပြန်သုံးရန်။
4. Orchestra/ensemble fixtures ဖြင့် multi-part, multi-staff, multi-voice, transposing instruments, part name/order နှင့် full-score system spacing ကို စမ်းသပ်ရန်။ Group bracket/barline နှင့် automatic condensing ကို သီးခြားဆုံးဖြတ်ရန်။
5. `MappingProfile` customization/persistence, renderer bridge နှင့် precedence ကို implement လုပ်ရန်။ User mapping ကြောင့် sounding pitch/playback data မပြောင်း၊ unknown mapping ကြောင့် note မပျောက်ဘဲ diagnostic ရှိကြောင်း စစ်ဆေးရန်။
6. MuseScore reference behavior နှင့် pinned fixtures/snapshots ကို နှိုင်းယှဉ်ပြီး project ၏ ရည်ရွယ်ထားသော style ကွာခြားချက်များကို မှတ်တမ်းတင်ရန်။ Source/asset တစ်ခုချင်းစီ၏ license/attribution ကိုလည်း စစ်ဆေးရန်။

**ပြီးစီးမှုစံ:** Profile မရှိသော instrument အပါအဝင် valid note များ မပျောက်ဘဲ render ဖြစ်ရမည်။ Instrument family များစွာနှင့် Orchestra/ensemble ၏ multi-part, multi-staff score များကို fixture/integration tests ဖြင့် အတည်ပြုရမည်။ Mapping သည် source MusicXML data, rhythm, sounding pitch သို့မဟုတ် playback ကို မပြောင်းရ။

### P3 — Rendering နှင့် layout

1. Fixed-five-line assumptions များကို import မှ SVG အထိ စစ်ဆေးပြီး staff line 1–6+ အတွက် fixtures/tests ထည့်ရန်။
2. TAB clef/staff နှင့် tablature number/string position ကို end-to-end စစ်ဆေးရန်။
3. Page resize/reflow တွင် pure scaling နှင့် repagination ကို ခွဲခြားပြီး clipping/overlap tests ထည့်ရန်။
4. Bravura metrics ပေါ်အခြေခံသည့် custom font limitation ကို documentation တွင် ရှင်းပြရန် သို့မဟုတ် metrics provider abstraction တည်ဆောက်ရန်။
5. External config မှ enum/numeric range/unknown override များအတွက် runtime validation သို့မဟုတ် diagnostic ထည့်ရန်။

### P4 — Timing, playback နှင့် export

1. Tempo/meter ၏ zero, negative, non-finite value များအတွက် validation ထည့်ပြီး timing result များ finite/monotonic ဖြစ်ကြောင်း စမ်းသပ်ရန်။
2. Pickup, shortened, overfull measure များ၏ actual tick duration ကို `PlaybackData` နှင့် playhead calculation ထဲတွင် အသုံးပြုရန်။
3. Raster slice rounding ကြောင့် source row ပျောက်ခြင်း/ထပ်ခြင်း မဖြစ်ကြောင်း remainder ရှိသော dimensions များဖြင့် စမ်းသပ်ရန်။
4. PNG/PDF export ၏ limitation နှင့် browser/host backend လိုအပ်ချက်ကို public docs တွင် ဖော်ပြရန်။
5. Alignment, repeat expansion, raster/PDF encoding အတွက် performance budget သတ်မှတ်ရန်။

### P5 — Release နှင့် maintenance

1. Package ကို internal-only ထားမည်လား publishable လုပ်မည်လား ဆုံးဖြတ်ပြီး version, API contract, license/attribution နှင့် release checklist ကို သတ်မှတ်ရန်။
2. Concrete integration need မပေါ်မချင်း plugin framework မတည်ဆောက်ဘဲ လက်ရှိ typed config နှင့် exported functions များကို အသုံးပြုရန်။

### Sound Engine နှင့် ဆက်စပ်နေသည့်အလုပ်

SoundFont integration milestone တွင် unpitched percussion mapping နှင့် MusicXML instrument program/bank routing မပြီးသေးပါ။ ယင်းအလုပ်များကို P2/P2B mapping contract နှင့် ချိတ်ဆက်သတ်မှတ်ပြီး၊ SoundFont delivery/access နှင့် browser E2E အခြေအနေများကို [SoundFont R2 upload work log](SoundFont-R2-Upload-2026-11-13.md) တွင် ဆက်လက်စစ်ဆေးရန်။

## ကိုးကားချက်များ

- [Notation Engine Plan](../Notation/Notation%20Plan/PLAN.md)
- [MuseScore source tree — audit လုပ်ခဲ့သော commit](https://github.com/musescore/MuseScore/tree/e32154cc04e12a05f52942cd9dc7b7e7f67685ce)
- [MuseScore upstream license](https://github.com/musescore/MuseScore/blob/e32154cc04e12a05f52942cd9dc7b7e7f67685ce/LICENSE.txt)
- [MuseScore note model](https://github.com/musescore/MuseScore/blob/e32154cc04e12a05f52942cd9dc7b7e7f67685ce/src/engraving/dom/note.h)
- [MuseScore MusicXML pitch importer](https://github.com/musescore/MuseScore/blob/e32154cc04e12a05f52942cd9dc7b7e7f67685ce/src/importexport/musicxml/internal/import/importmusicxmlnotepitch.cpp)
- [Bravura font license](https://github.com/musescore/MuseScore/blob/e32154cc04e12a05f52942cd9dc7b7e7f67685ce/fonts/bravura/LICENSE.txt)
- [SoundFont R2 upload work log](SoundFont-R2-Upload-2026-11-13.md)
