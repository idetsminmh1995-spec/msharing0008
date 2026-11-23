# Video Engine — Implementation Status and Instrument Readiness

Repo: `idetsminmh1995-spec/msharing0008`
Plan review baseline: `main` / `0547011`
Authoritative Video Engine source: `Website/Video/Video Engine/source/website/assets/video-engine.js`
Production copy: `Website/Website/assets/video-engine.js`

## လက်ရှိ Video Engine အခြေအနေ

Video Engine သည် canvas frame များကို WebCodecs ဖြင့် MP4/WebM အဖြစ် render/mux လုပ်ခြင်း၊ MediaRecorder fallback, optional `AudioBuffer`, progress/cancel, memory guard နှင့် cleanup code များကို ပံ့ပိုးသည်။ လက်ရှိ Studio တွင် Drum, Metronome နှင့် Guitar adapter သုံးခုရှိသည်။ Drum export သည် visual-only ဖြစ်ပြီး၊ Metronome adapter က `OfflineAudioContext` ဖြင့် သီးခြားဖန်တီးသော click-track `AudioBuffer` ကို ပေးနိုင်သည်။ Guitar adapter သည် tablature မှ တီးခတ်ပုံကို ဆွဲပြီး အသံမထုတ်ပါ။ Piano, Bass, Strings နှင့် Voice adapter များ မရှိသေးပါ။

## အခြား instrument များ၏ code readiness

| Instrument | Repo ထဲတွင် တွေ့ရသော code | ချိတ်ဆက်ရန်အတွက် အဓိကလိုအပ်ချက် |
|---|---|---|
| **Guitar** | `Website/Guitar/Guitar Engine` တွင် TypeScript source, tests, built bundle, `positionsAt()`, `stageShapes()` နှင့် SVG renderer ရှိသည်။ Note data သည် string/fret/finger/time ကို သီးသန့်လိုအပ်သည်။ | **ချိတ်ပြီး** — `studio-guitar.js` သည် tablature ကို `parseMusicXml` မှ ဖတ်၍ Canvas painter ဖြင့် ဆွဲသည်၊ bundle ကို `Website/Website/assets/guitar-engine.js` မှ load သည်။ Guitar Engine သည် audio မထုတ်ပေးပါ။ |
| **Piano** | `Piano Hand Human Engine` တွင် keyboard geometry, key press/contact curve, performance/finger planning နှင့် synthetic IK source/tests ရှိသည်။ | Piano note event input, renderer, Studio adapter, audio source မရှိသေး။ `Piano 3D Hand Engine` folder သည် `.gitkeep` သာရှိသည်။ Wrist-motion planning မပြီးသေး၊ IK ကို website GLB နှင့် calibrate မလုပ်ရသေး။ ပထမ key-only visual adapter ကိုရည်မှန်းရန်။ |
| **Bass** | Landing page card နှင့် Notation Engine ထဲရှိ bass-clef/MIDI metadata ရှိသည်။ Guitar Engine ထဲတွင် Jazz Bass ပုံ configuration ရှိသည်။ | Bass-specific playable UI, event/audio producer သို့မဟုတ် Video adapter မတွေ့ရ။ Fretted Bass လား keyboard/synth Bass လား ဆုံးဖြတ်ပြီးမှ Guitar Engine ပြန်သုံးနိုင်မှု, input, renderer နှင့် audio policy ကို သတ်မှတ်ရန်။ |
| **Strings** | Landing page card နှင့် Notation Engine ထဲရှိ strings tuning/fretted-instrument metadata ရှိသည်။ | Playable Strings engine/UI/event source/renderer/audio မတွေ့ရ။ Orchestral string family လား fretted-string instrument လား သတ်မှတ်ရန်။ Notation metadata ကို playable renderer ဟု မယူဆရ။ |
| **Voice** | Landing page card နှင့် generic Studio route ရှိသည်။ | Voice-specific source/capture/import controls, renderer, audio decode workflow မတွေ့ရ။ Microphone/file input, permission/privacy/error handling, visual design နှင့် segment-aligned `AudioBuffer` ကို ဆုံးဖြတ်ရန်။ |

### Shared dependency မှတ်ချက်များ

- `Website/Notation/Sound Egnine` သည် `.gitkeep` သာရှိသည်။ Shared audio synthesis/provider ကို လက်ရှိ implementation အဖြစ် မယူဆရ။
- Guitar/Piano package bundle output path များတွင် lowercase `website/assets` ကို အသုံးပြုထားသည့်နေရာရှိသည်။ Repo ၏ production directory သည် case-sensitive `Website/Website/assets` ဖြစ်သောကြောင့် copy/load/check path ကို အရင်ရှင်းလင်းရမည်။
- `AudioBuffer` မပေးလျှင် VideoEngine က visual-only silent video ထုတ်နိုင်သည်။ အသံလိုအပ်သည့် instrument တစ်ခုချင်းစီသည် sound source နှင့် audio/video timing ကို သီးခြားပေးရမည်။

## အကြံပြုထားသော အစီအစဉ်

အသေးစိတ် milestone, shared adapter contract, acceptance criteria နှင့် test sequence ကို [Video Engine Plan](../Video%20Engine%20Plan/PLAN.md) တွင် ထည့်ထားသည်။ အဓိကဦးစားပေးအစီအစဉ်မှာ:

1. နောက်ထပ် instrument များအတွက် shared adapter dispatch/event-time contract သတ်မှတ်ပြီး unsupported tool များကို Drum branch သို့ fall-through မဖြစ်စေရန်။
2. Guitar ကို ပထမချိတ်ဆက်ရန် — ရှိပြီးသား visual engine ကိုသုံးသော်လည်း Studio event source, bundle path, Canvas painter နှင့် photo assets ကို အရင်ဖြည့်ရန်။
3. Piano ကို key-only silent visual adapter အဖြစ်စတင်ရန် — note source နှင့် bundle destination ကို အတည်ပြုပြီး human-hand animation ကို နောက်ပိုင်း သီးခြားလုပ်ရန်။
4. Bass နှင့် Strings အတွက် playable code မရှိသေးသဖြင့် product/instrument definition နှင့် event model ကို အရင်တည်ဆောက်ရန်။
5. Voice ကို source/capture/import နှင့် permission/privacy ဆုံးဖြတ်ချက်ပြီးမှ စတင်ရန်။
6. Audible export ကို အရေးကြီးသည့် requirement အဖြစ် အတည်ပြုပြီးမှ Sound Engine/audio provider, `AudioBuffer`, timing နှင့် codec fallback ကို အကောင်အထည်ဖော်ရန်။

## စမ်းသပ်မှုနှင့် အပြောင်းအလဲမှတ်တမ်း

- ယခင် code commit `d31337a` တွင် MP4 muxer tests 15 ခု၊ cleanup/safety tests 5 ခု၊ Chromium engine smoke test နှင့် Drum Studio browser integration/ffprobe test အောင်မြင်ထားသည်။ Production asset sync check နှင့် 375px/1280px viewport assertions လည်း pass ဖြစ်ထားသည်။
- Metronome implementation သည် Video Engine core ကိုပြင်ခြင်းမဟုတ်ဘဲ Studio အတွက် သီးခြား consumer adapter နှင့် bundle sync ကို ထည့်ထားသည်။ Guitar/Piano/Bass/Strings/Voice ကို Video Engine ဖြင့် render လုပ်ပြီးကြောင်း မဆိုပါ။
- နောက် code implementation တစ်ခုစီပြီးပါက သက်ဆိုင်ရာ engine tests, shared Drum regression, real browser export, silent/audio behavior နှင့် phone/web layout ကို ပြန်စစ်ပြီး Doc/Plan ကို update လုပ်ရမည်။
- **Guitar adapter ချိတ်ပြီး** — `tools/test-guitar-studio-browser.mjs` တွင် tablature ဖတ်ခြင်း၊ ပုံတိုင်း၏ အတိုင်းအတာ၊ Canvas ပေါ်တွင် neck ရှိကြောင်း၊ 375px/1280px layout နှင့် Plan §7 အရှည်စည်းမျဉ်း (score ၂ bar = ၄ စက္ကန့်၊ Thank You clip ၂ စက္ကန့် ဖြင့် ၆ စက္ကန့်) ကို စစ်သည်။ Guitar စာမျက်နှာတွင်လည်း ကိုယ်ပိုင် ၁၂ စက္ကန့် ကန့်သတ်ချက် မရှိတော့ပါ။


## Current Studio settings UI update

The shared left-side Studio control panel now supports MusicXML selection, logo selection, Title 1/Title 2, Drum selection, Notation View, Sound Model, Count Voice text, Video Color, Video Ratio, and Generate Video. The same markup and responsive CSS are intended to be reused by all instrument studio routes.

Implemented behavior:

- `16:9`, `1:1`, and `9:16` selections change the VideoEngine output dimensions.
- Title fields, selected color, notation mode, count label, and an optional logo are drawn into generated frames.
- Drum selection limits which capture pad is active.
- Generate Video re-renders the captured drum event log using the current settings.
- Phone layout collapses the settings fields into a single-column form while preserving the same controls.

Drum-specific limitations: MusicXML and Sound Model/Count Voice behavior follow the status recorded in the Studio history below; Drum export remains visual-only. Metronome has its separate synthesized click-track adapter. Guitar is connected through `studio-guitar.js` with its own tablature reader and Canvas painter; Piano, Bass, Strings and Voice remain unconnected and require their own event/render adapters.

Verification for this update: Studio JavaScript syntax and control-marker checks passed; Video Engine source-to-production sync check passed; existing Video Engine automated tests passed (20/20); Wrangler nested deployment dry-run passed. The public Worker still serves the previous deployment until a commit is pushed and Cloudflare deploy is run.


## Revised Studio control panel

The Kick/Snare/Hi-hat capture boxes were removed from the left panel. The page now generates from an optional MusicXML source or a deterministic default drum pattern. MusicXML and Logo are presented in one desktop row. A custom logo replaces the default `Website/Website/assets/logo/m-sharing-drum-logo.svg`; without a custom file, the M Sharing Drum Logo remains selected automatically.

Title 1 and Title 2 each have independent color and font-size controls. Drum settings are split into Brand text and Model selection. Notation View offers Page Landscape, Page Portrait, and Page Square. Sound Model offers multiple model choices plus volume. Count Voice has Off/On, two count styles, and volume. Video Color is restricted to Black or White, while Video Ratio remains 16:9, 1:1, and 9:16.

The Drum browser integration test clicks Generate Video without drum pads. MusicXML parsing covers plain XML/MusicXML drum notes; `.mxl` archives and Drum sound/count audio remain pending. Metronome click-track audio is generated separately by its adapter as described below.


## Latest control and preview clarification

The redundant default-logo text label was removed. The default logo is now communicated by the visible logo preview only. Drum Brand is a select control. Sound Model and Sound Volume are stacked in the same field, and Count Voice controls retain their On/Off, type, and volume arrangement.

The standard 16:9 export is now `1920×1080`; square and portrait exports are `1080×1080` and `1080×1920`. The video preview stage uses its own fixed 16:9 frame and does not resize based on the loaded video's intrinsic dimensions. Browser regression passed for the 1920×1080 landscape output and the portrait output.


## Metronome Studio — Video Engine ချိတ်ဆက်ပြီး (2026-11-14)

- Create Video ရှိ Metronome card သည် `studio.html?tool=metronome` သို့သွားသည်။ Shared Studio settings form နှင့် Drum adapter ကို Metronome route တွင် မပြဘဲ dedicated `studio-metronome.js` က Metronome configuration ကို ကိုင်တွယ်သည်။ `studio-video.js` သည် Metronome route တွင် Drum renderer မစတင်စေရန် return လုပ်သည်။
- `MetronomeDesigns` bundle ထဲရှိ design 11 မျိုးကို `Website/Metronome/Metronome Engine/tools/sync-metronome-engine.mjs` ဖြင့် `Website/Website/assets/metronome-engine.js` သို့ build/copy/check လုပ်သည်။
- Adapter တွင် design, orientation (16:9/9:16/1:1), quarter-note BPM, time signature နှင့် bars ရွေးနိုင်ပြီး 12 sec အထိ deterministic animated video ထုတ်သည်။ Browser-size canvas သည် 1280×720, 720×1280 သို့မဟုတ် 720×720, 30 FPS ဖြစ်သည်။
- `OfflineAudioContext` မှ bar downbeat accent ပါသော mono click-track `AudioBuffer` ကို adapter ကဖန်တီးပြီး shared Video Engine သို့ပေးသည်။ ဤ click track သည် Sound Engine မဟုတ်ပါ။ WebCodecs/MediaRecorder support အလိုက် MP4 သို့မဟုတ် WebM ထွက်နိုင်သည်။ စမ်းသပ်ထားသော Chromium run တွင် VP8 video နှင့် 48 kHz mono Opus audio ထွက်ခဲ့သည်။
- UI တွင် opening-frame preview, duration-limit validation, progress/cancel, output preview, play/seek/download ပါဝင်သည်။ Metronome card click navigation နှင့် 12-sec limit ကို Chromium integration test ဖြင့်စစ်ထားသည်။

**အတည်ပြုထားသော စမ်းသပ်မှုများ:** Metronome Engine verify 20/20; Video Engine muxer 15/15; cleanup/safety 5/5; Video Engine MP4 smoke, updated Drum settings/export regression နှင့် Metronome card-to-export browser integration pass. Metronome test output: 3/8, quarter-note 96 BPM, 1 bar, 28 frames/0.933 sec, 720×1280 VP8 + 48kHz mono Opus; `ffprobe` က stream နှစ်ခုလုံးကိုဖတ်နိုင်သည်။ 375×812 phone နှင့် 1280×900 desktop viewport တွင် horizontal overflow မရှိ။ ဖုန်းအစစ်၊ Safari/Firefox နှင့် MediaRecorder-only fallback ကို မစစ်ရသေးပါ။

Implementation Plan/Doc: [Metronome Engine Plan](../../Metronome/Metronome%20Engine%20Plan/PLAN.md), [Metronome Engine Doc](../../Metronome/Metronome%20Engine%20Doc/DOC.md). Guitar နှင့် အခြား instrument များသည် ဆက်လက်မချိတ်ဆက်ရသေးပါ။

## Drum Studio — အရှည်ကို score အတိုင်း ထုတ်ခြင်း (2026-11-23)

- Drum Studio က video အရှည်ကို ကိုယ်ပိုင် ကန့်သတ်ချက်ဖြင့် မဖြတ်တောက်တော့ပါ။ ယခင် `MAX_SECONDS = 12` ကို ဖယ်ရှားပြီး MusicXML ဖိုင်၏ အရှည်အတိုင်း ထုတ်သည်။
- Hit အချိန်များကို ဖိုင်၏ tempo map အတိုင်း (`api.tickToSeconds`) တွက်သည်။ ယခင် ပုံသေ `QUARTER_SECONDS = 0.5` (120 BPM) ကြောင့် tempo ကွာသော score တွင် lane marker နှင့် notation cursor မကိုက်ညီဖြစ်ခဲ့သည်။ ဖိုင်တွင် tempo မပါမှသာ 120 BPM ကို သုံးသည်။
- Default drum pattern ကို quarter ၈ ခု (၂ bar) အနေဖြင့် ပြင်ရေးပြီး score နှင့် တူညီသော tempo map ဖြင့် အချိန်ချိန်သည်။
- Chromium စမ်းသပ်မှုတွင် ၄/၄ bar ၄ ခု၊ 60 BPM (စက္ကန့် ၁၆) score ကို `ffprobe` ဖြင့် တိုင်းပြီး အရှည်မှန်ကန်ကြောင်း အတည်ပြုထားသည်။ ဖုန်း/desktop layout၊ 16:9 နှင့် 9:16 output၊ notation band နှင့် cursor စစ်ဆေးချက်များ ဆက်လက် အောင်မြင်သည်။
- ကျန် ကန့်သတ်ချက် — Video Engine ၏ memory guard သာ safety အဖြစ် ကျန်သည်။ Drum အသံ နှင့် Count Voice အသံ မချိတ်ရသေးပါ။

## Drum Studio — voice နှစ်ခုနှင့် repeat ပါသော score (2026-11-23)

- **`<backup>` / `<forward>`** — Drum score များသည် voice ၂ ခုကို တစ်ခုတည်းသော bar ထဲတွင် `<backup>` ဖြင့် ပြန်စ၍ ရေးလေ့ရှိသည်။ `studio-video.js` ၏ parser သည် ယခင် `<note>` child များကိုသာ ဖတ်သဖြင့် voice ၂ ခုကို အစဉ်လိုက် ဆက်တွဲကာ score အရှည်ကို ၂ ဆ ဖြစ်စေခဲ့သည် (၂ bar / ၄ စက္ကန့် score → ၈ စက္ကန့်)။ ယခု measure ၏ child များကို အစဉ်လိုက် ဖတ်ပြီး `<backup>` ကို နောက်ပြန်၊ `<forward>` ကို အရှေ့သို့ cursor ရွှေ့သည်။
- **Repeat sign** — `<repeat direction="forward|backward">` ပါသော score ကို ယခင် တစ်ချီသာ ကွက်ခဲ့သည်။ ယခု hit များကို Notation Engine ၏ `playback.performance` (repeat plan) အတိုင်း pass တစ်ခုစီအတွက် ထပ်ထုတ်ပြီး video အရှည်ကို `performance.totalSeconds` ဖြင့် သတ်မှတ်သည်။
- **Notation cursor** — `video-engine.js` သည် ယခင် `secondsToTick` ဖြင့်သာ တွက်သဖြင့် repeat ဒုတိယချီတွင် cursor က ရှေ့ဆက် ရွေ့နေခဲ့သည်။ ယခု repeat ရှိလျှင် `api.performanceSecondsToWritten` ဖြင့် ဖတ်သဖြင့် pass အသစ်စတိုင်း cursor က repeat အစသို့ ပြန်ခုန်သည်။ repeat မရှိလျှင် ယခင် လမ်းကြောင်းအတိုင်း ဖြစ်သည်။
- **စမ်းသပ်မှု** — `tools/test-studio-video-browser.mjs` တွင် case ၆ ခု ထည့်ထားသည်: 60 BPM ၄ bar (၁၆ စက္ကန့်)၊ voice ၂ ခု ၂ bar (၄ စက္ကန့်)၊ repeat ၂ bar (written ၄ → played ၈ စက္ကန့်)၊ drum + bass part ၂ ခု (၄ စက္ကန့်)၊ Count Voice ဖွင့်ထားသော ၂ bar (၂ + ၄ = ၆ စက္ကန့်)၊ Thank You clip ၂ စက္ကန့် ပါသော ၂ bar (၄ + ၂ = ၆ စက္ကန့်)။ ခြောက်ခုလုံးကို Chromium မှ render ပြီး `ffprobe` ဖြင့် အရှည်တိုင်းသည်။ နောက်ဆုံးတွင် clip ၏ ပုံနှင့် အသံ ပါကြောင်းပါ စစ်သည်။
- **Part များ** — score ထဲတွင် drum အပြင် bass ကဲ့သို့ အခြား part ပါလာလျှင် parser သည် part အားလုံး၏ measure များကို ဖတ်သဖြင့် video က score တစ်ခုလုံး စုပုံသလောက် ရှည်ခဲ့သည်။ ယခု percussion clef ရှိသော part (မရှိလျှင် unpitched note ရှိသော part) ကိုသာ drum performance အဖြစ် ဖတ်သည်။
- **Count Voice count-in** — Plan §7 ၏ အရှည်စည်းမျဉ်းအရ video အရှည်တွင် count-in ပါသည်။ Count Voice ကို On ထားလျှင် score မစမီ bar တစ်ခု (score ၏ metre နှင့် tempo အတိုင်း) ကို segment အဖြစ် ထပ်ထည့်ပြီး ဗဟိုတွင် ရေတွက်သည့် ဂဏန်းကို ပြသည်။ 4/4၊ 120 BPM တွင် ၂ စက္ကန့် ဖြစ်သည်။
- **Thank You segment** — Plan §7 အရ video အရှည်တွင် Thank You clip ပါသည်။ ဖိုင်အမည်၊ R2 path နှင့် မရလျှင် လုပ်ပုံကို Engine ထဲတွင်သာ ထားသည် — `thankYouUrl()` က frame ၏ ပုံစံအလိုက် `thank-you/landscape.mp4`၊ `square.mp4`၊ `portrait.mp4` ကို ပြန်ပေးပြီး `thankYouSegment()` က segment တစ်ခု ထုတ်ပေးသည်။ Page က clip ၏ လိပ်စာကို မသိရပါ။ Clip ကို တစ်ကြိမ်သာ ယူပြီး cache လုပ်သည်; မရလျှင် export ကို မတားဘဲ အဆုံးပိုင်း မပါဘဲ ထွက်သည်၊ သို့သော် "မရ" ကို မမှတ်ထားပါ (နောက် export တွင် ပြန်ရှာသည်)။
- **ကျန်ရှိ** — `MAX_SECONDS` ကဲ့သို့ ကိုယ်ပိုင် ကန့်သတ်ချက် မရှိတော့ပါ; Video Engine ၏ memory guard သာ safety အဖြစ် ကျန်သည်။ Count-in ၏ အသံ (Count Voice အသံဖိုင်) ကို မချိတ်ရသေးပါ။ R2 ထဲ Thank You ဖိုင် အမှန်တကယ် တင်ရန် ကျန်သည်။
