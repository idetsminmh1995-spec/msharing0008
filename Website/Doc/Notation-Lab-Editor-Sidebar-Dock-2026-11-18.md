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
ဖြင့် ခေါ်သည်။ ရလဒ်အနေဖြင့် စာမျက်နှာများ အကြား ကွက်လွတ် ပေါ်လာပြီး
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
  ကွက်လွတ်သာ ဖြစ်သည်။
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

## MIDI input — ထပ်တိုး 2026-11-18

အောက်ခြေ bar တွင် **MIDI** ခလုတ် တစ်ခု ထပ်ထည့်ထားသည်။ နှိပ်လျှင်
`navigator.requestMIDIAccess()` ကို ခေါ်ပြီး၊ ချိတ်ထားသည့် keyboard မှ
note-on တစ်ခု လာတိုင်း `insertAtEntry()` ဖြင့် ရေးသည် — staff click
နှင့် လက်ကွက် letter နှိပ်ခြင်း သုံးမျိုးလုံး တူညီသော command တစ်ခုကို
ဖြတ်သွားသည်။

- **Chord ကို အလိုအလျောက် သိသည်။** Key နှစ်ခု တစ်ပြိုင်နက် ဖိ (note-off
  မရောက်သေး) လျှင် ဒုတိယ key သည် ထို beat ပေါ်တွင် stack လုပ်သည်။
  Key အားလုံး လွှတ်လိုက်လျှင် cursor သည် နောက် beat သို့ ရွေ့သည်။
  ထို့ကြောင့် C-E-G ကို တစ်ချက်တည်း ဖိ၍ triad တစ်ခု ရသည်၊ mode ကို
  ကြိုတင် ရွေးထားရန် မလိုပါ။
- **Key signature က spelling ကို ဆုံးဖြတ်သည်။** MIDI သည် နံပါတ်သာ
  ပို့သည်၊ letter မပါ။ ထို့ကြောင့် 61 သည် D major တွင် C#၊ E-flat တွင်
  Db ဖြစ်သည် — လက်ရှိ key ၏ alter ကို ဖတ်ပြီး ဆုံးဖြတ်သည်။
  ရလဒ်အနေဖြင့် မလိုအပ်သော accidental များ မပေါ်ပါ။
- **Drum kit ကို လိုက်နာသည်။** Kit part တွင် key ၏ GM note နှင့် ကိုက်ညီသော
  drum ကို ရေးသည် (36 = Bass Drum 1၊ 38 = Acoustic Snare)။
- **Note input ပိတ်ထားလျှင် မရေးပါ။** ပထမ key တစ်ချက်တွင် "Turn note
  input on (N)" ဟု တစ်ခါသာ အသိပေးသည်။
- **Browser မပံ့ပိုးလျှင် / ငြင်းလျှင်** status line တွင် ပြောပြီး ခလုတ်ကို
  ပိတ်ထားသည်၊ editor ကို လက်ဖြင့် ဆက်ရေးနိုင်သည်။
- Test: `editor-integration.test.js` — access on/off၊ key → note၊
  ထပ်နေသော key → chord၊ key signature spelling၊ drum kit၊
  note-input guard၊ Web MIDI မရှိခြင်း၊ ငြင်းခံရခြင်း။

## Guitar staff ↔ Tab တစ်ပြိုင်တည်း — 2026-11-18

Guitar part တစ်ခုကို notation staff (staff 1) နှင့် tab staff (staff 2)
နှစ်ခုအဖြစ် ပုံနှိပ်သောအခါ တစ်ခုတည်းသော တူရိယာ၏ တစ်ခုတည်းသော ဂီတကို
staff နှစ်ခုတွင် ရေးထားသည်။ ထို့ကြောင့် တစ်ခုတွင် ရေးသည်များ ကျန်တစ်ခုတွင်
ပါ ပေါ်ရမည်။

**စစ်ဆေးပြီး ရလဒ် (2026-11-18):**

- ✅ **ရေးခြင်း** — fretboard မှ ရေးလျှင်၊ staff ကို နှိပ်၍ ရေးလျှင်၊
  letter key နှိပ်၍ ရေးလျှင် staff နှစ်ခုလုံး ရသည်။ Fretboard မှ
  ရေးသော note သည် string/fret ကို ထိန်းထားသည်။
- ✅ **ဖျက်ခြင်း** — Delete လုပ်လျှင် staff နှစ်ခုလုံး ရှင်းသည်။
- ✅ **Staff ရွှေ့ခြင်း** — Properties ၏ Staff field ဖြင့် ရွှေ့နိုင်သည်။

**တွေ့ရှိပြီး ဖြည့်ခဲ့သော ကွက်လွတ် (ယခု ပြင်ပြီး):** ရေးခြင်းသာ
တွဲထားခဲ့သည်။ **ပြင်ဆင်ခြင်း** မတွဲပါ — Properties တွင် pitch သို့မဟုတ်
duration ပြောင်းလျှင်၊ palette မှ accidental တင်လျှင်၊ arrow key သို့မဟုတ်
drag ဖြင့် transpose လုပ်လျှင် ရေးထားသည့် staff တစ်ခုတည်းသာ ပြောင်းပြီး
tab သည် အဟောင်းကို ဆက်ပြသည်။ ထို beat သည် staff နှစ်ခုတွင် မတူညီသော
note နှစ်ခု ဖြစ်သွားသည်။

- `notation-editor.js` — `mirrorCounterpart()` အသစ်။ တစ်ခုတည်းသော event ကို
  `pairedStaffFor()` က ပြသည့် ကျန်တစ်ခုသို့ ကူးသည်။ Event ကို
  tick+staff ဖြင့် ရှာသည် (index မဟုတ်) — duration ပြောင်းလျှင် voice ကို
  ပြန်ဖြည့်သဖြင့် index ရွေ့သွားနိုင်သည်။
- `counterpartEvent()` တွင် `rederiveTab` option။ ရေးခြင်းတွင် ရေးသူ
  ရွေးထားသော string/fret ကို လေးစားသည်။ သို့သော် **pitch ပြင်လျှင်**
  ထို string/fret သည် pitch အဟောင်းကို ဖော်ပြသည်၊ ထို့ကြောင့်
  `tabPositionFor()` ဖြင့် pitch အသစ်မှ ပြန်တွက်သည်။
- ချိတ်ထားသော path များ: Properties pitch (`setNotesPitch`), Properties
  duration (`setEventDuration`), palette accidental, arrow-key transpose,
  drag transpose။
- Test: `editor-integration.test.js` — လေးခု အသစ် (pitch, duration,
  accidental, transpose)၊ တစ်ခုစီသည် staff နှစ်ခုလုံး ကိုက်ညီမှုနှင့် tab ၏
  fret အသစ်ကို စစ်သည်။ Full suite **1524/1524**။
- Browser E2E (real Chromium): fretboard → E4၊ Properties → G4၊ duration →
  half၊ palette → G#4၊ ArrowUp → A#4 — အဆင့်တိုင်း staff နှစ်ခုလုံး
  ကိုက်ညီ၊ page error မရှိ။

## Palette စာရင်း MuseScore 4 နှင့် ကိုက်ညီအောင် ပြင်ခြင်း — 2026-11-18

Plan ၏ အဆင့် ၃ တွင် ကျန်ရှိသည့် palette အလုပ်ကို လုပ်ပြီးပါပြီ။

**ပြောင်းခဲ့သည်များ**

- **Pitch** အုပ်စု အသစ် — 8va၊ 8vb၊ 15ma၊ 15mb။ MusicXML တွင်
  `type` သည် notation ရွေ့ရာဘက်ကို ဆိုလိုသဖြင့် 8va = `down` (size 8)၊
  8vb = `up` (8)၊ 15ma = `down` (15)၊ 15mb = `up` (15)။
- **Pedal → Keyboard** အမည်ပြောင်း (MuseScore ၏ အုပ်စုအမည်အတိုင်း)။
- **Breaks & spacers → Layout** အမည်ပြောင်း။
- **Default ၁၃ ခု** ကို MuseScore အစီအစဉ်အတိုင်း ပြန်စီသည် —
  Clefs၊ Key signatures၊ Time signatures၊ Tempo၊ **Pitch**၊ Accidentals၊
  Dynamics၊ Articulations၊ Text၊ **Keyboard**၊ Repeats & jumps၊ Barlines၊
  **Layout**။ `Ornaments` နှင့် `Lines` သည် catalogue ထဲ ရှိနေဆဲ၊
  Add Palettes ဖြင့် ပြန်ထည့်နိုင်သည်။

**ကုဒ်**

- `notation-doc.js` — `setOctaveShift()` အသစ်။ Start/stop အတွဲကို
  တစ်ခါတည်း ရေးသည်၊ `staff`+`number` ဖြင့် ချိတ်သည်။ ထို beat တွင်
  bracket တစ်ခု ရှိပြီးသားဖြစ်လျှင် ၎င်း၏ stop ပါ ဖျက်ပြီး
  toggle အဖြစ် ပြုမူသည်။ Stop ကို bar ၏ အဆုံးတွင် ထားသည်။
- `notation-editor.js` — `applyOttava()` နှင့် `pitch` palette အုပ်စု။
  `pedal` အုပ်စုကို `text` နောက်သို့ ရွှေ့သည် (catalogue အစီအစဉ်သည်
  ပြသသည့် အစီအစဉ်ဖြစ်သည်)။

**စမ်းသပ်စစ်ဆေးမှု**

- Test အသစ်: 8va နှိပ်လျှင် `<octave-shift type="down" size="8" number="1"/>`
  နှင့် ၎င်း၏ `stop` နှစ်ခုလုံး ရေးသည်၊ ပြန်နှိပ်လျှင် နှစ်ခုလုံး ပျောက်သည်။
- Group-order test ကို အစီအစဉ်အသစ်အတိုင်း ပြင်သည်။
- Full suite **1525/1525**၊ typecheck 0၊ lint 0။
- Real Chromium E2E: dock သည် အုပ်စု ၁၃ ခုကို အစီအစဉ်မှန်စွာ ပြ၊
  အမည်များ မှန် (Pitch၊ Keyboard၊ Layout)၊ 8va နှိပ်လျှင် staff ပေါ်တွင်
  bracket ဆွဲသည် (SVG text "8" ပေါ်လာ၊ line ၃ ခု တိုး)၊ ပြန်နှိပ်လျှင်
  ပျောက်၊ page error မရှိ။
