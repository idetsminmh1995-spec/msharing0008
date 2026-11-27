# Writer Engine — W3: Tuplet (triplet, quadruplet …)

**နေ့စွဲ:** 2026-11-18
**Plan:** [`Website/Writer/Writer Engine Plan/PLAN.md`](../Writer/Writer%20Engine%20Plan/PLAN.md) §၂ (နှိုင်းယှဉ်ချက် ဇယား)၊ §၆ (W3)
**ပြင်ဆင်ခဲ့သော ဖိုင်:**

- `Website/Website/notation-doc.js`
- `Website/Website/notation-editor.js`
- `Website/Website/notation-editor.html`
- `Website/Notation/Notation Engine/src/core/rest.ts`
- `Website/Notation/Notation Engine/src/parser/musicxml/parse.ts`
- `Website/Notation/Notation Engine/src/parser/musicxml/write.ts`
- `Website/Notation/Notation Engine/src/render-from-musicxml.ts`
- `Website/Notation/Notation Engine/test/unit/editor-integration.test.js`
- `Website/Notation/Notation Engine/test/unit/slur-tuplet-wiring.test.js`
- `Website/Notation/Notation Engine/test/visual/__snapshots__/render-from-musicxml-slur-tuplet.snap`
- `Website/Website/assets/notation-engine.js` (build မှ ထုတ်သည်)

---

## ၁။ ရည်ရွယ်ချက်

MuseScore ၏ `Ctrl+2`–`Ctrl+9` အတိုင်း tuplet ရေးနိုင်ရန်။ ကုဒ်မရေးမီ Plan §၇ ၏
မေးခွန်း ၂ — «Tuplet ကို Notation Engine က render လုပ်နိုင်ပြီလား» — ကို အရင်စစ်ခဲ့သည်။
အဖြေ: **တစ်စိတ်တစ်ပိုင်း**။ `note.ts` တွင် `tupletStart` / `tupletStop` ရှိပြီး
`render-from-musicxml.ts` ၏ §9.17 tuplet pass က ဆွဲနိုင်ပြီးသား၊ သို့သော် —

1. `Rest` တွင် tuplet endpoint field မရှိ။ ၎င်းကြောင့် **rest ဖြင့် စ / ဆုံး** သော
   tuplet (ဗလာ group၊ ဒါမှမဟုတ် အလယ်တွင် အနားရှိသော triplet) ကို render မဆွဲနိုင်ခဲ့။
2. `parse.ts` / `write.ts` က rest ၏ `<tuplet type="start|stop"/>` ကို မဖတ်၊ မရေးခဲ့။

ထို့ကြောင့် W3 တွင် Engine ဘက်ကို အရင်ဖြည့်ပြီး၊ မှ Editor/doc command ကို ချိတ်သည်။

## ၂။ Notation Engine ဘက်

- `src/core/rest.ts` — `Rest` နှင့် `RestInit` တွင် `tupletStart?` / `tupletStop?` ထည့်သည်။
  Tuplet သည် **beat** အုပ်စုဖြစ်၍ pitch မလိုသဖြင့် rest ကလည်း endpoint ကို ကိုင်သည်။
- `src/parser/musicxml/parse.ts` — rest ကို ဆောက်သောအခါ notations မှ tuplet marks ကို ကူးသည်။
- `src/parser/musicxml/write.ts` — `restXml()` က fermata နှင့် tuplet endpoint နှစ်မျိုးလုံးကို
  `<notations>` ထဲ တွဲရေးသည် (round trip အတွက်)။
- `src/render-from-musicxml.ts`
  - `renderNoteOrRest()` က `spanAnchor` (rest အတွက်ပါ) ပြန်ပေးသည်။ ယခင် `tieAnchor`
    က note-only ဖြစ်သဖြင့် rest ပါသော tuplet ကို anchor မရခဲ့။
  - `tupletMarksOf(event)` — note / rest / chord သုံးမျိုးလုံးမှ endpoint နှင့် ratio ကို ဖတ်သည်။
    Slur က `spanSourceNote()` (rest ကို ကျော်) ကို ဆက်သုံးသည် — tuplet ကသာ ကွဲသည်။
  - `anchorByIndex` ကို `spanAnchor` မှ ဖြည့်သည်။ Tie က pitch လိုသဖြင့် note-only အတိုင်း။

ရလဒ်: rest ဖြင့် စသော tuplet တွင် bracket/number က အပေါ်ဘက် (rest အတွက် 'up')
ဆွဲပြီး၊ `slur-tuplet` visual snapshot ပြောင်းသွားသည် (bracket y 7.3 → 7.8၊ အောက်သို့ 0.5)။
ဤသည်မှာ ရည်ရွယ်သော ပြောင်းလဲမှုဖြစ်၍ snapshot ကို `UPDATE_SNAPSHOTS=1` ဖြင့်
အတည်ပြုခဲ့သည်။

## ၃။ Doc layer (`notation-doc.js`)

- `TUPLET_NORMAL_NOTES` — count → normal-notes (2:3, 3:2, 4:2, 5:4 … 9:8)။
- `tupletMemberDuration(totalTicks, count)` — group တစ်ခုလုံး၏ tick ကို အဖွဲ့ဝင်
  တစ်ခု၏ value အဖြစ် ပြောင်းသည်။ မရေးနိုင်လျှင် (ဥပမာ quarter ပေါ် septuplet) `null`။
- `insertTuplet(doc, { …, count, totalTicks })` — group ကို **rest များ** အဖြစ် ရေးသည်
  (MuseScore က ဗလာ group ကို ထိုသို့ပြသည်)၊ ပထမ member တွင် `tupletStart`၊ နောက်ဆုံးတွင်
  `tupletStop`။ Bar သည် အမြဲ ပြည့်နေရမည် (invariant)။
- `tupletMarksOf(event)` — endpoint marks ကို copy အတွက် ထုတ်ပေးသည်။
- Function လေးခုလုံးကို export ထုတ်သည်။

## ၄။ Editor (`notation-editor.js`, `notation-editor.html`)

- Toolbar တွင် `data-editor-slot="tuplets"` group — trigger button (`aria-haspopup`) နှင့်
  panel။ Panel ကို `buildTupletMenu()` က 2–9 ဖြင့် ဖြည့်သည် (engine က single digit သာ
  ဆွဲနိုင်သည်)။
- `insertTupletCommand(count)` — `Ctrl+2`–`9` နှင့် panel button နှစ်ခုလုံးက ခေါ်သည်။
  လက်ရှိ note value ကို **group တစ်ခုလုံး၏** အရှည်အဖြစ် ယူသည် (MuseScore အတိုင်း)။
  Bar ထဲ မဝင်လျှင်၊ ဒါမှမဟုတ် value မခွဲနိုင်လျှင် ရှင်းလင်းသော status ဖြင့် ငြင်းသည်။
  Guitar part တွင် staff နှစ်ခုလုံးကို တစ်ပြိုင်တည်း ရေးသည်။ Cursor ကို group ၏
  ပထမ member တွင် ချန်ထားသည် — pitch ကို ချက်ချင်း ရိုက်ထည့်နိုင်ရန်။
- `tupletRestAt(tick, staff, voiceId)` — entry cursor ရောက်နေသော beat သည် tuplet rest
  ဖြစ်လျှင် ထို rest ကို **အစားထိုး** ရေးသည် (မခွဲပါ)။ မဟုတ်လျှင် member က ratio နှင့်
  endpoint ကို ဆုံးရှုံးမည်။ `memberDuration` / `memberMarks` ကို rest, pitched note,
  drum note သုံးလမ်းလုံးတွင် သုံးသည်။
- `tupletEndpointMarks(event)` — note / rest / chord (ပထမ note) မှ endpoint ကို ဖတ်ပြီး
  copy/paste နှင့် beat အစားထိုးရေးခြင်းတွင် ထိန်းသည်။
- `Ctrl+Alt+1–4` (voice) ကို အရင်စစ်ပြီးမှ `Ctrl+2–9` ကို စစ်သည် — modifier မတိုက်ရန်။

## ၅။ စမ်းသပ်ခြင်း

`test/unit/editor-integration.test.js`:

- Toolbar label list တွင် `'Tuplets'` ထည့်သည်။
- «the MuseScore key map» suite တွင်:
  - `Ctrl+3` — half group → quarter ၃ လုံး၊ `time-modification` ၃ ခု၊ start/stop တစ်ခုစီ။
  - စာလုံးတစ်လုံး ရိုက်ထည့်လျှင် member value နှင့် marks ကျန်သည်။
  - `Ctrl+4` — 4 in the time of 2 (eighth ၄ လုံး)။
  - မခွဲနိုင်သော `Ctrl+7` (quarter ပေါ်) — ငြင်းသည်၊ ဘာမှ မရေးပါ။
  - undo — tuplet တစ်ခုလုံး တစ်ချက်တည်း ပြန်ပျက်သည်။

`test/unit/slur-tuplet-wiring.test.js` — rest endpoint နှင့် anchor အတွက် စမ်းသပ်ချက်
များ ထပ်ထည့်သည်။

ရလဒ်: `npm run verify` (typecheck + lint + format + build + API doc + unit/visual) — **pass 1544 / fail 0**။

## ၆။ သတိပြုရန်

- ဤ W3 တွင် **tab/paired staff** အတွက် tuplet ကို staff နှစ်ခုလုံး ရေးသည်၊ သို့သော်
  tab တွင် fret ကို group အလိုက် မခွဲပါ။
- Multi-digit tuplet (10+) ကို Engine §9.17 က မပံ့ပိုးသေးသဖြင့် menu တွင် 2–9 သာ။
