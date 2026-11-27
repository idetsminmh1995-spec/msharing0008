# Writer Engine — W2: Key Map ကို MuseScore နှင့် ညီစေခြင်း

**နေ့စွဲ:** 2026-11-18
**Plan:** [`Website/Writer/Writer Engine Plan/PLAN.md`](../Writer/Writer%20Engine%20Plan/PLAN.md) §၂ (နှိုင်းယှဉ်ချက် ဇယား)၊ §၃ (W1–W2)
**ပြင်ဆင်ခဲ့သော ဖိုင်:** `Website/Website/notation-editor.js`

---

## ၁။ ရည်ရွယ်ချက်

MuseScore 4 သုံးဖူးသူတစ်ဦး Editor ကို ပြောင်းသုံးလျှင် လက်ကျင့်အတိုင်း ရေးနိုင်ရန်
key map ကို MuseScore နှင့် အတိအကျ တူစေခြင်း။ Plan ၏ W1 ကို user က
"အတိအကျတူစေ" ဟု ဆုံးဖြတ်ပြီးဖြစ်သည်။

## ၂။ ပြောင်းလဲခဲ့သော key များ

| လုပ်ဆောင်ချက် | ယခင် | ယခု (MuseScore 4 အတိုင်း) |
|---|---|---|
| Pitch semitone တက် / ဆင်း | `↑`/`↓` = diatonic step | `↑`/`↓` = semitone (တက် = ♯၊ ဆင်း = ♭) |
| Diatonic step တက် / ဆင်း | မရှိ | `Alt+Shift+↑`/`↓` |
| Octave တက် / ဆင်း | `Ctrl+↑`/`↓` (±7 step) | မပြောင်း (`Ctrl+↑`/`↓`) |
| နောက်ဆုံးရေးသော note ပြန် | `R` = rest | `R` = repeat (selection မရှိလျှင် နောက်ဆုံးရေးသော note) |
| Rest ရေး | `0` နှင့် `R` | `0` သာ |
| နောက်ဆုံးရေးသော note ပြန်ဖျက် | မရှိ (`Backspace` = delete) | `Backspace` (input mode တွင်)၊ ပြင်ပတွင် `Delete` |
| Input mode မှ ထွက် | မရှိ (`Esc` = selection ရှင်း) | `Esc` = input mode ပိတ် + selection ရှင်း |

**အသုံးပြုသူ သတိပြုရန်:** `↑`/`↓`၊ `R`၊ `Backspace` သုံးပုံ ပြောင်းသွားသည်။
Diatonic step လိုလျှင် `Alt+Shift+↑`/`↓`၊ rest လိုလျှင် `0`၊ delete လိုလျှင်
`Delete` ကို သုံးပါ။

## ၃။ ကုဒ် ပြောင်းလဲမှု (`Website/Website/notation-editor.js`)

- `SHARP_SPELLING` / `FLAT_SPELLING` — semitone တစ်ခုကို MuseScore စာလုံးပေါင်းအတိုင်း
  spell ရန် ဇယား (တက် = ♯၊ ဆင်း = ♭)။ `transposeSemitone()` က ၎င်းတို့ကို သုံးသည်။
- `moveSelectedPitch(movePitch, describe)` — ယခင် `transposeSelection` ၏ ကိုယ်ထည်ကို
  ခွဲထုတ်၍ diatonic / semitone / octave သုံးမျိုးလုံး တစ်လမ်းတည်း ဖြတ်သွားစေသည်
  (tab staff ကို `rederiveTab` ဖြင့် လိုက်ပါပြင်ဆင်ခြင်း အပါအဝင်)။
  Selection မရှိလျှင် နောက်ဆုံးရေးသော note ကို ပစ်မှတ်ထားသည်။
- `markWritten()` — note တစ်ခုကို ရှိပြီးသား beat ပေါ် replace လုပ်သောအခါလည်း
  "နောက်ဆုံးရေးသော note" ကို မှတ်ထားရန်။ (ဤမပါလျှင် `R`/`Backspace` က
  မှားသော note ကို ပစ်မှတ်ထားမည်။)
- `lastWrittenCells()`၊ `undoLastWrittenNote()`၊ `previousNoteBefore()` — `Backspace`
  အတွက်။ နောက်ဆုံး note ကို rest အဖြစ် ပြန်ပြီး cursor ကို ထိုနေရာသို့ ပြန်ရွှေ့သည်။
  ထပ်နှိပ်လျှင် ရှေးသော note များသို့ ဆက်လျှောက်သည်။
- `repeatSelection()` — `R` အတွက်။ Selection ရှိလျှင် ၎င်းကို၊ မရှိလျှင် နောက်ဆုံးရေးသော
  note ကို နောက်တစ်ခွက်တွင် ပြန်ရေးသည်။ Bar ကုန်လျှင် နောက် bar သို့ ကူးပြီး
  လိုအပ်လျှင် bar အသစ် ထပ်သည်။ Paste ပြီးနောက် cursor ကို မိတ္တူ၏ နောက်သို့ ရွှေ့သည်။
- `Esc` — input mode ကို ပိတ်ပြီး selection ကို ရှင်းသည်။
- `0` — rest (input mode တွင် rest ရေး၊ ပြင်ပတွင် rest tool လှန်)။
- `R` — modifier မပါမှ repeat (Ctrl+R စသည်ကို မစား)။

## ၄။ စမ်းသပ်ခြင်း

`Website/Notation/Notation Engine/test/unit/editor-integration.test.js`:

- «the MuseScore key map» suite အသစ် — key တစ်ခုချင်း ၆ ခု:
  `Esc`၊ `R`၊ `Backspace` (input mode)၊ `Backspace` (input ပြင်ပ)၊
  `Alt+Shift+↑` နှင့် `Ctrl+↑`၊ selection မရှိဘဲ `↑`/`↓`။
- Guitar suite တွင် `↑` = semitone (♯ / ♭) ဖြစ်ကြောင်း စမ်းသပ်ချက် ၂ ခု ထပ်ထည့်ပြီး
  ယခင် diatonic test ကို `Alt+Shift+↑` သို့ ပြောင်းသည်။

**လက်ရှိ ရလဒ်:** `npm test` — **1536/1536 pass** (ယခင် 1528 + အသစ် ၈)။

## ၅။ မပြောင်းရသေးသော အရာ

- `1`–`7` duration နံပါတ်များသည် MuseScore 4 နှင့် ပြောင်းပြန် ဖြစ်နေသည်
  (Editor: `1`=whole … `7`=64th၊ MuseScore 4: `1`=64th … `7`=whole)။
  ပြောင်းလျှင် လက်ရှိ သုံးနေသူများ၏ လက်ကျင့်ကို ပြင်းထန်စွာ ထိမည်ဖြစ်၍
  user ဆုံးဖြတ်ချက် မရသေးပါ။ Plan §၄ တွင် မေးခွန်းအဖြစ် ချန်ထားသည်။
- `Alt+1`–`9` (interval)၊ `J` (enharmonic)၊ `Shift+←/→` (note နေရာလဲ)၊ `Q`/`W`
  (duration ထက်ဝက်/၂ ဆ)၊ `X` (flip) — W3 နောက်ပိုင်း အလုပ်များ။
