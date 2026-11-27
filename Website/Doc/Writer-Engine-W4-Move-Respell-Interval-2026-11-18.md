# Writer Engine — W4: ရွှေ့ခြင်း၊ ပြန်စာလုံးပေါင်းခြင်း၊ Interval နှင့် ကျန် Tier 1 key များ

**နေ့စွဲ:** 2026-11-18
**Plan:** [`Website/Writer/Writer Engine Plan/PLAN.md`](../Writer/Writer%20Engine%20Plan/PLAN.md) §၂ (နှိုင်းယှဉ်ချက် ဇယား)၊ §၆ (W4)
**ပြင်ဆင်ခဲ့သော ဖိုင်:**

- `Website/Website/notation-doc.js`
- `Website/Website/notation-editor.js`
- `Website/Website/notation-editor.html` (build က `?v=` hash ကို ပြန်တွက်သည်)
- `Website/Website/assets/notation-engine.js` (build မှ ထုတ်သည်)
- `Website/Notation/Notation Engine/test/unit/editor-integration.test.js`

---

## ၁။ ရည်ရွယ်ချက်

Plan §၂ ၏ ဇယားတွင် ❌ / 🟡 ဖြစ်နေသော Tier 1 key များကို MuseScore 4 အတိုင်း ဖြည့်ရန်။
ဤ W4 တွင် အောက်ပါတို့ကို လုပ်သည်။

| လုပ်ဆောင်ချက် | MuseScore key | ယခင် | ယခု |
|---|---|---|---|
| Interval ထည့် | `Alt+1`–`9` | ❌ | ✅ |
| Enharmonic ပြောင်း | `J` | ❌ | ✅ |
| Note နေရာရွှေ့ | `Shift+←` / `→` | ❌ | ✅ |
| Duration ထက်ဝက် / ၂ ဆ | `Q` / `W` | ❌ | ✅ |
| Tie | `T` | 🟡 (button သာ) | ✅ |
| Slur | `S` | 🟡 (button သာ) | ✅ |
| Measure ထည့် | `Ctrl+B` / `Ctrl+Shift+B` | 🟡 (menu သာ) | ✅ |

---

## ၂။ Doc layer (`notation-doc.js`)

အပိုင်းအသစ် `// ---- moving, respelling, intervals ----` ကို edit command အုပ်စုတွင် ထည့်သည်။
Command အားလုံးသည် document အသစ်ကို ပြန်ပေး၍ အရင်ကို မပြင်ပါ — Plan §၁(၂) ၏ command မူအတိုင်း။

- **`moveBeats(doc, { partId, measureNumber, voiceId }, indices, direction)`**
  ရွေးထားသော beat များကို ဘေး beat နှင့် လဲလှယ်သည်။ ရွေးထားသော beat အစုကို
  တစ်ခါတည်း (block အဖြစ်) ရွှေ့သည်။ ရွှေ့ပြီးနောက် voice တစ်ခုလုံးကို tick အသစ်
  ပြန်ချထားပြီး (`fillVoice`) bar ကို အမြဲပြည့်နေစေသည် — ထို့ကြောင့် ကြာချိန်မတူသော
  beat နှစ်ခု လဲလှယ်လျှင်လည်း ထပ်နေခြင်း/အပေါက်မရှိ။
  အစွန်းမှ ရွှေ့သည့်အစီအစဉ် (direction > 0 ဆိုလျှင် ညာဘက်မှစ) ကြောင့် ရွှေ့ပြီးသား
  beat ကို နောက်တစ်ခု၏ အိမ်နီးချင်းအဖြစ် ပြန်မကောက်မိစေပါ။
- **`enharmonicSpellings(pitch)` / `respell(pitch)`**
  တူညီသော အသံ (MIDI) ကို ရေးနိုင်သည့် စာလုံးပေါင်းအားလုံးကို စစ်သည်။ အစီအစဉ်က
  အရေးကြီးသည် — sharp တစ်ခုက အနီးဆုံး flat သို့ ဦးစွာပြောင်းသည် (C♯ → D♭)၊
  natural တစ်ခုက single accidental ကို ယူသည် (C → B♯)၊ double accidental ကို
  နောက်ဆုံးမှ ထားသည်။ အသံ လုံးဝမပြောင်း။
- **`pitchAtInterval(pitch, number, clef, fifths)`**
  Interval ကို **စာလုံးအမည်** ဖြင့် ရေတွက်သည် (semitone မဟုတ်)။ `staffPositionForPitch`
  ကို အသုံးပြု၍ နေရာကို တွက်ပြီး `pitchFromStaffPosition` ဖြင့် ပြန်ဖတ်သည်။
  မှတ်စုအသစ်သည် **key signature** ၏ accidental ကို ယူသည် — D major တွင် D အပေါ်မှ
  တတီယာဆည်လျှင် F♯ ရေးသည် (MuseScore အတိုင်း)၊ B♭ major တွင် C အပေါ်မှ တတီယာသည် E♭။
  `Alt+1` = unison၊ `Alt+8` = octave၊ `Alt+9` = ninth။
  `keySignatureAlters(fifths)` က အထောက်အကူ helper ဖြစ်သည်။

ဤ helper လေးခုကို module export စာရင်းတွင် ထည့်ထားသည်။

---

## ၃။ Editor layer (`notation-editor.js`)

### ၃.၁ Command အသစ်များ

- **`targetCells()`** — ရွေးထားသည်ရှိလျှင် selection၊ မရှိလျှင် ကာတာက စွန့်ခဲ့သော
  နောက်ဆုံးရေးသည့် note။ MuseScore က input mode တွင် selection မလိုဘဲ လုပ်ဆောင်သည်။
- **`addInterval(number)`** — chord ၏ **အမြင့်ဆုံး** note ပေါ်မှ ရေတွက်သည် (မလိုဒီက
  သည်ဟု ဖတ်ရသော note)။ Tab note ၏ `stringNumber`/`fret` သည် pitch အဟောင်းကို
  ဖော်ပြသဖြင့် ချန်လှပ်ပြီး `mirrorCounterpart(..., { rederiveTab: true })` က
  ပြန်တွက်စေသည်။ တူညီသော pitch ရှိပြီးသားဖြစ်လျှင် `stackedWith` က `null`
  ပြန်ပေး၍ မထည့်ဘဲ အကြောင်းကြားသည်။
- **`respellSelection()`** — ပြောင်းလဲမှုအစီအစဉ်ကို commit မတိုင်မီ ဖတ်သည်၊
  အကြောင်းမှာ `commit()` က status စာသားကို mutation မလုပ်မီ ရေးသောကြောင့်
  mutation အတွင်း၌ ရေတွက်လျှင် 0 ဖြစ်နေမည်။
- **`moveBeats(direction)`** — selection သည် bar တစ်ခု၊ voice တစ်ခုတည်းဖြစ်ရမည်။
  ဘောင်ကျော်လျှင် «That is the first/last beat of the bar.» ဖြင့် ရပ်သည်။
- **`scaleSelectionDuration(factor)`** — ရွေးထားလျှင် note value ကို ထက်ဝက်/၂ ဆ
  လုပ်သည်။ မရွေးထားလျှင် **ကာတာက ရေးမည့် note value** ကို ရွှေ့သည် — ဤသည်မှာ
  MuseScore ၏ အပြုအမူဖြစ်ပြီး bar ဖြည့်နေစဉ် လက်ဖြင့် ရှာစရာမလို။
- **`appendMeasureCommand()`** — `Ctrl+B`။ bar အသစ်တွင် ကာတာကို ထိုးချထားသည်။

### ၃.၂ Key binding အသစ်များ

Key handler တွင် အောက်ပါတို့ကို ထည့်သည်။ Modifier စစ်ဆေးမှုကို ဂရုတစိုက်
စီစဉ်ထားသည် —

- `Ctrl+Alt+1`–`4` = voice (ရှိပြီးသား) ကို **အရင်** စစ်သည်။
- `Alt+1`–`9` = interval။ `!modifier` ကို တောင်းသဖြင့် voice shortcut နှင့် မတိုက်ပါ။
- `Ctrl+2`–`9` = tuplet (ရှိပြီးသား)။
- `Shift+←`/`→` = beat ရွှေ့သည်။ `!modifier` ကို တောင်းသဖြင့် `Ctrl+Shift+←`
  (range ချဲ့ခြင်း) နှင့် မတိုက်ပါ။
- `T` tie၊ `S` slur၊ `J` respell၊ `Q` ထက်ဝက်၊ `W` ၂ ဆ — အားလုံး `!modifier && !altKey`။
- `Ctrl+B` = bar အဆုံးတွင် ထည့်၊ `Ctrl+Shift+B` = ကာတာရှိရာ bar ရှေ့တွင် ထည့်။

`T` နှင့် `S` ကို `paletteTargets()` အစား `targetCells()` သုံးအောင် ပြောင်းသည် —
သို့မှသာ note ရေးပြီးချက်ချင်း `T` နှိပ်လျှင် အလုပ်လုပ်မည် (toolbar button ကလည်း
ထိုလမ်းကြောင်းကိုပင် သုံးသည်)။ `T` ကို ရွေးထားသော note တစ်ခုတွင် tie စပြီးသားရှိလျှင်
«ဖျက်ခြင်း» အဖြစ် ဖတ်သည်၊ သို့မှသာ ထပ်နှိပ်လျှင် tie တစ်ခုလုံး (start + stop)
ပြန်ဖျက်သည်။

---

## ၄။ စမ်းသပ်ချက်

`test/unit/editor-integration.test.js` တွင် suite နှစ်ခု ထည့်သည်။

### ၄.၁ «the MuseScore key map» suite — key တစ်ခုချင်း

1. `T` — tie ဖန်တီး၊ MusicXML တွင် `<tie type="start"/>` / `<tie type="stop"/>` ရှိ၊
   ထပ်နှိပ်လျှင် နှစ်ခုလုံး ပြန်ဖျက်။
2. `S` — pitch မတူသော note နှစ်ခုကို slur ဆွဲ၊ `<slur type="start" number="1"/>`။
3. `J` — C♯4 → D♭4 (အသံ မပြောင်း)။
4. `Alt+3` / `Alt+5` — C4 ပေါ်မှ third = E4၊ ထို့နောက် E4 ပေါ်မှ fifth = B4
   (chord ၏ အမြင့်ဆုံးမှ ရေတွက်ကြောင်း ပြသည်)၊ သီးခြား page တွင် C4 ပေါ်မှ
   fifth = G4 (semitone မဟုတ်၊ စာလုံးအမည် ဖြစ်ကြောင်း ပြသည်)။
5. `Alt+1` — unison ဖြစ်၍ ဘာမှ မထည့်၊ «That note is already in the chord.» ဖြင့် အကြောင်းကြား။
6. `Shift+→` / `Shift+←` — beat နှစ်ခု တစ်ခါတည်း ရွှေ့၊ bar က rest ဖြင့် စ၊
   ပြန်လာလျှင် C သည် beat 1 သို့ ပြန်။
7. `Shift+←` ကို bar ၏ ပထမ beat တွင် နှိပ်လျှင် ရပ်၍ အကြောင်းကြား။
8. `Q` / `W` — quarter → half → quarter။
9. `Ctrl+B` / `Ctrl+Shift+B` — bar အရေအတွက် တစ်ခုစီ တိုး။

### ၄.၂ «the writer's own commands» suite — doc command တိုက်ရိုက်

1. `moveBeats` — beat နှစ်ခု လဲလှယ်၊ bar ပြည့်နေဆဲ၊ မူရင်း document မပြောင်း (undo အတွက်)။
2. `moveBeats` — selection တစ်ခုလုံး (beat ၂ ခု) ကို block အဖြစ် ရွှေ့။
3. `moveBeats` — bar ၏ နောက်ဆုံး beat တွင် မရွှေ့ (ဘောင်ကျော်လျှင် ဘာမှ မဖြစ်)။
4. `respell` — C♯4 → D♭4 → C♯4၊ MIDI အသံ တူ။
5. `pitchAtInterval` — third/fifth/octave၊ key signature အလိုက် F♯ (D major) နှင့် E♭ (B♭ major)။

ရလဒ်:

- `npm run verify` (typecheck + lint + format + unit + visual) — **1558/1558 pass**၊
  `EXIT=0`။
- Visual snapshot မပြောင်း (ဤ W4 တွင် renderer ကို မထိပါ)။

---

## ၅။ မှတ်ချက် (အသုံးပြုသူ သိရန်)

- `Q` နှင့် `W` သည် selection မရှိလျှင် **note value ကို** ပြောင်းသည် (MuseScore အတိုင်း)။
  ထို့ကြောင့် bar ဖြည့်နေစဉ် `W` နှိပ်လျှင် နောက်ရေးမည့် note ကြီးလာမည်၊ note
  ကို ရွေးထားမှသာ ထို note ၏ ကြာချိန် ပြောင်းမည်။
- `Shift+←`/`→` သည် ယခင် selection ကို ချဲ့သည့် အပြုအမူ မရှိခဲ့ပါ (range ကို
  `Shift+click` ဖြင့် ချဲ့သည်)။ ယခု `Shift+←`/`→` သည် MuseScore ၏ အတိုင်း beat ရွှေ့ခြင်း
  ဖြစ်သည်။
- `Alt+1`–`9` သည် chord ၏ **အမြင့်ဆုံး** note ပေါ်မှ ရေတွက်သည်။ `Alt+1` (unison)
  ကို လက်ရှိ note နှင့် တူညီသောကြောင့် ဘာမှ မထည့်ပါ။
