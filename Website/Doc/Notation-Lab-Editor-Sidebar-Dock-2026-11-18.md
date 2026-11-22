# Notation Lab Editor — Sidebar Dock, Properties and Instruments

**Date:** 2026-11-18
**Route:** `Website/Website/notation-editor.html`

## လုပ်ခဲ့သည့်အလုပ်

Editor တွင် score ဘေးက panel က marks palette တစ်ခုတည်း ဖြစ်ခဲ့သည်။
ရွေးထားသည့် note ၏ အချက်အလက် (pitch, duration, voice, measure, marks,
dynamic) နှင့် score ထဲရှိ တူရိယာများကို ကြည့်ရန် နေရာ မရှိခဲ့ပါ —
အချက်အလက်တွေက status line ထဲမှာ တစ်ကြောင်းတည်း ပေါ်ပြီး ပျောက်သွားသည်။

Sidebar ကို **dock** အဖြစ် ပြောင်းပြီး panel သုံးခု ထည့်ထားသည်။

| Panel | ပြသည့်အရာ |
|---|---|
| Palettes | ယခင် marks palette အတိုင်း (articulations, ornaments, dynamics, fermata) |
| Properties | ရွေးထားသည့် event ၏ pitch, duration, voice, measure, marks, dynamic, lyrics |
| Instruments | score ၏ part များ၊ ရေးနေသည့် part ကို `aria-current` ဖြင့် မှတ်၊ row ကို နှိပ်လျှင် part ပြောင်း |

## Implementation detail

- **Rail = tablist။** `role="tablist"` အောက်တွင် `role="tab"` သုံးခု၊
  တစ်ခုချင်းက `aria-controls` ဖြင့် မိမိ panel ကို ညွှန်ပြီး panel က
  `aria-labelledby` ဖြင့် ပြန်ညွှန်သည်။ Panel တစ်ခုသာ ပေါ်သည်
  (`hidden` ဖြင့် ဖျောက်သည်၊ CSS `display:none` က လိုက်နာသည်)။
- **Roving tabindex။** ရွေးထားသည့် tab သာ `tabindex="0"`၊ ကျန်က `-1`။
  `ArrowDown`/`ArrowUp` က rail ပေါ်တွင် အဝိုင်းလှည့် ရွေ့သည်။
  Keydown handler က `preventDefault()` + `stopPropagation()` ခေါ်သည် —
  score ရဲ့ Up/Down က note ကို transpose လုပ်သဖြင့် rail ပေါ်မှာ
  မခွဲထားလျှင် နောက်က note ပါ ရွေ့သွားမည်။
- **Toggle။** Bottom bar ရဲ့ ယခင် "Palette" ခလုတ်ကို "Sidebar" ခလုတ်
  အဖြစ် ပြောင်း (`data-editor-sidebar-toggle`, `aria-expanded`,
  `aria-pressed`, `aria-controls="editor-sidebar"`)။ ပြန်ဖွင့်လျှင်
  နောက်ဆုံး ကြည့်ခဲ့သည့် panel ကို ပြန်ပြသည်။
- **Properties က render တိုင်း sync ဖြစ်သည်။** `syncProperties()` ကို
  `render()` ထဲမှ ခေါ်သဖြင့် note ရေး/ရွေ့/ဖျက်/undo အားလုံးတွင်
  readout လိုက်ပြောင်းသည်။ ရွေးမှု မရှိလျှင် `Select a note to see its
  properties.` ပြသည်။ Selection တစ်ခုထက် ပိုလျှင် `N events selected`
  hint ထည့်သည်။
- **Instruments ကို signature ဖြင့် ပြန်ဆွဲသည်။** Part စာရင်း
  (`id:name:percussion`) မပြောင်းလျှင် DOM ကို မထိဘဲ `aria-current`
  ကိုသာ update လုပ်သည် — render တိုင်း list ကို ဖျက်ပြန်ဆောက်လျှင်
  keyboard focus ပျောက်မည်။ Percussion part တွင် `Percussion` badge ပါသည်။
- **Responsive။** `≤860px` တွင် dock က score အပေါ် တစ်တန်းလုံး ယူပြီး
  (`order:-1`, `flex-direction:column`) rail က အလျားလိုက် row ဖြစ်သည်။
  ထို breakpoint တွင် palette label များ ဖျောက်ပြီး glyph သာ ပြသည်။
- **CSS cache key။** `styles.css` နှင့် `notation-editor.js` ပြောင်းသဖြင့်
  page လေးခုလုံးတွင် `?v=sidebar-dock-20261118` သို့ bump လုပ်ထားသည်။

## ပူးတွဲ ပြောင်းလဲမှု — page mode ကို sheet များအဖြစ် ပြခြင်း

Editor က engine ကို `page.gapBetweenPages: 3`, `page.verticalJustify: true`
ဖြင့် ခေါ်သည်။ ရလဒ်အနေဖြင့် စာမျက်နှာများ အကြား ကွက်လပ် ပေါ်လာပြီး
စာမျက်နှာတစ်ခုစီ၏ system များက အောက်ဘက် margin အထိ ဖြန့်ကျက်သည်။
Engine ဘက်တွင် `Page.top` နှင့် `PageSystem.y` က တည်နေရာကို
ပိုင်ဆိုင်သဖြင့် renderer က ပြန်တွက်စရာ မလိုတော့ပါ။ အသေးစိတ်ကို
`Notation/Notation Plan/PLAN.md` ၏ "Page sheets and vertical
justification" မှတ်တမ်းတွင် ကြည့်ပါ။

## ပြောင်းခဲ့သည့် ဖိုင်များ

- `Website/Website/notation-editor.html` — sidebar dock markup, bottom bar toggle, favicon link
- `Website/Website/notation-editor.js` — `SIDEBAR_PANELS`, `showSidebarPanel()`, `stepSidebarPanel()`, `setSidebar()`, `syncProperties()`, `syncInstruments()`
- `Website/Website/styles.css` — `.editor-sidebar*`, `.editor-properties*`, `.editor-instruments*`, light theme, `≤860px` layout
- `Website/Website/assets/logo/m-sharing-mark.svg` — favicon (square mark)
- `Website/Website/{index,notation,notation-editor,studio}.html` — favicon link
- `Website/Notation/Notation Engine/test/unit/editor-integration.test.js` — "the sidebar dock" suite (test ၅ ခု)

## စမ်းသပ်စစ်ဆေးမှု

- `npm run verify` (typecheck + lint + format:check + docs:check +
  fixtures:check + build + tests) — **1341/1341 pass**။
- Headless Chromium (1440×900, local server):
  - dock က Palettes ဖြင့် ဖွင့်လာသည်၊ panel တစ်ခုသာ ပေါ်သည်
  - `ArrowDown` သုံးခါ → properties → instruments → palettes (အဝိုင်းလှည့်)
  - Note ရေး → Properties တွင် `pitch=D5, duration=Quarter, voice=1, measure=1`
  - `ArrowUp` → `pitch=E5`, status `Moved up 1 step.` (rail က key ကို မစားလောင်သည်)
  - Palette မှ `ff` နှိပ် → Properties ၏ dynamic `ff`
  - `Escape` → selection ရှင်းပြီး readout ပြန်ဖျောက်
  - Instruments → `Music` တစ်ခု၊ `aria-current="true"`
  - 420px viewport → dock အပေါ်တွင်၊ rail အလျားလိုက်၊ horizontal overflow မရှိ
  - Page mode တွင် `rect[data-page="0"]` တစ်ခု၊ viewBox `0 0 30 42`
  - Console/page error မရှိ၊ network 404 မရှိ (favicon ထည့်ပြီးနောက်)

## သတိပြုရန် / မပြီးသေးသည့်အလုပ်

- Properties သည် ယခု **ပြင်နိုင်** ပြီ ဖြစ်သည် — pitch (step/octave)၊
  duration၊ voice နှင့် staff တို့သည် `commit()` လမ်းကြောင်းအတိုင်း
  ရေးသွားသဖြင့် undo တစ်ချက်ဖြင့် ပြန်နိုင်သည်။
- Page / Horizontal view switch ကို အောက်ခြေ bar ၏ View အပိုင်းတွင်
  ခလုတ်နှစ်ခုဖြင့် ပေးထားပြီး၊ တူညီသော document ကို နည်းလမ်းနှစ်မျိုး
  ဖြင့် ပြန်ဆွဲသည်။
- Sidebar ၏ ဖွင့်/ပိတ် အခြေအနေနှင့် နောက်ဆုံး panel ကို
  `notation-lab-sidebar` key ဖြင့် မှတ်ထားသည်၊ page ပြန်ဖွင့်လျှင်
  ထိုအတိုင်း ပြန်လာသည်။

## Lyrics — ထပ်တိုး 2026-11-18

Properties တွင် **lyrics** ရေးနိုင်ပြီ။ Engine သည် `<lyric>` ကို parse,
render, write လုပ်နိုင်ပြီးသား ဖြစ်ခဲ့သည် (Phase 55)၊ Editor ဘက်တွင်
ချိတ်ရုံသာ ကျန်ခဲ့သည်။

- `notation-doc.js` — `setLyric(doc, cell, { verse, text })`။ Syllable သည်
  **note** ပေါ်တွင် ရှိသည်၊ event ပေါ်တွင် မဟုတ်၊ ထို့ကြောင့် chord တစ်ခုတွင်
  member အားလုံးက syllable တူတူ ရသည် (renderer က tick တူသော member များကို
  syllable တစ်ခုအဖြစ် ပေါင်းပြီးသား)။ Text ဗလာဖြစ်လျှင် verse ကို ဖျက်သည်
  — `<text></text>` သည် syllable မဟုတ်၊ row တစ်ခု မလိုအပ်ဘဲ ယူထားမည့်
  ကွက်လပ်သာ ဖြစ်သည်။
- Hyphen ကို `<syllabic>` အဖြစ် အလိုအလျောက် ပြောင်းသည် — အဆုံးတွင် `-`
  ဆိုလျှင် `begin`၊ အစတွင် `-` ဆိုလျှင် `end`၊ နှစ်ဖက်လုံးဆိုလျှင် `middle`။
  ထို့ကြောင့် စာရိုက်သူသည် element ကို မသိဘဲ မှန်ကန်စွာ ရေးနိုင်သည်။
- `notation-editor.js` — Properties တွင် verse တစ်ခုလျှင် row တစ်ခု၊
  နောက်ဆုံး row သည် အမြဲ ဗလာ (verse အသစ်အတွက်)။ Enter နှိပ်လျှင်
  commit လုပ်ပြီး focus ကို score သို့ ပြန်ပို့သည်။
- Test: `editor-integration.test.js` — syllable → `<lyric>` + undo၊ verse
  နှစ်ခု၊ ဗလာပြန်လုပ်လျှင် verse ပျောက်။ `npm run verify` = **1512/1512**။
- Browser E2E: staff click → note၊ Properties → `Twin-` ရိုက် → SVG တွင်
  `Twin` ပေါ်လာ၊ page error မရှိ။
