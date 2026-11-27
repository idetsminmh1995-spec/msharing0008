# Documentation

M Sharing Website ၏ လက်ရှိ implementation နှင့် မပြီးသေးသောအလုပ်များကို အောက်ပါဖိုင်များတွင် မှတ်တမ်းတင်ထားသည်။

- [Header UI/UX Implementation](UI-UX-Implementation.md) — Header နှင့် Phone bottom bar ၏ ပြီးစီး/မပြီးသေး status
- [Cloudflare Workers Deployment](Cloudflare-Deployment.md) — Cloudflare deploy configuration နှင့် error fix
- [Header Bar History](Header-Bar-Implementation.md) — ယခင် Header implementation မှတ်တမ်း
- [Shared Header — Compact Sizing and Cross-Page Consistency](Shared-Header-2026-11-18.md) — Header သေးငယ်စေခြင်း၊ `styles.css` ကို local CSS ပြောင်းခြင်းနှင့် page တိုင်း Header တူညီစေခြင်း
- [Development Documentation Workflow](Development-Workflow.md) — Website အလုပ်များပြီးတိုင်း Doc နှင့် Plan update လုပ်ရမည့် စည်းမျဉ်း
- [Create Video Page](Create-Video-Page.md) — Web/phone responsive instrument နှင့် Metronome tool selection page
- [Notation Lab Page](Notation-Lab-Page.md) — Open File / Create / Scan entry page and Editor handoff
- [Notation Lab Editor — Fixed Toolbar and Score Workspace](Notation-Lab-Editor-Toolbar-2026-11-18.md) — Editor ရဲ့ sticky secondary toolbar၊ tool groups၊ entry handoff နှင့် responsive behaviour
- [Notation Lab Editor — Sidebar Dock, Properties and Instruments](Notation-Lab-Editor-Sidebar-Dock-2026-11-18.md) — Sidebar dock (panel ၃ ခု)၊ Properties readout၊ Instruments list နှင့် page-mode sheet layout
- [Notation Lab UI/UX Plan](../Plan/README.md#notation-lab-uiux-plan--revised-2026-11-15) — Active entry-screen and Editor handoff plan (Main Plan ထဲတွင်ရှိ)
- [Archive/Notation-Lab-UI-UX-Plan-2026-11-15.md](Archive/Notation-Lab-UI-UX-Plan-2026-11-15.md) — မူလ UI/UX Plan ဖိုင် (Archive၊ မပြင်ရ)
- [Images/drum-video-reference.png](Images/drum-video-reference.png) — Drum video ၏ final ပုံစံ ရည်ညွှန်းပုံ (user ပေးသော ဒီဇိုင်း)
- [Notation Lab Editor Architecture](Notation-Lab-Editor-Architecture-2026-11-15.md) — Current code audit, original workspace design, feature matrix, and M1–M6 implementation roadmap
- [Notation Lab Composer Work Log](Notation-Lab-Composer-Work-Log-2026-11-15.md) — Historical record; composer-first UI was retired
- [Notation Engine Plan Update and MuseScore Review](Notation-Engine-Plan-Work-Log-2026-11-14.md) — Plan ပြောင်းလဲမှုများ၊ တူရိယာအားလုံးနှင့် Orchestra/ensemble score support၊ MuseScore source/license စိစစ်ချက်နှင့် ကျန်ရှိသော P0–P5 tasks
- [Video Delivery Size and Length Cap Removal](Video-Delivery-Size-2026-11-18.md) — 1080p shared delivery size (1920×1080 / 1080×1080 / 1080×1920) နှင့် Metronome ၏ 12 sec ကန့်သတ်ချက် ဖယ်ရှားခြင်း
- [Video Single Look, Notation Band and Ratio Folder](Video-Single-Look-Notation-Band-2026-11-18.md)
- [Video Overlay Removal](Video-Overlay-Removal-2026-11-18.md) — နောက်ခံရှိ အနီ radial glow၊ notation စာရွက်အဖြူ plate နှင့် preview CSS အလင်းများ ဖြုတ်ခြင်း — §၁၃.၃ (က)(ဂ) တစ်သားတည်း ပုံစံ၊ ratio ဖိုဒါ စစ်ဆေးမှု၊ V21 notation band နှင့် Thank You/sync တိုင်းတာမှု ပြင်ဆင်ချက်
- [Guitar — Notation Band Restoration](Guitar-Notation-Band-2026-11-18.md) — Guitar video ၏ 16:9 output တွင် notation band ပျောက်ခဲ့ခြင်း (instrument share pin = 1) ကို ရှာ၍ ပြင်ခြင်း၊ regression check ထည့်ခြင်း
- [Video Export Speed Audit](Video-Export-Speed-Audit-2026-11-18.md) — Guitar/Drum export ၏ အမြန်နှုန်း စစ်ဆေးမှု: Video Engine အလုပ်လုပ်နေကြောင်း၊ တစ်ခုတည်းသော ပုလဲဆို့မှု Thank You clip seek ဖြစ်ကြောင်း၊ မဆိုင်တဲ့ script ၁၀ ခု၏ သက်ရောက်မှု မရှိကြောင်း တိုင်းတာချက်များ — နှင့် §၆ တွင် ပြင်ဆင်မှု (rVFC ကို seek မတိုင်မီ မှတ်ပုံတင်၊ ~2.5 ဆ မြန်)
- [Count Display and Count Voice](Count-Display-And-Count-Voice-2026-11-18.md) — Count ကို COUNT ကွက်တစ်နေရာတည်း ပြခြင်း (ထပ်နေသော count row ဖယ်ရှား)၊ Count Voice ၏ `{n}.wav` / `M{n}.wav` ဖိုင်စု ရွေးချယ်မှုနှင့် app cache key ပြန်ထုတ်ခြင်း
- [Video Engine Implementation Status](../Video/Video%20Engine%20Doc/README.md) — Engine code inventory, test results, and remaining production integration work
- [Metronome Engine Implementation Status](../Metronome/Metronome%20Engine%20Doc/DOC.md) — Studio connection, click-track export, responsive checks, tests, and remaining work
- [MuseScore General R2 Asset](../Notation/Sound%20Doc/MuseScore-General-R2-Asset.md) — MuseScore SoundFont bundle, license, checksum, R2 upload layout, and Sound Engine caching plan
- [SoundFont Collection R2 Asset](../Notation/Sound%20Doc/SoundFont-Collection-R2.md) — MS Basic, MuseScore General, GeneralUser GS, FluidR3 GM, and Salamander asset sources and license notes
- [SoundFont R2 Upload Work Log](SoundFont-R2-Upload-2026-11-13.md) — upload steps, R2 object verification, and remaining playback/license/access tasks.
- [Writer Engine Plan](../Writer/Writer%20Engine%20Plan/PLAN.md) — MuseScore ကဲ့သို့ ရေးခြင်း system ၏ အသေးစိတ် Plan (key map နှိုင်းယှဉ်ချက်၊ command အုပ်စုများ၊ W1–W11)၊ video နှင့် ဆက်စပ်သည့် အပိုင်းများကို Video Engine Plan တွင် သီးခြား ခွဲထားသည်
- [Writer Engine W2 — Key Map](Writer-Engine-W2-Key-Map-2026-11-18.md) — Key map ကို MuseScore 4 နှင့် ညီစေခြင်း (`↑`/`↓` semitone၊ `Alt+Shift` diatonic၊ `R` repeat၊ `Backspace` ပြန်ဖျက်၊ `Esc` input mode မှထွက်)၊ W2b duration နံပါတ်များ (`1`=64th … `7`=whole) နှင့် စမ်းသပ်ချက်
- [Writer Engine W3 — Tuplet](Writer-Engine-W3-Tuplet-2026-11-18.md) — `Ctrl+2`–`9` ဖြင့် triplet/quadruplet ရေးခြင်း၊ doc command (`insertTuplet`, `tupletMemberDuration`, `tupletMarksOf`)၊ rest ပါ tuplet ကို Engine က render လုပ်နိုင်အောင် `Rest` တွင် endpoint ထည့်ခြင်း၊ toolbar panel နှင့် စမ်းသပ်ချက်
- [Writer Engine W4 — Move, Respell, Interval](Writer-Engine-W4-Move-Respell-Interval-2026-11-18.md) — `Alt+1`–`9` interval၊ `J` enharmonic၊ `Shift+←`/`→` beat ရွှေ့ခြင်း၊ `Q`/`W` duration ထက်ဝက်/၂ ဆ၊ `T`/`S`/`Ctrl+B` key များ၊ doc command အသစ် (`moveBeats`, `enharmonicSpellings`, `respell`, `pitchAtInterval`) နှင့် စမ်းသပ်ချက်
- [Writer Engine W5 — Module ခွဲထုတ်ခြင်း](Writer-Engine-W5-Module-2026-11-18.md) — `notation-doc.js` ကို `Website/Writer/Writer Engine/` package အဖြစ် ခွဲထုတ်၊ `window.WriterEngine` အဖြစ် publish၊ Editor ၏ command logic (tie၊ slur၊ respell၊ interval၊ duration၊ transpose) ကို plan အဖြစ် ရွှေ့ပြီး DOM မပါဘဲ Node test လုပ်နိုင်
- [Writer Engine W6 — ရေးစဉ် အသံကြား](Writer-Engine-W6-Hear-While-Writing-2026-11-18.md) — Score ဖွင့်သည်နှင့် SoundFont ကြိုတင် load၊ `ensureSound` က promise တစ်ခုတည်း မျှဝေ၊ audition က `ready` စောင့်ပြီး နောက်ဆုံး note တစ်ခုသာ အသံထွက်၊ စမ်းသပ်ချက် ၂ ခု
