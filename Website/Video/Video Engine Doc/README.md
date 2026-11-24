# Video Engine — Implementation Status and Instrument Readiness

Repo: `idetsminmh1995-spec/msharing0008`
Plan review baseline: `main` / `0547011`
Authoritative Video Engine source: `Website/Video/Video Engine/source/website/assets/video-engine.js`
Production copy: `Website/Website/assets/video-engine.js`

## လက်ရှိ Video Engine အခြေအနေ

Video Engine သည် canvas frame များကို WebCodecs ဖြင့် MP4/WebM အဖြစ် render/mux လုပ်ခြင်း၊ MediaRecorder fallback, optional `AudioBuffer`, progress/cancel, memory guard နှင့် cleanup code များကို ပံ့ပိုးသည်။ လက်ရှိ Studio တွင် Drum, Metronome, Guitar, Piano, Bass, Strings (violin) နှင့် Voice adapter ခုနစ်ခုရှိသည်။ Drum export သည် Sound Model ရွေးထားလျှင် `OfflineAudioContext` ဖြင့် တိုက်ရိုက်ဖန်တီးသော ဒရမ်အသံကို ပါဝင်သည် (Visual Only ရွေးလျှင် အသံမပါ)၊ Metronome adapter က သီးခြားဖန်တီးသော click-track `AudioBuffer` ကို ပေးသည်။ Guitar adapter သည် tablature မှ တီးခတ်ပုံကို ဆွဲပြီး အသံမထုတ်ပါ။ Piano adapter သည် MusicXML ၏ note များကို `OfflineAudioContext` ဖြင့် တိုက်ရိုက် synthesize လုပ်သဖြင့် export တွင် score ၏ အသံ ပါသည်။ Bass adapter သည် visual-only ဖြစ်သည်။ Strings card သည် လက်ရှိတွင် violin ပုံကို ဆွဲပေးသည် — တီးခတ်ပုံ (fingering) မပါပါ။ Voice adapter သည် အသံဖိုင် import သို့မဟုတ် microphone အသံဖမ်းမှုကို decode လုပ်ပြီး ထို အသံပါသော ဗီဒီယို (audible) ကို ထုတ်ပေးသည်။

## အခြား instrument များ၏ code readiness

| Instrument | Repo ထဲတွင် တွေ့ရသော code | ချိတ်ဆက်ရန်အတွက် အဓိကလိုအပ်ချက် |
|---|---|---|
| **Guitar** | `Website/Guitar/Guitar Engine` တွင် TypeScript source, tests, built bundle, `positionsAt()`, `stageShapes()` နှင့် SVG renderer ရှိသည်။ Note data သည် string/fret/finger/time ကို သီးသန့်လိုအပ်သည်။ | **ချိတ်ပြီး** — `studio-guitar.js` သည် tablature ကို `parseMusicXml` မှ ဖတ်၍ Canvas painter ဖြင့် ဆွဲသည်၊ bundle ကို `Website/Website/assets/guitar-engine.js` မှ load သည်။ Guitar Engine သည် audio မထုတ်ပေးပါ။ |
| **Piano** | `Piano Hand Human Engine` တွင် keyboard geometry, key press/contact curve, performance/finger planning နှင့် synthetic IK source/tests ရှိသည်။ | **ချိတ်ပြီး (key-only)** — `studio-piano.js` သည် MusicXML မှ key press များကို ဖတ်၍ Engine ၏ keyboard geometry ဖြင့် ဆွဲသည်။ Hand/wrist animation မပါသေးပါ။ `Piano 3D Hand Engine` folder သည် `.gitkeep` သာရှိသည်။ |
| **Bass** | `Guitar Engine` တွင် Jazz Bass နှင့် Precision Bass ပုံများကို တိုင်းထားပြီး (`JAZZ_BASS_DRAWN`, `PRECISION_BASS_DRAWN`)၊ ပုံဖိုင်များသည် `Website/Website/assets/bass/` တွင် ရှိသည်။ | **ချိတ်ပြီး (visual-only)** — `studio-bass.js` သည် fretted bass အဖြစ် Guitar Engine ကို ပြန်သုံးသည်။ Tablature ရှိလျှင် ၎င်းကို သုံး၍ မရှိလျှင် pitch မှ အနိမ့်ဆုံး fret အဖြစ် တွက်သည်။ အသံ မထုတ်ပါ။ |
| **Strings** | `Website/Website/assets/violin/violin.svg` တွင် တူရိယာပုံ တစ်ပုံရှိသည် (violin နှင့် bow၊ vector)။ `Layout` တွင် `violin` template ရှိပြီး 16:9/1:1 တွင် notation ဘယ်၊ violin ညာ၊ 9:16 တွင် အပေါ်အောက် ထပ်၍ အောက်ဆုံးတွင် Title/Info ဖြစ်သည်။ | **ချိတ်ပြီး (drawing-only)** — `studio-violin.js` သည် Strings route တွင် ပုံကို ဆွဲသည်။ Violin fingering/bowing engine မရှိသေးသဖြင့် ကြိုးပေါ်တွင် အမှတ်အသား မထားပါ။ Viola/cello တို့အတွက် ပုံနှင့် တိုင်းတာချက် သီးခြားလိုအပ်သည်။ |
| **Voice** | `Website/Website/studio-voice.js` တွင် file import နှင့် `MediaRecorder` capture ရှိသည်။ `Layout` တွင် `voice` template ရှိပြီး Title band အောက်တွင် waveform ကို ဆွဲသည်။ | **ချိတ်ပြီး (audible)** — decode လုပ်ထားသော `AudioBuffer` ကို segment ၏ audio အဖြစ် ပေးသဖြင့် export သည် အသံပါသည်။ Waveform ကို ထို buffer မှ ဆွဲသည်။ Permission ငြင်းခြင်း၊ decode မရခြင်း၊ 300 s/64 MB ကန့်သတ်ချက်များကို render မစမီ ပြသည်။ |

### Shared dependency မှတ်ချက်များ

- `Website/Notation/Sound Egnine` သည် `.gitkeep` သာရှိသည်။ Shared audio synthesis/provider ကို လက်ရှိ implementation အဖြစ် မယူဆရ။
- Guitar/Piano package bundle output path များတွင် lowercase `website/assets` ကို အသုံးပြုထားသည့်နေရာရှိသည်။ Repo ၏ production directory သည် case-sensitive `Website/Website/assets` ဖြစ်သောကြောင့် copy/load/check path ကို အရင်ရှင်းလင်းရမည်။
- `AudioBuffer` မပေးလျှင် VideoEngine က visual-only silent video ထုတ်နိုင်သည်။ အသံလိုအပ်သည့် instrument တစ်ခုချင်းစီသည် sound source နှင့် audio/video timing ကို သီးခြားပေးရမည်။

## အကြံပြုထားသော အစီအစဉ်

အသေးစိတ် milestone, shared adapter contract, acceptance criteria နှင့် test sequence ကို [Video Engine Plan](../Video%20Engine%20Plan/PLAN.md) တွင် ထည့်ထားသည်။ အဓိကဦးစားပေးအစီအစဉ်မှာ:

1. နောက်ထပ် instrument များအတွက် shared adapter dispatch/event-time contract သတ်မှတ်ပြီး unsupported tool များကို Drum branch သို့ fall-through မဖြစ်စေရန်။
2. Guitar ကို ပထမချိတ်ဆက်ရန် — ရှိပြီးသား visual engine ကိုသုံးသော်လည်း Studio event source, bundle path, Canvas painter နှင့် photo assets ကို အရင်ဖြည့်ရန်။
3. Piano ကို key-only silent visual adapter အဖြစ်စတင်ရန် — note source နှင့် bundle destination ကို အတည်ပြုပြီး human-hand animation ကို နောက်ပိုင်း သီးခြားလုပ်ရန်။
4. Voice တွင် notation/instrument event model မရှိပါ — အသံကို တိုက်ရိုက် decode လုပ်သည့် adapter ဖြစ်သည်။ Violin တွင် ပုံသာ ရှိပြီး fingering/bowing engine မရှိသေးပါ။
5. Voice ကို source/capture/import နှင့် permission/privacy ဆုံးဖြတ်ချက်ပြီးမှ စတင်ရန် — ဆုံးဖြတ်ပြီး၊ `studio-voice.js` တွင် ချိတ်ပြီးဖြစ်သည်။
6. Audible export ကို အရေးကြီးသည့် requirement အဖြစ် အတည်ပြုပြီးမှ Sound Engine/audio provider, `AudioBuffer`, timing နှင့် codec fallback ကို အကောင်အထည်ဖော်ရန်။

## စမ်းသပ်မှုနှင့် အပြောင်းအလဲမှတ်တမ်း

- ယခင် code commit `d31337a` တွင် MP4 muxer tests 15 ခု၊ cleanup/safety tests 5 ခု၊ Chromium engine smoke test နှင့် Drum Studio browser integration/ffprobe test အောင်မြင်ထားသည်။ Production asset sync check နှင့် 375px/1280px viewport assertions လည်း pass ဖြစ်ထားသည်။
- Metronome implementation သည် Video Engine core ကိုပြင်ခြင်းမဟုတ်ဘဲ Studio အတွက် သီးခြား consumer adapter နှင့် bundle sync ကို ထည့်ထားသည်။ Guitar/Piano/Bass/Strings(violin)/Voice အားလုံးကို Video Engine ဖြင့် render လုပ်ပြီးဖြစ်သည်။
- နောက် code implementation တစ်ခုစီပြီးပါက သက်ဆိုင်ရာ engine tests, shared Drum regression, real browser export, silent/audio behavior နှင့် phone/web layout ကို ပြန်စစ်ပြီး Doc/Plan ကို update လုပ်ရမည်။
- **Guitar adapter ချိတ်ပြီး** — `tools/test-guitar-studio-browser.mjs` တွင် tablature ဖတ်ခြင်း၊ ပုံတိုင်း၏ အတိုင်းအတာ၊ Canvas ပေါ်တွင် neck ရှိကြောင်း၊ 375px/1280px layout နှင့် Plan §7 အရှည်စည်းမျဉ်း (score ၂ bar = ၄ စက္ကန့်၊ Thank You clip ၂ စက္ကန့် ဖြင့် ၆ စက္ကန့်) ကို စစ်သည်။ Guitar စာမျက်နှာတွင်လည်း ကိုယ်ပိုင် ၁၂ စက္ကန့် ကန့်သတ်ချက် မရှိတော့ပါ။
- **Notation View နှင့် စာသား အံဝင်ခြင်း** — `tools/test-notation-view-browser.mjs` (V6) နှင့် `tools/test-title-info-browser.mjs` (V7) ထည့်ပြီး။ ဒုတိယ test က ရှည်လွန်းသော Title သည် 1:1/9:16 တွင် ဘောင်ကျော်နေသည်ကို တွေ့၍ `fitText()` ဖြင့် ပြင်ခဲ့သည်။ Test နှစ်ခုလုံးကို mutation ဖြင့် ပြန်စစ်ပြီး — ဦးတည်ချက်/ဖြတ်ခြင်းကို ဖျက်ကြည့်လျှင် fail ဖြစ်သည်။
## Current Studio settings UI update

The shared left-side Studio control panel now supports MusicXML selection, logo selection, Title 1/Title 2, Drum selection, Notation View, Sound Model, Count Voice text, Video Color, Video Ratio, and Generate Video. The same markup and responsive CSS are intended to be reused by all instrument studio routes.

Implemented behavior:

- `16:9`, `1:1`, and `9:16` selections change the VideoEngine output dimensions.
- Title fields, selected color, notation mode, count label, and an optional logo are drawn into generated frames.
- Drum selection limits which capture pad is active.
- Generate Video re-renders the captured drum event log using the current settings.
- Phone layout collapses the settings fields into a single-column form while preserving the same controls.

Drum-specific limitations: MusicXML and Sound Model/Count Voice behavior follow the status recorded in the Studio history below; Drum export remains visual-only. Metronome has its separate synthesized click-track adapter. Guitar is connected through `studio-guitar.js` with its own tablature reader and Canvas painter; Piano and Bass are connected the same way through `studio-piano.js` and `studio-bass.js`, and Strings draws the violin through `studio-violin.js`. Nothing marks the violin: it has no frets and no fingering engine, so only the drawing is placed in the frame. Voice is connected through `studio-voice.js`: it decodes an imported audio file or a microphone recording into an `AudioBuffer` and passes that buffer as the segment's audio, so the export is audible rather than a silent waveform.

Verification for this update: Studio JavaScript syntax and control-marker checks passed; Video Engine source-to-production sync check passed; existing Video Engine automated tests passed (20/20); Wrangler nested deployment dry-run passed. The public Worker still serves the previous deployment until a commit is pushed and Cloudflare deploy is run.


## Revised Studio control panel

The Kick/Snare/Hi-hat capture boxes were removed from the left panel. The page now generates from an optional MusicXML source or a deterministic default drum pattern. MusicXML and Logo are presented in one desktop row. A custom logo replaces the default `Website/Website/assets/logo/m-sharing-drum-logo.svg`; without a custom file, the M Sharing Drum Logo remains selected automatically.

Title 1 and Title 2 each have independent color and font-size controls. Drum settings are split into Brand text and Model selection. Notation View offers Page Landscape, Page Portrait, and Page Square. Sound Model offers multiple model choices plus volume. Count Voice has Off/On, two count styles, and volume. Video Color is restricted to Black or White, while Video Ratio remains 16:9, 1:1, and 9:16.

The Drum browser integration test clicks Generate Video without drum pads. MusicXML parsing covers plain XML/MusicXML drum notes and `.mxl` archives (see below); Drum count audio remains pending. Metronome click-track audio is generated separately by its adapter as described below.


## Latest control and preview clarification

The redundant default-logo text label was removed. The default logo is now communicated by the visible logo preview only. Drum Brand is a select control. Sound Model and Sound Volume are stacked in the same field, and Count Voice controls retain their On/Off, type, and volume arrangement.

The standard 16:9 export is now `1920×1080`; square and portrait exports are `1080×1080` and `1080×1920`. The video preview stage uses its own fixed 16:9 frame and does not resize based on the loaded video's intrinsic dimensions. Browser regression passed for the 1920×1080 landscape output and the portrait output.


## Metronome Studio — Video Engine ချိတ်ဆက်ပြီး (2026-11-14)

- Create Video ရှိ Metronome card သည် `studio.html?tool=metronome` သို့သွားသည်။ Shared Studio settings form နှင့် Drum adapter ကို Metronome route တွင် မပြဘဲ dedicated `studio-metronome.js` က Metronome configuration ကို ကိုင်တွယ်သည်။ `studio-video.js` သည် Metronome route တွင် Drum renderer မစတင်စေရန် return လုပ်သည်။
- `MetronomeDesigns` bundle ထဲရှိ design 11 မျိုးကို `Website/Metronome/Metronome Engine/tools/sync-metronome-engine.mjs` ဖြင့် `Website/Website/assets/metronome-engine.js` သို့ build/copy/check လုပ်သည်။
- Adapter တွင် design, orientation (16:9/9:16/1:1), quarter-note BPM, time signature နှင့် bars ရွေးနိုင်ပြီး deterministic animated video ထုတ်သည် (12 sec ကန့်သတ်ချက်ကို 2026-11-18 တွင် ဖယ်ပြီး)။ Browser-size canvas သည် Video Engine ၏ `sizeFor()` မှ လာသည် — 1920×1080၊ 1080×1080 သို့မဟုတ် 1080×1920, 30 FPS။ မည်သည့် ratio ကိုမျှ 720p ဖြင့် မထုတ်ပါ။
- `OfflineAudioContext` မှ bar downbeat accent ပါသော mono click-track `AudioBuffer` ကို adapter ကဖန်တီးပြီး shared Video Engine သို့ပေးသည်။ ဤ click track သည် Sound Engine မဟုတ်ပါ။ WebCodecs/MediaRecorder support အလိုက် MP4 သို့မဟုတ် WebM ထွက်နိုင်သည်။ စမ်းသပ်ထားသော Chromium run တွင် VP8 video နှင့် 48 kHz mono Opus audio ထွက်ခဲ့သည်။
- UI တွင် opening-frame preview, progress/cancel, output preview, play/seek/download ပါဝင်သည်။ Metronome card click navigation ကို Chromium integration test ဖြင့်စစ်ထားသည်။

## Drum Studio — ဗီဒီယိုထဲတွင် ဒရမ်အသံ (2026-11-24)

- **အသံ ချိတ်ပြီးပါပြီ။** ယခင် Drum export သည် အသံမပါသော ဗီဒီယိုသာ ဖြစ်ပြီး Sound Model ရွေးလျှင် status တွင် "audio adapter pending" ဟု ပြခဲ့သည်။ ယခု `studio-video.js` က `OfflineAudioContext` ဖြင့် ဒရမ်အသံကို တိုက်ရိုက် ဖန်တီးပြီး segment ၏ `audio` အဖြစ် Video Engine သို့ ပေးသည်။ Metronome adapter ၏ နည်းလမ်းအတိုင်း ဖြစ်သည် — Plan က `Sound Engine` folder ကို implementation ရှိသကဲ့သို့ မယူဆရန် ဆိုထားသဖြင့် adapter ကိုယ်တိုင် synthesize လုပ်သည်။
- **အသံ ၃ မျိုး** — kick (နိမ့်သော tone ကျဆင်းမှု၊ noise နည်း)၊ snare (အလယ် tone + noise များ)၊ hi-hat (မြင့်သော tone + noise များ)။ noise ကို ပုံသေ seed ဖြင့် ဖန်တီးသဖြင့် render တစ်ချီနှင့်တစ်ချီ ထပ်တူဖြစ်သည်။
- **Sound Model ၄ မျိုး** — Visual Only (အသံ လုံးဝမထုတ်)၊ Natural၊ Studio၊ Room။ တစ်ခုစီသည် room length နှင့် brightness ဖြင့် ကွဲပြားသည်။ ရွေးထားသော model ကို status တွင် ပြသည်။
- **Count Voice အသံ** — Count Voice On ဖြစ်လျှင် count-in ကို ကြိမ်သံဖြင့် တီးသည် (downbeat တွင် ပိုမြင့်သည်)။ count-in သည် အသံပါသော segment ဖြစ်သဖြင့် ပထမ bar သည် ရုပ်နှင့် အသံ ကိုက်ညီသည်။
- **Status မှန်ကန်မှု** — ယခင် "silent visual video" ဟု အမြဲပြခဲ့သည်။ ယခု ဒရမ်အသံ မပါလျှင် "visual only · no drum sound"၊ ပါလျှင် "<model> drum sound" ဟု ပြသည်။ Thank You clip တွင် ကိုယ်ပိုင်အသံ ပါသဖြင့် ဖိုင်တစ်ခုလုံးကို "silent" ဟု မခေါ်တော့ပါ။
- **စမ်းသပ်မှု** — `tools/test-studio-video-browser.mjs` တွင် case ၂ ခု ထည့်သည်: (၁) Visual Only သည် audio stream မထုတ်ကြောင်း၊ status က ဒရမ်အသံမရှိကြောင်း ပြောကြောင်း; (၂) Natural သည် audio stream ထုတ်ကြောင်း၊ peak > 3000 ရှိကြောင်း၊ beat ပေါ်တွင် ကျကြောင်း (beat ပေါ် peak သည် beat ကြားထက် ၂ ဆ ကျော်)။ နှစ်ခုလုံးအတွက် Thank You clip ကို ဖယ်ထားသည် — clip ၏ ကိုယ်ပိုင်အသံက ဒရမ်အသံကို ဖုံးလွှမ်းမည် ဖြစ်သောကြောင့်။
- **ကျန်ရှိ** — count ကို စကားဖြင့် (spoken "one, two, three, four") မခေါ်သေးဘဲ ကြိမ်သံဖြင့်သာ တီးသည်။ Count Voice အသံဖိုင် (သို့) speech synthesis ကို နောက်ပိုင်း ချိတ်ရန် ကျန်သည်။

**အတည်ပြုထားသော စမ်းသပ်မှုများ:** Metronome Engine verify 20/20; Video Engine muxer 15/15; cleanup/safety 5/5; Video Engine MP4 smoke, updated Drum settings/export regression နှင့် Metronome card-to-export browser integration pass. Metronome test output: 3/8, quarter-note 96 BPM, 1 bar, 28 frames/0.933 sec, 1080×1920 VP8 + 48kHz mono Opus; `ffprobe` က stream နှစ်ခုလုံးကိုဖတ်နိုင်သည်။ Test သည် ratio ၃ မျိုးလုံးကို ယခု တိုင်းသည် — 16:9 က 1920×1080၊ 1:1 က 1080×1080၊ 9:16 က 1080×1920 — ထို့ကြောင့် 720p ဖြင့် တိတ်တဆိတ် ထွက်နေမှုကို ဖမ်းမိမည်။ 375×812 phone နှင့် 1280×900 desktop viewport တွင် horizontal overflow မရှိ။ ဖုန်းအစစ်၊ Safari/Firefox နှင့် MediaRecorder-only fallback ကို မစစ်ရသေးပါ။

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

## Piano Studio — key-only visual adapter (2026-11-23)

- Create Video ရှိ Piano card သည် `studio.html?tool=piano` သို့သွားပြီး dedicated `studio-piano.js` က Piano configuration ကို ကိုင်တွယ်သည်။ Drum settings form နှင့် Guitar controls ကို Piano route တွင် မပြပါ။ `studio-video.js` သည်လည်း Piano route တွင် Drum renderer မစတင်စေရန် return လုပ်သည်။
- Event source သည် MusicXML ဖြစ်သည်။ Adapter သည် pitched note တစ်ခုချင်းစီကို key press တစ်ခုအဖြစ် ဖတ်ပြီး `tie` ၏ အပိုင်းနှစ်ခုကို အသံတစ်ခုတည်းအဖြစ် ပေါင်းသည်။ Chord တစ်ခုကို key များအဖြစ် တစ်ပြိုင်နက် ဖိနေသည့်အတိုင်း ဆွဲသည်။
- Renderer သည် `Piano Hand Human Engine` ၏ keyboard geometry (`buildKeyboard`, `whiteIndex`, `WHITE_KEY_WIDTH_MM`, `BLACK_KEY_WIDTH_MM`) နှင့် `keyPressDepthMm()` ကို `atSeconds` မှ တွက်၍ deterministic ဆွဲသည်။ Wall-clock time သို့မဟုတ် live DOM state ကို မဖတ်ပါ။
- Keyboard ကို score ကြားသည့် key များအပေါ် သက်သက် window ချသည်။ အနည်းဆုံး white key အရေအတွက်ကို ထိန်းပြီး score ကျယ်လျှင် key များ ကျဉ်းသွားသည်၊ မည်သည့် key ကိုမျှ ဖြတ်မပစ်ပါ။ Key band ၏ အမြင့်ကို key ၏ ကိုယ်ပိုင် 23.5:150 အချိုးအတိုင်း သတ်မှတ်သည်။
- Range စည်းမျဉ်း — pitched note မရှိသော score နှင့် 88-key piano ၏ အပြင်ဘက်သာ ရှိသော score ကို export မစတင်ဘဲ ငြင်းပယ်သည်။ တစ်ချို့ note သာ အတွင်းရောက်လျှင် ရောက်သော note များဖြင့် ဆက်ထုတ်သည်။
- Output သည် key-only ဖြစ်ပြီး အသံ ပါသည် — score ၏ pitched note တစ်ခုချင်းစီကို partial ခြောက်ခုဖြင့် synthesize လုပ်သည် (hammer လိုက်၍ upper partial များ ပိုမြန် ကွယ်သည်)။ 4/4 bar နှစ်ခုတွင် peak 16363/32768 ဖြစ်၍ clipping မရှိပါ။ `Piano 3D Hand Engine` folder သည် empty ဖြစ်သဖြင့် hand renderer ကို dependency အဖြစ် မသုံးပါ။ Synthetic IK ကို လူ့လက်ဟု မဖော်ပြပါ။
- Video အရှည်သည် Plan §7 အတိုင်း Count Voice + MusicXML အရှည် + Thank You clip ဖြစ်သည်။ Adapter ကိုယ်ပိုင် `MAX_SECONDS` ကန့်သတ်ချက် မထားပါ။ Video Engine ၏ memory guard သာ safety အဖြစ် ကျန်သည်။
- Bundle ကို `Website/Piano/Piano Hand Human Engine/tools/sync-piano-engine.mjs` ဖြင့် `Website/Website/assets/piano-hand-engine.js` သို့ build/copy/check လုပ်သည်။ `--check` သည် stale copy ကို ဖမ်းသည်။

**အတည်ပြုထားသော စမ်းသပ်မှုများ:** Piano Hand Human Engine 86/86 (suite 11), Guitar Engine 37/37, Notation Engine 1528/1528, Video Engine muxer 15/15. `tools/test-piano-studio-browser.mjs` သည် Chromium တွင် တကယ့် page ကို နှိပ်ပြီး ထွက်လာသော ဖိုင်ကို `ffprobe` ဖြင့် တိုင်းသည် — 9:16 output 1080×1920, 4/4 bar နှစ်ခု 120 BPM = 4.00 sec, 120 frames, MP4, Opus အသံ stream ပါသည် (peak 16363)။ Thank You clip ၂ စက္ကန့် ပေးလျှင် 6.00 sec ဖြစ်ပြီး clip ၏ အသံပါ ပါလာသည်။ Frame တွင် keyboard ၏ white key ~30.6 px နှင့် black key ~14 px တိုင်းပြီး 11/23.5 အချိုးနှင့် ကိုက်ကြောင်း၊ keyboard သည် အောက်ခြေ gutter အထိ ရောက်ကြောင်း စစ်ထားသည်။ တူညီသော score ကို နှစ်ခါ render လုပ်ရာတွင် frame မပြောင်းကြောင်း (codec rounding အတွင်း) နှင့် cancel လုပ်လျှင် ဖိုင်မထွက်၊ ခလုတ်ပြန်ရကြောင်း စစ်ထားသည်။ 375×812 phone နှင့် 1280×900 desktop viewport တွင် horizontal overflow မရှိ။ Drum, Guitar, Metronome browser regression သုံးခုလုံး ဆက်လက်အောင်မြင်သည်။

**လက်ကျန်:** Piano အသံကို synthesize ဖြင့် ချိတ်ပြီးပါပြီ; Sound Engine သို့မဟုတ် uploaded audio ကို အစားထိုးသုံးရန် မချိတ်ရသေးပါ။ Hand/wrist animation သည် သီးခြား project အဖြစ် ကျန်သည်။ ဖုန်းအစစ်၊ Safari/Firefox နှင့် MediaRecorder-only fallback ကို မစစ်ရသေးပါ။

## Bass Studio — visual adapter (2026-11-23)

- Create Video ရှိ Bass card သည် `studio.html?tool=bass` သို့သွားပြီး dedicated `studio-bass.js` က Bass configuration ကို ကိုင်တွယ်သည်။ Drum settings form, Guitar controls နှင့် Piano controls ကို Bass route တွင် မပြပါ။ `studio-video.js` သည်လည်း Bass route တွင် Drum renderer မစတင်စေရန် return လုပ်သည်။
- Bass ကို fretted bass အဖြစ် သတ်မှတ်ပြီး `Guitar Engine` ကို ပြန်သုံးသည်။ ကြိုးလေးကြိုး tuning သည် E1 A1 D2 G2 (`[28, 33, 38, 43]`) ဖြစ်သည်။
- ပုံနှစ်ပုံကို Guitar Engine က တိုင်းထားပြီးသား အတိုင်းအတာအတိုင်း ဆွဲသည် — Jazz Bass (`jazz-drawn`, viewBox `0 0 1009.7 302.1`, 20 fret) နှင့် Precision Bass (`precision-drawn`, viewBox `32.5 408.5 1584.5 432`)။ ကြိုးလိုင်းများကို ပုံ၏ တိုင်းထားသော အပြင်ဘက် ကြိုးနှစ်ခုကြားတွင် အညီအမျှ ခွဲထားသဖြင့် ကြိုးတစ်ခုနှင့်တစ်ခု မထပ်ပါ။
- Event source သည် MusicXML ဖြစ်သည်။ Tablature (`<string>`/`<fret>`) ပါလျှင် ၎င်းကို တိတိကျကျ သုံးသည် — ရေးထားသည့် နေရာသည် ပုံ၏ အဓိပ္ပာယ်ဖြစ်သောကြောင့် pitch မှ ခန့်မှန်း မဖြည့်ပါ။ Tablature မပါသော note ကို pitch မှ အနိမ့်ဆုံး fret အဖြစ် တွက်သည်။ Bass Engine တွင် `analyzeBass` (Phase B1) မရှိသေးသဖြင့် pitch မှ ကြိုး/fret သတ်မှတ်သည့် စည်းမျဉ်းကို adapter ထဲတွင်သာ ထားသည်။
- Range စည်းမျဉ်း — pitched note မရှိသော score နှင့် ကြိုးလေးကြိုး၏ အနိမ့်ဆုံး E1 အောက်သာ ရှိသော score ကို export မစတင်ဘဲ ငြင်းပယ်သည်။ တစ်ချို့ note သာ အတွင်းရောက်လျှင် ရောက်သော note များဖြင့် ဆက်ထုတ်သည်။
- Output သည် visual-only, အသံမပါသော export ဖြစ်သည်။ Video အရှည်သည် Plan §7 အတိုင်း MusicXML အရှည် + Thank You clip ဖြစ်ပြီး adapter ကိုယ်ပိုင် `MAX_SECONDS` ကန့်သတ်ချက် မထားပါ။
- Layout — `LAYOUT_TEMPLATES.bass` သည် `rows` ပုံစံဖြစ်ပြီး အစီအစဉ်မှာ instrument → notation → title ဖြစ်သည်။

**အတည်ပြုထားသော စမ်းသပ်မှုများ:** Notation Engine 1528/1528, Guitar Engine 37/37, Piano Hand Human Engine 86/86, Video Engine muxer 15/15. `tools/test-bass-studio-browser.mjs` သည် Chromium တွင် တကယ့် page ကို နှိပ်ပြီး ထွက်လာသော ဖိုင်ကို `ffprobe` ဖြင့် တိုင်းသည် — 9:16 output 1080×1920, 4/4 bar နှစ်ခု 120 BPM = 4.00 sec, MP4, အသံ stream မပါ။ Thank You clip ၂ စက္ကန့် ပေးလျှင် 6.00 sec ဖြစ်ပြီး clip ၏ အသံပါ ပါလာသည်။ ကြိုး ၄ ကြိုး E1–G3, 20 fret, ကြိုးလိုင်းများ အညီအမျှ ဖြစ်ကြောင်း စစ်ထားသည်။ ကိုယ်ပိုင် ဆွဲသည့် shape များ တူညီသော အခိုက်အတန့်တွင် အတိအကျ တူကြောင်း၊ ထွက်လာသော frame သည် codec rounding အတွင်း မပြောင်းကြောင်း၊ cancel လုပ်လျှင် ဖိုင်မထွက်၊ ခလုတ်ပြန်ရကြောင်း စစ်ထားသည်။ 375×812 phone နှင့် 1280×900 desktop viewport တွင် horizontal overflow မရှိ။ Drum, Guitar, Piano browser regression သုံးခုလုံး ဆက်လက်အောင်မြင်သည်။

**လက်ကျန်:** Bass အသံ မချိတ်ရသေးပါ။ ပုံနှစ်ပုံသာ ရှိသေးသည်။ ဖုန်းအစစ်၊ Safari/Firefox နှင့် MediaRecorder-only fallback ကို မစစ်ရသေးပါ။

## Violin Studio — drawing-only adapter (2026-11-23)

- Strings card သည် `studio.html?tool=strings` သို့သွားပြီး `studio-violin.js` က ကိုင်တွယ်သည်။ Drum settings, Guitar, Piano နှင့် Bass controls များကို Strings route တွင် မပြပါ။ `studio-video.js` သည်လည်း Strings route တွင် Drum renderer မစတင်စေရန် return လုပ်သည်။
- ပုံတစ်ပုံသာ ရှိသည် — `Website/Website/assets/violin/violin.svg`။ Violin နှင့် bow ကို vector အဖြစ် ဆွဲထားပြီး 16:9၊ 1:1၊ 9:16 သုံးမျိုးလုံးတွင် ထိုပုံတစ်ပုံတည်းကို သုံးသည်။ Drum ကဲ့သို့ အပိုင်းအလိုက် ဖိုင်ခွဲ မလိုပါ — vector ပုံတစ်ပုံကို အရွယ်ပြောင်း ဆွဲနိုင်သည်။
- **အမှတ်အသား မထားပါ။** Violin တွင် fret မရှိသဖြင့် Guitar/Bass ကဲ့သို့ ကြိုးပေါ် နေရာချ၍ မရပါ။ Violin fingering/bowing engine လည်း မရှိသေးပါ။ ထို့ကြောင့် adapter သည် တူရိယာပုံကို နေရာချရုံသာ လုပ်သည်။ Summary တွင် "violin drawn, not fingered" ဟု တိုက်ရိုက် ရေးပြသည်။
- Layout သည် `LAYOUT_TEMPLATES.violin` ကို သုံးသည် — 16:9 နှင့် 1:1 တွင် notation ဘယ်ဘက်၊ violin ညာဘက်၊ အောက်ဆုံးတွင် Title/Info အကျယ်အပြည့်။ 9:16 တွင် ဘေးချင်းယှဉ်လျှင် ကျဉ်းလွန်းသဖြင့် notation အပေါ်၊ violin အောက် ထပ်၍ Title/Info အောက်ဆုံးတွင်။
- ပုံကို အမြင့်ဖြင့် fit လုပ်ပြီး အချိုးမပျက် ထားသည်။ Frame ကျဉ်းလျှင် violin ငယ်သွားမည်၊ ဘယ်တော့မှ ဆန့်ထုတ် မခံရပါ။
- Output သည် visual-only, အသံမပါသော export ဖြစ်သည်။ Video အရှည်သည် Plan §7 အတိုင်း MusicXML အရှည် + Thank You clip ဖြစ်ပြီး adapter ကိုယ်ပိုင် `MAX_SECONDS` ကန့်သတ်ချက် မထားပါ။

**အတည်ပြုထားသော စမ်းသပ်မှုများ:** Notation Engine 1528/1528, Guitar Engine 37/37, Piano Hand Human Engine 86/86, Video Engine muxer 15/15 နှင့် layout 7/7. `tools/test-violin-studio-browser.mjs` သည် Chromium တွင် တကယ့် page ကို နှိပ်ပြီး ထွက်လာသော ဖိုင်ကို `ffprobe` ဖြင့် တိုင်းသည် — 9:16 output 1080×1920, 4/4 bar နှစ်ခု 120 BPM = 4.00 sec, MP4, အသံ stream မပါ။ 16:9 output 1920×1080။ Thank You clip ၂ စက္ကန့် ပေးလျှင် 6.00 sec ဖြစ်ပြီး clip ၏ အသံပါ ပါလာသည်။ Layout ကို တိုက်ရိုက် စစ်သည် — 16:9 တွင် ဘေးချင်းယှဉ်၊ band အောက်ဆုံး၊ 9:16 တွင် ထပ်၍ အကျယ်အပြည့်။ ပုံသည် frame ထဲ တကယ်ရောက်ကြောင်း violin band နှင့် ညာဘက် column တို့တွင် pixel ရေတွက်၍ စစ်သည်။ ထွက်လာသော frame သည် codec rounding အတွင်း မပြောင်းကြောင်၊ cancel လုပ်လျှင် ဖိုင်မထွက်၊ ခလုတ်ပြန်ရကြောင်း စစ်ထားသည်။ 375×812 phone နှင့် 1280×900 desktop viewport တွင် horizontal overflow မရှိ။ Drum, Guitar, Piano နှင့် Bass browser regression အားလုံး ဆက်လက်အောင်မြင်သည်။

**လက်ကျန်:** Violin အသံ မချိတ်ရသေးပါ။ Fingering/bowing engine မရှိသေးသဖြင့် ကြိုး/finger အမှတ်အသား မထားပါ။ Viola/cello တို့အတွက် ပုံနှင့် တိုင်းတာချက် သီးခြားလိုအပ်သည်။ ဖုန်းအစစ်၊ Safari/Firefox နှင့် MediaRecorder-only fallback ကို မစစ်ရသေးပါ။

## Voice Studio — audible recording adapter (2026-11-24)

- Voice card သည် `studio.html?tool=voice` သို့သွားပြီး `studio-voice.js` က ကိုင်တွယ်သည်။ Drum settings, Guitar, Piano, Bass နှင့် Violin controls များကို Voice route တွင် မပြပါ။ `studio-video.js` သည်လည်း Voice route တွင် Drum renderer မစတင်စေရန် return လုပ်သည်။
- အသံဝင်ရန် လမ်းနှစ်ခု — အသံဖိုင် import (`audio/*`, `.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm`, `.flac`) သို့မဟုတ် microphone မှ တိုက်ရိုက် အသံဖမ်းခြင်း (`MediaRecorder`)။ နှစ်ခုလုံးသည် browser ထဲတွင်သာ decode ဖြစ်သည် — ဖိုင်ကို ဘယ်နေရာကိုမှ upload မလုပ်ပါ။
- **ထွက်လာသော ဗီဒီယိုတွင် အသံ တကယ်ပါသည်။** Decode ရလာသော `AudioBuffer` ကို segment ၏ `audio` အဖြစ် တိုက်ရိုက် ပေးသည်။ Waveform ကို ထို buffer မှ ဆွဲသဖြင့် မြင်ရသော ပုံနှင့် ကြားရသော အသံသည် တူညီသော အသံတစ်ခုတည်းဖြစ်သည်။
- Microphone ခွင့်ပြုချက် ငြင်းပယ်ခံရလျှင် ငြင်းပယ်ခြင်းအဖြစ် တိုက်ရိုက် ပြပြီး ဖိုင် import လမ်းကို ဆက်ပေးသည်။ Page မပျက်ပါ။
- Decode မရသော ဖိုင်၊ အလွတ် ဖိုင်၊ သတ်မှတ်ထက်ရှည်သော ဖိုင် (300 sec) နှင့် ကြီးလွန်းသော ဖိုင် (64 MB) တို့ကို render မစတင်မီ ငြင်းပယ်သည်။
- Layout သည် `LAYOUT_TEMPLATES.voice` ကို သုံးသည် — `rows` ပုံစံ၊ Title/Info band အပေါ်၊ waveform အောက်။ Voice တွင် notation မရှိပါ၊ တူရိယာပုံလည်း မရှိပါ။ Waveform ကို အလျားလိုက် အလယ်မှ နှစ်ဖက်သို့ ဆွဲပြီး ကစားပြီးသော အပိုင်းကို accent အရောင်၊ မကစားရသေးသော အပိုင်းကို muted အရောင် ခွဲပြသည်။ Playhead သည် frame ၏ `at` မှ တိုက်ရိုက် တွက်သဖြင့် တူညီသော အခိုက်အတန့်ကို နှစ်ခါ ဆွဲလျှင် ပုံတူညီသည်။
- Output အရှည်သည် အသံဖိုင်၏ အရှည် + Thank You clip ဖြစ်သည်။ Adapter ၏ ကိုယ်ပိုင် `MAX_SECONDS` (300 sec) သည် memory အတွက် ကန့်သတ်ချက်ဖြစ်ပြီး Plan §7 ၏ အရှည်စည်းမျဉ်းကို မပြောင်းပါ။

**အတည်ပြုထားသော စမ်းသပ်မှုများ:** Notation Engine 1528/1528, Guitar Engine 37/37, Piano Hand Human Engine 86/86, Video Engine muxer 15/15 နှင့် layout 8/8. `tools/test-voice-studio-browser.mjs` သည် Chromium တွင် တကယ့် page ကို နှိပ်ပြီး ထွက်လာသော ဖိုင်ကို `ffprobe` နှင့် `ffmpeg volumedetect` ဖြင့် တိုင်းသည် — ဝင်သွားသော အသံမှာ ၁.၅ စက္ကန့် တိတ်ဆိတ်ပြီး ၁.၅ စက္ကန့် A440 ဖြစ်သည်။ ထွက်လာသော ဖိုင် 9:16 = 1080×1920, 3.00 sec, Opus mono 48 kHz, mean volume −24 dB (တိတ်ဆိတ်မဟုတ်)၊ ပြန်ဖြည်ပြီး တိုင်းသော pitch မှာ 439.4 Hz ဖြစ်သည် — ဝင်သွားသော 440 Hz နှင့် ကိုက်သည်။ Waveform သည် အသံကို လိုက်ကြောင်း တိတ်ဆိတ်သော အပိုင်းတွင် ၂.၉ px အထူ၊ ကျယ်သော အပိုင်းတွင် ၁၀၈.၆ px အထူ ဖြစ်ကြောင်း pixel ဖြင့် စစ်သည်။ Microphone ငြင်းပယ်မှု၊ decode မရသော ဖိုင်၊ cancel လုပ်လျှင် ဖိုင်မထွက်၊ ခလုတ်ပြန်ရကြောင်း စစ်ထားသည်။ Thank You clip ၂ စက္ကန့် ပေးလျှင် 5.00 sec ဖြစ်ပြီး clip ၏ အသံပါ ပါလာသည်။ 375×812 phone နှင့် 1280×900 desktop viewport တွင် horizontal overflow မရှိ။ Drum နှင့် Violin browser regression နှစ်ခုလုံး ဆက်လက်အောင်မြင်သည်။

**လက်ကျန်:** ဖုန်းအစစ်၊ Safari/Firefox နှင့် MediaRecorder-only fallback ကို မစစ်ရသေးပါ။ Voice အတွက် notation/event model မရှိပါ — ဤ adapter သည် အသံကို တိုက်ရိုက် decode လုပ်သည့် နည်းလမ်းဖြစ်သည်။ အသံဖိုင် ဖြတ်တောက်ခြင်း (trim) နှင့် အသံအမြန်နှုန်း ပြောင်းခြင်း မပါသေးပါ။

## Studio dispatch — §5 regression (2026-11-24)

Plan §5 ၏ ပထမဆုံး စစ်ချက်ဖြစ်သော **dispatch regression** ကို စစ်ထားသည်။ `studio-video.js` သည် Drum adapter ကိုယ်တိုင် ဖြစ်နေသဖြင့် `tool` တန်ဖိုးတစ်ခုကို အပေါ်ပိုင်းတွင် မခွဲထုတ်ပါက အခြား instrument တစ်ခုကို တောင်းဆိုလျှင်ပင် Drum ဗီဒီယို ထွက်လာမည်။ ထို အမှားသည် တိတ်ဆိတ်စွာ ဖြစ်ပျက်သဖြင့် "အလုပ်လုပ်/မလုပ်" မဟုတ်ဘဲ "ငြင်းဆို/မငြင်းဆို" ကို စစ်ရသည်။

`tools/test-studio-dispatch-browser.mjs` (အသစ်) ၏ ရလဒ်များ —

| စစ်ချက် | ရလဒ် |
|---|---|
| `theremin` (adapter မရှိ) | status တွင် `not implemented yet` ပါသည်၊ Generate Video disabled၊ download မရှိ၊ settings control ၁၉/၁၉ disabled |
| ထို route တွင် Generate နှိပ်ခြင်း | download နှင့် output မထွက်ပါ |
| `drums` | Drum ၏ ကိုယ်ပိုင် prompt (မှန်ကန်သည်) |
| `metronome` | Metronome ၏ ကိုယ်ပိုင် status |
| `guitar`, `piano`, `bass`, `strings`, `voice` | ကိုယ်ပိုင် prompt ဖြစ်ပြီး Drum prompt မဟုတ်ပါ |

နောက်ဆုံး စစ်ချက်က အရေးကြီးသည်။ route တစ်ခုစီသည် ကိုယ်ပိုင် status ကို ပြသဖြင့် fall-through ဖြစ်ခဲ့လျှင် Drum ၏ `default drum pattern` စာသား ပေါ်လာမည်။ ထို စာသားကို စစ်ခြင်းဖြင့် route ခုနစ်ခုလုံး ကိုယ်ပိုင် adapter ရှိကြောင်း သက်သေဖြစ်သည်။

**မှတ်ချက်:** ငြင်းဆိုသော route တွင် `settingsForm` အတွင်းရှိ `input,select` များကိုသာ disable လုပ်သည်။ ထို form ပြင်ပ ခလုတ်များ (ဥပမာ instrument selector) ကို မထိပါ — အသုံးပြုသူသည် အခြား instrument သို့ ပြောင်းနိုင်ရန် လိုအပ်သဖြင့် ဖြစ်သည်။

**§5 ၏ ကျန် စစ်ချက်များ — အခြေအနေ အတိအကျ**

| စစ်ချက် | Piano | Guitar | Bass | Strings | Voice | Metronome |
|---|---|---|---|---|---|---|
| Frame determinism (same time → same frame) | ရှိ | ရှိ | ရှိ | ရှိ | ရှိ | ရှိ |
| Audio policy (silent vs audible) | မသက်ဆိုင် (silent) | မသက်ဆိုင် | မသက်ဆိုင် | မသက်ဆိုင် | ရှိ | ရှိ |
| Asset readiness | ရှိ | **အသစ်** | ရှိ | ရှိ | ရှိ | ရှိ |
| Render lifecycle | ရှိ | ရှိ | ရှိ | ရှိ | ရှိ | ရှိ |

**ဖြည့်ခဲ့သော gap — Metronome determinism။** စစ်ကြည့်သောအခါ `test-metronome-studio-browser.mjs` တွင် `assert` ၄၀ ကျော် ပါသော်လည်း frame determinism စစ်ချက် လုံးဝ မပါကြောင်း တွေ့ရသည်။ Piano နှင့် Voice တွင် ထို စစ်ချက် ရှိပြီးသားဖြစ်သဖြင့် Metronome တစ်ခုတည်း လွတ်နေသည်။ ယခု ထည့်ပြီးဖြစ်သည် — တူညီသော setting ဖြင့် နှစ်ကြိမ် render လုပ်ပြီး 0.4 sec (swing အလယ်) မှ frame ကို နှိုင်းယှဉ်သည်။ ရလဒ် — **ရွေ့သော pixel 0 / 921,600, delta 0**။ ဤအချက်က `frameAt()` သည် wall clock မဖတ်၊ frame အကြား state မထားကြောင်း သက်သေဖြစ်သည်။

**ဖြည့်ခဲ့သော gap — Guitar asset failure။** §5 ၏ "Assets" စစ်ချက် (လိုအပ်သော asset မရလျှင် export ကို မစရ) ကို Guitar တွင် တကယ် မစစ်ရသေးပါ။ ကုဒ်တွင် guard ရှိပြီးသားဖြစ်သည် (`if (!picture) throw new Error(...)`)၊ သို့သော် စမ်းသပ်မှု မရှိလျှင် ထို guard ကို နောက်တစ်ခါ ဖျက်မိလျှင် မည်သူမျှ မသိပါ။ ယခု `electric-drawn.svg` ကို 404 ဖြစ်စေပြီး စစ်သည် — status က `could not be loaded` ဖြင့် ရပ်ပြီး download မထွက်ပါ။ ယခင် ဗီဒီယို (Thank You ပါသော) ကိုလည်း မဖျက်ပါ။

**တွေ့ရှိချက် — မအောင်မြင်သော ပုံကို cache လုပ်ထားသည်။** `imageCache` က မအောင်မြင်သော promise ကို လည်း သိမ်းထားသဖြင့် ထို ပုံကို တစ်ခါ မရပြီးနောက် page တစ်ခုလုံးအတွက် ထပ်မကြိုးစားတော့ပါ။ 404 အတွက် မှန်ကန်သည် (ဖိုင် မရှိ)၊ သို့သော် ကွန်ရက် glitch တစ်ခုဖြစ်လျှင် အသုံးပြုသူသည် page ကို ပြန် reload လုပ်ရမည်။ ဤအချက်ကို doc တွင် မှတ်ထားသည်၊ ကုဒ် မပြောင်းပါ။

**မှတ်ချက် — စမ်းသပ်မှု ပတ်ဝန်းကျင်။** ဤ session တွင် `ffmpeg`/`ffprobe` သည် system `PATH` မှ ပျောက်နေသဖြင့် browser test များ run ရန် `PATH="/workspace/tools/node_modules/@ffprobe-installer/linux-x64:/workspace/tools/node_modules/@ffmpeg-installer/linux-x64:$PATH"` ကို ရှေ့ဆက် ထည့်ရသည်။ `Pillow` ကိုလည်း `pip install pillow` ဖြင့် ထည့်ခဲ့သည် (frame နှိုင်းယှဉ်မှုအတွက်)။

## Shared audio contract — Phase 6.1 (2026-11-24)

Plan §6.1 သည် segment တစ်ခုချင်း၏ `AudioBuffer` ကို ဗီဒီယိုတစ်ခုတည်း၏ အသံအဖြစ် ပေါင်းသည့် စည်းမျဉ်းများကို သတ်မှတ်ရန် ဖြစ်သည်။ Instrument adapter တိုင်း (Metronome, Voice, နောင် Piano) သည် ထို စည်းမျဉ်းများကို အတူတူ အမွေခံသဖြင့် ဤနေရာတွင် တစ်ခါတည်း စစ်ထားသည်။

**စည်းမျဉ်းများ**

1. **Timeline** — segment တစ်ခုချင်းစီ၏ အသံသည် ယခင်က segment များ၏ အရှည်ပေါ်တွင် ဆက်တိုက် စတင်သည်။ `joinAudio()` က `segment.seconds` ကို ပေါင်း၍ `at` ကို တိုးသည်။ Segment အားလုံးကို zero မှာ ထပ် မထားပါ။
2. **Sample rate** — master သည် **48 kHz** တစ်မျိုးတည်း (`AUDIO_SAMPLE_RATE`)။ Adapter က 44.1 kHz ဖြင့် ပေးလာလျှင် `OfflineAudioContext` က resample လုပ်သည်။ Adapter ကိုယ်တိုင် resample မလုပ်ရ။
3. **Channels** — ဗီဒီယိုတစ်ခုလုံး၏ channel count ကို **အကျယ်ဆုံး** segment က ဆုံးဖြတ်သည် (အကျဉ်းဆုံး မဟုတ်)။ `audioChannelsFor()` က `Math.min(2, Math.max(1, ...counts))` ဖြင့် တွက်သည်။ Mono source ကို stereo master ထဲ ထည့်လျှင် `OfflineAudioContext` က အလိုအလျောက် နှစ်ဖက်သို့ ဖြန့်ပေးသဖြင့် ဆုံးရှုံးမှု မရှိပါ။
4. **Codec fallback** — `pickFormat()` သည် AAC (MP4) ကို အရင်စစ်ပြီး မရလျှင် Opus (WebM) သို့ ဆင်းသည်။ `AudioEncoder.isConfigSupported` ကို အသံ channel count နှင့်အတူ စစ်သဖြင့် stereo မရသော encoder ကို ရွေးမထားပါ။

**တွေ့ရှိပြီး ပြင်ခဲ့သော အမှား — stereo ပျောက်ခြင်း**

အရင် `joinAudio()` နှင့် `recordInRealTime()` နှစ်ခုလုံးတွင် channel count ကို **အကျဉ်းဆုံး** segment မှ ယူခဲ့သည် (`Math.min(2, ...counts)` ကို `Math.max(1, ...)` ဖြင့် ပတ်ထားသည်)။ အကျိုးဆက်မှာ — Voice တွင် stereo recording ကို ဖမ်းပြီး mono ဖြစ်သော Thank You clip ကို ဆက်ထည့်လျှင် ဗီဒီယိုတစ်ခုလုံး **mono** ဖြစ်သွားပြီး အသုံးပြုသူ ပေးခဲ့သော channel တစ်ခု ဆုံးရှုံးသည်။ ဤအမှားကို စမ်းသပ်မှုဖြင့် ဦးစွာ သက်သေပြပြီး (stereo + mono → 1 channel) ပြီးမှ ပြင်ခဲ့သည်။ ယခု ထို case သည် 2 channel ထွက်သည်။

**အတည်ပြုထားသော စမ်းသပ်မှုများ:** `tools/test-audio-contract-browser.mjs` (အသစ်) သည် Chromium တွင် တကယ် render လုပ်ပြီး ထွက်လာသော ဖိုင်ကို `ffprobe` နှင့် zero-crossing ဖြင့် တိုင်းသည် —

- **timeline** — တစ်စက္ကန့် 440 Hz + တစ်စက္ကန့် 880 Hz နှစ်ခု → 2.00 sec, ပထမပိုင်း 439.2 Hz, ဒုတိယပိုင်း 879.2 Hz။ တူညီသော tone မဟုတ်ကြောင်း တိတိကျကျ စစ်သဖြင့် segment နှစ်ခု zero မှာ ထပ်မနေကြောင်း သက်သေဖြစ်သည်။
- **resample** — 44.1 kHz ဖြင့် ပေးသော 660 Hz → 48 kHz master တွင် 659.2 Hz။
- **channels** — stereo + mono → **2 channel** (ပြင်ပြီးနောက်)။

Video Engine muxer 15/15, layout 8/8, cleanup 5/5, Voice နှင့် Drum browser regression နှစ်ခုလုံး ဆက်လက်အောင်မြင်သည်။

**MediaRecorder fallback (§6.3):** WebCodecs မရှိသော browser အတွက် real-time path ကို သီးခြား စစ်ထားသည် — fixture က `VideoEncoder`/`VideoFrame` ကို ဖျက်လိုက်သဖြင့် `render()` သည် `path: 'mediarecorder'` သို့ ဆင်းသည်။ ထို path မှ ထွက်လာသော ဖိုင်တွင်လည်း အသံ ပါကြောင်း (440 Hz တိုင်းတာ) စစ်ထားသည်။ Headless Chromium တွင် `--autoplay-policy=no-user-gesture-required` မပါလျှင် `AudioContext` က suspended ဖြစ်နေသဖြင့် အသံ track လုံးဝ မထွက်ပါ — ဤအချက်သည် test environment ၏ ကန့်သတ်ချက်ဖြစ်ပြီး အတည့်အစစ် browser တွင် အသုံးပြုသူ၏ click က context ကို နှိုးပေးမည်ဖြစ်သည်။ `muxMp4ToStream()` ၏ incremental muxing ကို real device တွင် မစစ်ရသေးပါ။

**လက်ကျန် (§6.2):** Piano hand/wrist animation (wrist trajectory planner, site GLB calibration) သည် သီးခြား project အဖြစ် ကျန်သည်။

## Live Preview (§၁၂) — Drum Studio (2026-11-18)

**အခြေအနေ: ✅ စံနှုန်း ၆ ချက် အားလုံး pass။** Preview သည် export နှင့် **တူညီသော** လမ်းကြောင်းကို သုံးသည် — `buildTimeline()` က segment များကို တစ်ခါတည်း တည်ဆောက်ပြီး `engine.drawFrameAt()` က preview canvas နှင့် encoder frame နှစ်ခုလုံးကို ဆွဲသည်။ ဒုတိယ drawing path မရှိပါ။

**ဖွဲ့စည်းပုံ**

- `studio.html` ၏ `[data-video-stage]` ထဲတွင် `<canvas data-video-preview>` ထည့်ထားသည်။ ပုံသေ 16:9 frame ဖြစ်ပြီး video ၏ intrinsic size ပေါ် မူတည်၍ မပြောင်းပါ။
- `[data-video-source]` က `Live preview` သို့မဟုတ် `Rendered video` ကို ပြသည်။ Render ပြီးသော ဖိုင်ရှိလျှင် `data-kind="rendered"` ဖြစ်ပြီး အစိမ်းရောင် ဖြစ်သည်။
- Setting ပြောင်းတိုင်း debounce ဖြင့် `schedulePreview()` က `buildTimeline()` ကို ပြန်ခေါ်သည်။ `notationFor()` တွင် cache ရှိသဖြင့် Title တစ်ခုတည်း ပြောင်းလျှင် SVG ကို ပြန် decode မလုပ်ပါ။
- Play/Pause သည် `engine.drawFrameAt()` ကို `requestAnimationFrame` ဖြင့် ခေါ်သည်။ Seek သည် တူညီသော `drawFrameAt()` ကို တိုက်ရိုက် ခေါ်သဖြင့် ရပ်ထားသော frame နှင့် ဖွင့်ထားသော frame သည် တူညီသည်။

**ပိုင်ဆိုင်မှု လက်ဆဲ (ownership handshake)** — `studio-video.js` က `stage.dataset.videoAdapter` ကို သတ်မှတ်သည်။ legacy `script.js` က ထို marker ရှိလျှင် ၎င်း၏ `<video>` time-update/seek/time-label handler များကို ရပ်တန့်သည်။ ဤမရှိလျှင် handler နှစ်ခုက time label ကို တစ်လှည့်စီ ရေးပြီး preview ၏ `mm:ss / mm:ss` ကို ဖျက်သည်။

**Race တစ်ခု ပြင်ပြီး** — `playPreview()` သည် preview အသံ (count-in click၊ ဒရမ်သံ) ကို `await` ဖြင့် စတင်ပြီးမှ frame clock ကို schedule လုပ်ခဲ့သည်။ ထို `await` အတွင်း pause နှိပ်လျှင် clock သည် နောက်မှ ပြန်လာပြီး ရပ်ထားသော preview က ဆက်ဆွဲသည်။ ယခု `await` ပြီးနောက် `preview.playing` ကို ပြန်စစ်သည်။

**စမ်းသပ်မှု** — `tools/test-studio-video-browser.mjs` (case `e2e15`/`e2e16`) တွင် စံနှုန်း တစ်ခုချင်းစီအတွက် assertion ရှိသည် —

| §၁၂ စံနှုန်း | တိုင်းတာပုံ | ရလဒ် |
|---|---|---|
| ≥ ၂၄ fps | `requestAnimationFrame` ၂ စက္ကန့် ရေတွက် | ၂၄ အထက် |
| Seek frame တူခြင်း | preview frame နှင့် export frame ကို pixel-compare (1.5 s, 2.5 s) | ကွာဟမှု < ၁၀ |
| Setting → ၃၀၀ ms | Title ပြောင်းပြီး canvas ink ပြောင်းသည့်အချိန် | **၃၂၄ ms** |
| Keyboard / Full screen | Space က play/pause၊ ⛶ က stage ကို full screen | pass (`×` ပြောင်းသည်) |
| Memory မတိုး | play ၅ ချီပြီး `HeapProfiler.collectGarbage` နောက် `Runtime.getHeapUsage` | ၄ MiB အောက် |
| Export မပျက် | preview ပြီးနောက် export သည် MP4 1920×1080၊ 4 s၊ portrait 1080×1920 | pass |

**မှတ်ချက်** — Title latency ၏ ၃၀၀ ms သည် debounce ကာလ ဖြစ်သည်။ တိုင်းတာရာတွင် debounce + frame တစ်ခု ပါသဖြင့် ceiling ကို ၉၀၀ ms ထားသည်။

## Notation View ၄ မျိုးနှင့် စာသား အံဝင်ခြင်း (V6၊ V7 — 2026-11-18)

**Notation View** — `notation` setting သည် လေးမျိုး လက်ခံသည်။ ပထမသုံးမျိုးသည် **Page** ဖြစ်ပြီး စာရွက်ကို အောက်မှ အပေါ်သို့ ရွှေ့ကာ ဖတ်သည့်လိုင်း (cursor) ကို နေရာတွင် ထားသည်။ စတုတ္ထမျိုးသည် **Horizontal** ဖြစ်ပြီး စာရွက်ကို ညာမှ ဘယ်သို့ ရွှေ့ကာ marker ကို မရွေ့စေပါ။

| View | mode | စာရွက် အနံ (staff space) | ရွေ့သည့် ဦးတည်ချက် |
|---|---|---|---|
| `landscape` | `page` | 42 | အောက် → အပေါ် |
| `portrait` | `page` | 30 | အောက် → အပေါ် |
| `square` | `page` | 30 | အောက် → အပေါ် |
| `horizontal` | `scroll` | — (score အတိုင်း ရှည်) | ညာ → ဘယ် |

- Page ၏ အမြင့်သည် score ရှည်လျှင် တိုးသည် (ဥပမာ 42×2640)။ ထို့ကြောင့် အချိုးကို အမြင့်ဖြင့် မတိုင်း — **အနံ** ဖြင့် တိုင်းသည်။
- `state.mode` က `page`/`scroll` ကို ပြန်ပေးသည်။ ရွေ့မှုကို `state.api.computeCursorPlacement()` က တွက်သည်။

**စမ်းသပ်မှု** — `tools/test-notation-view-browser.mjs` သည် engine ၏ `drawNotationPart()` ကို တိုက်ရိုက်ခေါ်ပြီး `ctx.drawImage()` သို့ ပေးလိုက်သော offset ကို ဖမ်းယူသည်။ ထို့ကြောင့် "ရွေ့သည်" ဆိုသည်ကို ရည်ရွယ်ချက်မှ မဟုတ်ဘဲ တကယ်ဆွဲသည့် တန်ဖိုးမှ စစ်သည်။ စာရွက်သည် ဘောင်ထက် ၂ ဆ မကျယ်လျှင် test က ပယ်သည် — မရွေ့နိုင်သော စာရွက်ဖြင့် ဦးတည်ချက် စစ်လျှင် အမှားကို မဖမ်းမိနိုင်သဖြင့် ဖြစ်သည်။

**စာသား အံဝင်ခြင်း (V7)** — `fitText(ctx, text, maxWidth)` သည် စာသားကို ဖြတ်ပြီး `…` ထည့်သည်။ Title 1၊ Title 2၊ stats row (`4/4`၊ `BPM`၊ `Key`)၊ footer နှင့် count row အားလုံး ဤ function ကို ဖြတ်သည်။ ဤမရှိမီ ရှည်လွန်းသော Title သည် 1:1/9:16 တွင် ဘောင်ကျော်ခဲ့သည်။

- ဖြတ်သည့်အခါ အသုံးပြုသူ ရိုက်ထည့်သည့် စာသားကို မပြောင်း — အစမှ ကိုက်သည့်အထိ ဆွဲပြီး `…` ထည့်သည်။ Default စာသားဖြင့် အစားထိုး မလုပ်ပါ။
- Count row တွင် ကိုက်သည့် token အထိသာ ဆွဲသည်။ ကျန်ကို မဆွဲပါ။
- `width` မပေးလျှင် band ကို မကန့်သတ်ပါ (test အဟောင်းများ မကျိုးစေရန်)။

**စမ်းသပ်မှု** — `tools/test-title-info-browser.mjs` သည် ratio ၃ မျိုးတွင် band ၏ နေရာချထားမှုကို စစ်ပြီး စာသား/logo တစ်ခုမျှ ဘောင်မကျော်ကြောင်း တိုင်းသည်။ ရှည်သော Title ဖြင့်လည်း စမ်းသည်။

## Layout API — `layoutFor`, `composeFrame`, `requireAsset` (V10)

Engine က **နေရာ** ကို ပိုင်သည်၊ page/adapter က **ဆွဲပုံ** ကို ပိုင်သည်။ ဤခွဲခြားမှုကြောင့် instrument အသစ်တစ်ခု ချိတ်ရာတွင် engine ကို မပြင်ရပါ။

### `layoutFor(instrument, { width, height, parts?, shares? })`

Frame တစ်ခုကို အပိုင်း ၃ ခုအဖြစ် ခွဲပြီး တစ်ခုချင်းစီ၏ `{ x, y, width, height }` ကို ပြန်ပေးသည်။

| instrument | shape | အစဉ် |
|---|---|---|
| `drums`, `piano` | `rows` | title → notation → instrument |
| `guitar`, `bass` | `rows` | instrument → notation → title |
| `violin` | `split` (16:9, 1:1) / `rows` (9:16) | notation ဘယ်၊ instrument ညာ၊ title အောက်တွင် အပြည့် |
| `voice` | `rows` | title → instrument (waveform) |

- `ratioOf(width, height)` က `16:9` / `1:1` / `9:16` ကို ဆုံးဖြတ်ပြီး `LAYOUT_SHARES` မှ အချိုးကို ယူသည်။ `rows` 16:9 တွင် `title 0.12 / notation 0.46 / instrument 0.42`။
- `LAYOUT_GUTTER = 0.02` — frame ၏ အတိုဆုံးအနံဘက်မှ ၂% ကို ဘောင် အဖြစ် ထားသည်။
- `parts` ပေးလျှင် ထို အပိုင်းများသာ နေရာချသည်။ `shares` ပေးလျှင် ပင်ထားသော အပိုင်း၏ အချိုးကို လိုက်နာပြီး ကျန်အပိုင်းများကို `resolveShares()` က ကျန်နေသော နေရာအပေါ် အချိုးကျ ပြန်ဝေသည်။
- မသိသော instrument အတွက် `RangeError` ပစ်သည်။ Drum branch သို့ fall-through မရှိပါ။

### `composeFrame(ctx, { instrument, width, height, parts, shares? })`

`parts` သည် `{ title, notation, instrument }` မှ function များ ဖြစ်သည်။ Engine က `layoutFor()` ကို ခေါ်ပြီး အပိုင်းတစ်ခုချင်းစီကို ၎င်း၏ rect ဖြင့် ခေါ်သည်။ မပေးထားသော အပိုင်းကို ဆွဲမည် မဟုတ်ပါ — ထို့ကြောင့် page တစ်ခုသည် အပိုင်းတစ်ခုတည်းဖြင့်လည်း စတင်နိုင်သည်။ Function မဟုတ်သော value ကို `parts` မှ ဖယ်ထားသည်။

### `requireAsset(label)` / `resolveRequired(label, details)`

Adapter က export မစမီ လိုအပ်သော asset ကို ကြေညာသည်။ `requireAsset()` က label ကို `pending` အဖြစ် မှတ်သည်။ Asset မရလျှင် `resolveRequired` ကို မခေါ်သဖြင့် `pending` ကျန်နေပြီး export ကို မစတင်ရ။ ဤနည်းဖြင့် asset ပျောက်နေသော video ကို တိတ်တဆိတ် မထုတ်ပါ။

### ဘယ်သူ ဘယ်လို သုံးသည်

- `studio-video.js` ၏ `drawPerformance()` က `engine.composeFrame()` ကို တစ်ကြိမ်တည်း ခေါ်ပြီး အပိုင်း ၃ ခုလုံးကို ပေးသည်။ Preview နှင့် export နှစ်ခုလုံး ဤ function ကို ဖြတ်သဖြင့် နေရာချထားမှု တူညီသည်။
- `thankYouSegment()` က clip ကို `requireAsset('thank-you')` ဖြင့် ကြေညာပြီး ရလျှင် `resolveRequired()` ကို ခေါ်သည်။ 404 ဖြစ်လျှင် `null` ပြန်ပြီး `buildTimeline()` က ထို segment ကို ချန်သည်။
- Metronome က `layoutFor()` ကို မသုံးပါ — ၎င်း၏ video တွင် Title/Info band မပါသဖြင့် ကိုယ်ပိုင် design renderer ရှိသည်။

**စမ်းသပ်မှု** — `website/tests/video-engine-layout.test.mjs` က ratio ၃ မျိုးတွင် အပိုင်းများ ထပ်/ကျော်မှု မရှိကြောင်း၊ `shares` override အလုပ်လုပ်ကြောင်း၊ မသိသော instrument က ပစ်ကြောင်း စစ်သည်။

## `.mxl` score support (2026-11-18)

A `.mxl` is a ZIP archive, so `file.text()` returns archive bytes rather than a score. The engine now owns the one way a page reads a score: `VideoEngine.readScoreText(file)` returns `file.text()` for plain XML and, for `.mxl`, opens the archive with the Notation Engine's own `unzipMxl()` — which resolves the real score path from `META-INF/container.xml` instead of guessing an entry name. A damaged archive throws with the reader's own diagnostics rather than returning an empty sheet.

`prepareNotation()` and the five score-driven studios (Drum `parseMusicXml`, Piano, Guitar, Bass, Violin) all call it, and every MusicXML input in `studio.html` now lists `.mxl` in `accept`. Metronome Studio still only records the chosen filename; connecting its score to video timing is separate work in the Main Plan.

**Verification** — `tools/test-mxl-score-browser.mjs` loads `simple-single-voice.mxl` into the real page and checks that the text matches the archive read directly, that the notation is 4.00 s in `page` mode with 69,503 dark pixels (real notes, not a placeholder), that a non-ZIP file is refused with a reason, and that all six inputs offer `.mxl`. Reverting the `.mxl` branch to `file.text()` makes the test fail. Engine unit tests (21) and the Drum, Piano, Guitar, Bass and Violin browser suites pass; the sync check reports the production copy is current.

## Delivery size စစ်ဆေးမှု — ratio ၃ မျိုး (2026-11-18)

Every adapter takes its picture size from `VideoEngine.sizeFor()`, so no page
keeps a size of its own: 16:9 is 1920×1080, 1:1 is 1080×1080 and 9:16 is
1080×1920. The Metronome browser test now measures all three ratios rather
than portrait alone, and checks that each export is named for its ratio, so a
page that quietly fell back to 720p would fail instead of passing on the one
ratio that happened to be measured. Earlier notes in this Doc that recorded a
9:16 output as 720×1280 were stale and now read 1080×1920, which is what the
Piano, Bass, Violin and Voice tests have been asserting.
