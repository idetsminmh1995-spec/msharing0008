# Writer Engine Plan — MuseScore ကဲ့သို့ ရေးခြင်း system

**ရက်စွဲ:** 2026-11-26

**အခြေခံ:** `Website/Website/notation-doc.js` နှင့် `notation-editor.js` (2026-11-26 စစ်ဆေးချက်)

**ဆက်စပ်:** Main Plan ၏ [Writer Engine — Notation Editor](../../Plan/README.md#writer-engine--notation-editor--2026-11-22) နှင့် [Engine တာဝန်ခွဲခြားမှု](../../Plan/README.md#၁၀-engine-တာဝန်ခွဲခြားမှု-ဆုံးဖြတ်ချက်)။ Video နှင့် သက်ဆိုင်သော အပိုင်းများကို [Video Engine Plan](../../Video/Video%20Engine%20Plan/PLAN.md#writer-engine-မှ-ဆင်းသက်လာသော-video-side-လိုအပ်ချက်များ--2026-11-26) တွင် သီးခြားထားသည်။

**ရည်ရွယ်ချက် (user):** Notation ပေါ်တွင် **တကယ် ရေးနိုင်**ရမည်။ ရေးသည့် system များသည် **MuseScore ကဲ့သို့ အလုပ်လုပ်**ရမည်။ ဤ Plan သည် Writer Engine ကို သီးခြား module အဖြစ် ခွဲရာတွင်လည်း အသုံးပြုမည်။

---

## ၁။ အခြေခံမူ

1. **Writer Engine = ရေးခြင်း၏ logic သက်သက်။** Screen မဆွဲ (Notation Engine က ဆွဲ)၊ အသံမဖွင့် (Sound Engine က ဖွင့်)၊ video မထုတ် (Video Engine က ထုတ်)၊ DOM / file / network ကို မကိုင်။ Input (key၊ click၊ MIDI) မှ command အဖြစ် ပြောင်းပေးသည်မှာ Editor UI ၏ အလုပ်။
2. **Command အခြေခံ:** ရေးသည့်လုပ်ဆောင်ချက်တိုင်းသည် command တစ်ခု (`insertNote`, `deleteSelection`, `setDuration` …)။ Command သည် document အသစ်ကို ပြန်ပေး (အရင် document ကို မပြင်)၊ ပြောင်းမှု၊ selection အသစ်၊ announce စာသား (screen reader) ပါ ပြန်ပေးသည်။ Undo/redo သည် ဤ document အဟောင်း/အသစ်ပေါ် တည်သည်။
3. **MuseScore ကို အပြုအမူ ရည်ညွှန်းအဖြစ်သာ သုံး** (handbook ၏ ရေးပုံ/shortcut)။ MuseScore source code ကို ကူးမထည့်ရ — `AGENTS.md` ၏ စည်းမျဉ်း (GPL ကြောင့်) နှင့် ညီ။ (user အစောပိုင်းပြောခဲ့သော "MuseScore code ကို ထည့်သုံး" နှင့် ကွာ၍ ပြန်ဆုံးဖြတ်ရန် — အောက်ပိုင်း §၇ တွင် ဖွင့်ထားသည်။)
4. **Invariant များ** (မည်သည့် command နောက်မဆို မှန်ရမည်): (က) measure တစ်ခု၏ voice တစ်ခုချင်းစီ၏ ကြာချိန်ပေါင်း = measure အရှည် (မပြည့်လျှင် rest ဖြည့်) (ခ) tie သည် pitch တူသော နောက် note တွင် ဆုံ (ဂ) overlap မရှိ (ဃ) voice 1–4 သာ။
5. **Notation Engine က အမှန်တရားဖြစ်သော structured score document** ကို အခြေခံ — render လုပ်ထားသော SVG မဟုတ်။ Edit တိုင်း document အသစ် → Notation Engine ပြန်ဆွဲ။

---

## ၂။ MuseScore နှင့် နှိုင်းယှဉ်ချက် (လက်ရှိ Editor — 2026-11-26 စစ်ဆေးချက်)

MuseScore ၏ shortcut များကို MuseScore Handbook (MuseScore 3 ၏ Note input / Keyboard shortcuts စာမျက်နှာများ) မှ အတည်ပြုထားသည်။ **T၊ S၊ Ctrl+2–9 (tuplet)၊ Ctrl+B၊ Ctrl+K** တို့ကို ကျွန်တော့်သိသလောက် ဖော်ပြထားခြင်းဖြစ်၍ အတည်ပြုရန်။ Editor ၏ အခြေအနေကို `notation-editor.js` / `notation-doc.js` ကိုဖတ်၍ ပြုစုထားသည်။

| MuseScore လုပ်ဆောင်ချက် | MuseScore key | Editor (လက်ရှိ) | အခြေအနေ |
|---|---|---|---|
| Note input mode ဖွင့်/ပိတ် | `N`၊ ထွက်ရန် `N` / `Esc` | `N` ဖွင့်/ပိတ်ရ၊ `Esc` က input ကိုပိတ်ပြီး selection ရှင်း | ✅ |
| Duration ရွေး | `1`–`9` (`1`=64th … `5`=quarter … `7`=whole `8`=breve `9`=longa) | `SHORTCUT_DURATION` map ရှိ၊ W2b တွင် MuseScore အတိုင်း ပြောင်းပြီး | ✅ |
| Dot | `.` | `.` က dot ၀–၃ လည် | 🟡 |
| Rest ရေး | `0` | `0` သာ rest | ✅ |
| Repeat last note / selection | `R` | ရှိ (selection မရှိလျှင် နောက်ဆုံးရေးသော note ကို ပြန်) | ✅ |
| Pitch (A–G) | `A`–`G` | ရှိ | ✅ (အနီးဆုံး octave ရွေးပုံ စစ်ရန်) |
| Chord ထပ်ထည့် | `Shift`+letter | ရှိ | ✅ |
| Pitch ↑ / ↓ | `↑` `↓` = **semitone** (♯ / ♭) | `↑` `↓` = semitone (တက်=♯၊ ဆင်း=♭) | ✅ |
| Diatonic ↑ / ↓ | `Alt+Shift+↑` / `↓` | ရှိ | ✅ |
| Octave ↑ / ↓ | `Ctrl+↑` / `Ctrl+↓` | ရှိ (±7 step) | ✅ |
| Interval ထည့် | `Alt+1`–`9` | ရှိ (chord ၏ အမြင့်ဆုံးမှ စာလုံးအမည်ဖြင့် ရေတွက်) | ✅ |
| Enharmonic ပြောင်း | `J` | ရှိ (အသံ မပြောင်း၊ sharp↔flat ဦးစား) | ✅ |
| နောက်ဆုံးရေးသော note ကို ပြန်ဖျက် | `Backspace` (input mode) | input mode တွင် နောက်ဆုံး note ပြန်ဖျက်၊ ပြင်ပတွင် Delete | ✅ |
| note နေရာလဲ | `Shift+←` / `→` | ရှိ (ရွေးထားသော beat များ block အဖြစ်) | ✅ |
| Duration ထက်ဝက် / ၂ ဆ | `Q` / `W` | ရှိ (selection မရှိလျှင် note value ကို ပြောင်း) | ✅ |
| Voice ရွေး | `Ctrl+Alt+1`–`4` | ရှိ | ✅ |
| Tie | `T` | ရှိ | ✅ |
| Slur | `S` | ရှိ | ✅ |
| Tuplet (triplet စသည်) | `Ctrl+2`–`9` | ရှိ (`insertTuplet`၊ toolbar panel၊ `Ctrl+2`–`9`) | ✅ |
| Beam ထိန်း | (Palette: Beam properties) | မရှိ | ❌ |
| Grace note | `/` (acciaccatura) | palette ရှိ၊ key မရှိ | 🟡 |
| Hairpin | `<` `>` | palette (lines) | 🟡 |
| Articulation | `Shift+S` staccato၊ `Shift+N` tenuto … | palette ရှိ၊ key မရှိ | 🟡 |
| Lyrics | `Ctrl+L` | `setLyric` doc command ရှိ၊ UI စစ်ရန် | 🟡 |
| Staff text / Tempo text / Rehearsal mark | `Ctrl+T` / `Alt+Shift+T` / `Ctrl+M` | `setTempo` / `setDirection` command ရှိ၊ staff text UI မရှိသလောက် | 🟡 |
| Chord symbol | `Ctrl+K` | **မရှိ** | ❌ |
| Flip direction | `X` | မရှိ | ❌ |
| Insert measure | `Ctrl+B` | ရှိ (`Ctrl+B` = အဆုံးတွင်၊ `Ctrl+Shift+B` = ကာတာရှေ့) | ✅ |
| Select all / Copy / Cut / Paste | `Ctrl+A/C/X/V` | ရှိ | ✅ |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` | ရှိ (၁၀၀ ဆင့်) | ✅ |
| Play / Pause | `Space` | ရှိ | ✅ |
| MIDI keyboard ဖြင့်ရေး | — | ရှိ (chord = ကိုင်ထားသော key များ၊ key signature အလိုက် spell) | ✅ |
| Drum kit MIDI map | — | ရှိ | ✅ |

**ဆုံးဖြတ်ချက် (user, 2026-11-27):** Key map ကို MuseScore 4 နှင့် အတိအကျ တူအောင် ပြင်မည်။ **W2 ပြီးစီး (2026-11-27)** — `↑`/`↓` = semitone၊ `Alt+Shift+↑`/`↓` = diatonic၊ `R` = repeat၊ `0` = rest၊ `Backspace` = input mode တွင် နောက်ဆုံး note ပြန်ဖျက်၊ `Esc` = input mode မှ ထွက်။ **W4 ပြီးစီး (2026-11-18)** — `Alt+1`–`9` interval၊ `J` enharmonic၊ `Shift+←`/`→` beat ရွှေ့၊ `Q`/`W` duration၊ `T` tie၊ `S` slur၊ `Ctrl+B` bar ထည့်။

**မှတ်တမ်း — shortcut ပြောင်းလဲမှု (အသုံးပြုသူ သိရန်):** ယခင် Editor တွင် `↑`/`↓` သည် diatonic step ဖြစ်ခဲ့သည်၊ ယခု semitone ဖြစ်သည် (diatonic ကို `Alt+Shift+↑`/`↓` သို့ ရွှေ့)။ `R` သည် ယခင် rest ဖြစ်ခဲ့သည်၊ ယခု repeat ဖြစ်သည် (rest ကို `0` သာ)။ `Backspace` သည် ယခင် delete ဖြစ်ခဲ့သည်၊ ယခု input mode တွင် နောက်ဆုံး note ပြန်ဖျက်သည် (delete ကို `Delete` သာ၊ သို့မဟုတ် input mode ပြင်ပ `Backspace`)။ `Esc` သည် ယခင် selection သာ ရှင်းခဲ့သည်၊ ယခု input mode ကိုပါ ပိတ်သည်။

---

## ၃။ Scope အဆင့်များ

| အဆင့် | ပါဝင်မည့်အရာ |
|---|---|
| **Tier 1 — ရေးနိုင်ရန် မဖြစ်မနေ** | Note input mode၊ duration၊ dot၊ rest၊ pitch (letter / semitone / diatonic / octave)၊ chord၊ accidental၊ **tuplet**၊ tie၊ slur၊ voice 1–4၊ select / range select၊ delete၊ copy / cut / paste၊ undo / redo၊ insert / delete measure၊ key / time / clef ပြောင်း (mid-score)၊ auto beam၊ ရေးစဉ် **အသံကြား** (note ထည့်သည်နှင့် Sound Engine က ဖွင့်) |
| **Tier 2** | repeat last / selection (`R`) ✅၊ interval (`Alt+1–9`) ✅၊ enharmonic (`J`) ✅၊ note နေရာရွှေ့ ✅၊ Q/W ✅၊ flip (`X`)၊ lyrics၊ staff / tempo text၊ chord symbol၊ grace note၊ ottava၊ articulation / dynamic / hairpin key များ၊ repeat / volta၊ pickup measure |
| **Tier 3** | Percussion panel (MuseScore ပုံစံ)၊ Tab ပြည့်စုံစွာ ရေးခြင်း (fret နံပါတ်)၊ fingering၊ tremolo / arpeggio ပြည့်စုံ၊ beam properties၊ transpose dialog |

---

## ၄။ Writer Engine ၏ ဖွဲ့စည်းပုံ

- **Folder (အဆိုပြု):** `Website/Writer/Writer Engine/` (`src/`၊ `test/`)၊ build လုပ်၍ `Website/Website/assets/writer-engine.js` ကို publish (အခြား Engine များကဲ့သို့)။ Engine Plan/Doc folder (`Writer Engine Plan`၊ `Writer Engine Doc`) ကိုလည်း အတူထား (Repository structure စည်းမျဉ်း)။
- **Command ၏ ပုံစံ:** `command(doc, selection, args) → { doc, selection, changed, announce }` (pure function)။ Editor က `commit()` ဖြင့် history ထဲထည့်။
- **Command အုပ်စုများ:**

| အုပ်စု | ဥပမာ command |
|---|---|
| ထည့်ခြင်း | `insertNote`၊ `insertRest`၊ `addToChord`၊ `insertTuplet` |
| ပြင်ခြင်း | `setDuration`၊ `toggleDot`၊ `changePitch` (semitone / step / octave)၊ `toggleAccidental`၊ `respell` (enharmonic)၊ `setVoice`၊ `swapWithPrevious` |
| ချိတ်ဆက်ခြင်း | `toggleTie`၊ `toggleSlur`၊ `setBeam` |
| ဖျက်ခြင်း | `deleteSelection` (rest ဖြင့်အစားထိုး)၊ `removeMeasure` |
| ဖွဲ့စည်းပုံ | `insertMeasure`၊ `setClef` / `setKey` / `setTimeSignature`၊ `addPart` / `removePart` |
| စာသား/အမှတ်အသား | `setLyric`၊ `setStaffText`၊ `setTempo`၊ `setDynamic`၊ `setArticulation`၊ `setOctaveShift` |
| Clipboard | `copy`၊ `cut`၊ `paste`၊ `repeatSelection` |
| Selection | `moveSelection`၊ `extendRange`၊ `selectAll`၊ `selectMeasure` |

- **ယခုရှိပြီးသား:** `notation-doc.js` ၏ edit command များ (`insertEvent`, `deleteEvents`, `patchEvent`, `setEventDuration`, `setEventVoice`, `moveEvent`, `setNotesPitch`, `setLyric`, `setSetup`, `setTempo`, `setDirection`, `setOctaveShift`, `insertMeasureAfter`, `removeMeasure`, `excerpt`, `paste`, `toMusicXml` …)။ `notation-editor.js` ထဲတွင် command logic နှင့် UI ရောနေသည် (`insertAtEntry`, `deleteSelection`, `transposeSelection`, `toggleTie`, `toggleSlur`, `setVoice`, `moveSelection` …) — ၎င်းတို့ကို Writer Engine သို့ ရွှေ့ရမည်။

---

## ၅။ စစ်ဆေးရေး (test) မူ

1. **Round trip:** MusicXML → doc → command များ → MusicXML → Notation Engine render — ရလဒ် မပျက်ကြောင်း (ရှိပြီးသား 58 `.musicxml` နမူနာ၊ Notation Engine ၏ test ပုံစံအတိုင်း)။
2. **Invariant test:** ဘယ် command နောက်မဆို §၁(၄) ၏ invariant ၄ ချက် မှန်ကြောင်း (property-style — command အစီအစဉ်ကို ကျပန်းလုပ်စစ်)။
3. **Undo/redo:** command တိုင်း undo → doc အရင်နှင့်တူ၊ redo → doc အသစ်နှင့်တူ။
4. **MuseScore parity:** §၂ ၏ ဇယားအတိုင်း key တစ်ခုချင်းစီကို Editor-level test (ရှိပြီးသား `editor-integration.test.js` ပုံစံ) ဖြင့်စစ်။
5. အပြုအမူ မပြောင်းသော ရွှေ့ပြောင်းမှု (W5) အတွက် — ရှိပြီးသား test အားလုံး (ယခု ၁၀၄ ခု+) pass ဆက်ဖြစ်။

---

## ၆။ Work package များ (OpenHands အတွက်၊ အစဉ်လိုက်)

| WP | အလုပ် | ပြီးစီးမှု စံနှုန်း |
|---|---|---|
| **W1** | ✅ **ဆုံးဖြတ်ပြီး (user, 2026-11-27)** — Key map ကို MuseScore နှင့် အတိအကျ တူအောင်ပြင်မည် | — |
| **W2** | ✅ **ပြီးစီး (2026-11-27)** — `↑`/`↓` semitone (တက်=♯၊ ဆင်း=♭)၊ `Alt+Shift+↑`/`↓` diatonic၊ `Ctrl+↑`/`↓` octave၊ `R` repeat၊ `0` rest၊ `Backspace` input mode တွင် နောက်ဆုံး note ပြန်ဖျက်၊ `Esc` input mode မှ ထွက် | `editor-integration.test.js` ၏ «the MuseScore key map» suite (key တစ်ခုချင်း) pass၊ suite တစ်ခုလုံး 1536/1536 pass |
| **W3** | ✅ **ပြီးစီး (2026-11-18)** — Tuplet (triplet၊ quintuplet … `Ctrl+2`–`9`); `Rest` တွင် tuplet endpoint ထည့်၍ Engine က rest ပါ group ကို render နိုင်၊ doc command (`insertTuplet`၊ `tupletMemberDuration`၊ `tupletMarksOf`)၊ toolbar panel | Triplet ရေး၍ render မှန်၊ MusicXML round trip၊ undo/redo၊ invariant — `npm run verify` 1544/1544 pass |
| **W4** | ✅ **ပြီးစီး (2026-11-18)** — `Alt+1–9` interval၊ `J` enharmonic၊ `Shift+←/→` beat ရွှေ့၊ `Q`/`W` duration၊ `T` tie၊ `S` slur၊ `Ctrl+B` bar ထည့် | §၂ ဇယားတွင် 🟡/❌ → ✅ (Beam, chord symbol, flip မှလွဲ၍)၊ `editor-integration.test.js` ၏ key map suite pass၊ စုစုပေါင်း 1552/1552 pass |
| **W5** | **Writer Engine ကို သီးခြား folder/module သို့ ခွဲထုတ်** — `notation-doc.js` + `notation-editor.js` ၏ command logic ကို pure command အဖြစ်ရွှေ့၊ Editor က import သုံး | အပြုအမူ မပြောင်း (ရှိပြီးသား test အားလုံး pass)၊ Engine ကို DOM မပါဘဲ Node ထဲ test လုပ်နိုင် |
| **W6** | ရေးစဉ် **အသံကြား** — note ထည့်သည်နှင့် Sound Engine က ဖွင့် (MuseScore ကဲ့သို့)၊ drum / pitched နှစ်မျိုးလုံး | note ရေးတိုင်း ချက်ချင်းအသံထွက်၊ အသံ delay ရည်မှန်း ~၁၀၀ ms အောက် |
| **W7** | Tier 2 — lyrics UI (`Ctrl+L`)၊ staff / tempo text (`Ctrl+T` / `Alt+Shift+T`)၊ chord symbol (`Ctrl+K`)၊ flip (`X`)၊ articulation key များ | §၂ ဇယားအတိုင်း |
| **W8** | Beam ထိန်း (auto beam မှန်ကန်ကြောင်း စစ် + beam properties) | meter အလိုက် auto beam မှန် |
| **W9** | Percussion input (MuseScore ပုံစံ percussion panel)၊ Drum ရေးခြင်းအတွက် `Inst.` box နှင့် ညှိ | Drum note ကို panel / key / MIDI ဖြင့်ရေး၊ ပုံ/အသံ ဆက်ကိုက် |
| **W10** | Tab (Guitar) ပြည့်စုံစွာ ရေး — staff နှင့် Tab တစ်ပြိုင်တည်း (A4 နှင့် ဆက်စပ်) | staff note ရေးလျှင် Tab ပါ၊ Tab fret ရေးလျှင် staff ပါ |
| **W11** | Doc — Writer Engine Doc (API၊ invariant၊ key map) နှင့် ဤ Plan | Doc/Plan folder များရှိ၊ Doc index တွင် link |

**အကြံပြုအစဉ်:** W1 → W2 → W3 (tuplet) → W4 → W5 (ခွဲထုတ်ခြင်း) → W6 (အသံ) → W7 …။ W5 ကို အလယ်တွင် ထားသည်မှာ command အသစ်များ (W3, W4) ကို Engine ထဲ မရေးမီ ပုံစံတူအောင်ထားပြီး၊ ပြီးမှ တစ်ခါတည်း ရွှေ့ရန်။ (ဖြစ်နိုင်လျှင် W3 / W4 ကိုပင် ခွဲထုတ်ပြီးသော Engine ထဲမှာ ရေးသင့်သည်ဟု ယူလျှင် W5 ကို W1–W2 ၏ နောက် ချက်ချင်း ရွှေ့ပါ။)

---

## ၇။ မဖြေရှင်းရသေးသော အချက်များ (user ဆုံးဖြတ်ရန်)

1. (ဖြေပြီး) **Key map ကို MuseScore နှင့် အတိအကျ တူအောင် ပြင်မည်** (user, 2026-11-27) — W2 တွင် ပြီးစီး။

   (ဖြေပြီး) **`1`–`7` duration နံပါတ်များ** — W2b တွင် MuseScore 4 အတိုင်း (`1`=64th … `5`=quarter … `7`=whole) ပြောင်းပြီး။ ယခင် သုံးနေသူများ၏ လက်ကျင့်ကို ပြင်းထန်စွာ ထိမည်ဖြစ်၍ release note တွင် ဖော်ပြရမည်။
2. (ဖြေပြီး) **Tuplet** ကို Notation Engine က render လုပ်နိုင်ပြီလား — W3 တွင် စစ်ပြီး: `Rest` တွင် endpoint မရှိသဖြင့် rest ပါ group ကို မဆွဲနိုင်ခဲ့။ `Rest` တွင် `tupletStart`/`tupletStop` ထည့်ပြီး ဖြေရှင်းခဲ့သည် (2026-11-18)။
3. **MuseScore source ကို မကူးဘဲ handbook အပြုအမူကိုသာ ရည်ညွှန်း** ဟူသော စည်းမျဉ်း (`AGENTS.md`) ကို လိုက်မလား၊ ဒါမှမဟုတ် အစောပိုင်းပြောသလို MuseScore code ကို ထည့်သုံးမလား (license / legal ပါ)။
4. **ပထမ release တွင် Tier 1 အပြည့်** လိုမလား၊ Tier 1 ၏ တစ်စိတ်တစ်ပိုင်းဖြင့် ရောင်းချမှု/ရေးသူများအတွက် စမလား။
5. **Phone / touch** တွင် ရေးပုံ — Inst. box (piano key / drum pad / fret) ကို အဓိကထား၍ keyboard shortcut မလိုဘဲ ရေးနိုင်ရမည်ဟု ယူဆထားသည်၊ အတည်ပြုရန်။

---

## ၈။ နယ်နိမိတ် — Video နှင့် ဆက်စပ်သည့် အပိုင်းများ

ဤ Plan သည် **ရေးခြင်း** ကိုသာ ပိုင်သည်။ အောက်ပါအရာများသည် video ၏ အလုပ်ဖြစ်သဖြင့် [Video Engine Plan](../../Video/Video%20Engine%20Plan/PLAN.md#writer-engine-မှ-ဆင်းသက်လာသော-video-side-လိုအပ်ချက်များ--2026-11-26) တွင် သီးခြား ထားသည် —

| အရာ | ပိုင်ရှင် | ဤ Plan တွင် |
|---|---|---|
| Tuplet / Tab ၏ geometry ကို exported frame ထဲ ဆွဲခြင်း | Notation Engine (ဆွဲ) + Video Engine (frame ပေါင်းခြင်း) | W3 / W10 ၏ render-side လိုအပ်ချက်သာ |
| ရေးစဉ် အသံကြားခြင်း | Sound Engine | W6 (လိုအပ်ချက်သာ) |
| Frame layout / band အချိုး / Thank You | Video Engine | မပါ |
| MusicXML export | Writer Engine (command) + Notation Engine (`writeMusicXml`) | ပါ (§၅ round trip) |

---

## ၉။ စတင်ရန် အခြေအနေ

- ဤ Plan ကို user "ready" ဟု ပြောမှသာ W1 ကို စတင်မည်။
- ကုဒ် မရေးရသေးပါ။ ဤဖိုင်သည် Plan သာ ဖြစ်သည်။
