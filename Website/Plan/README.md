# M Sharing Website — Development Plan

> ## ⚠ အရေးအကြီးဆုံး သတိပေးချက် — Video Engine နှင့် shared code
>
> **Video Engine** သည် instrument အားလုံး (Drum, Piano, Guitar နှင့် နောက်ထပ်ထည့်မည့်ဟာများ) အတွက် တူညီသော common အလုပ်ကို လုပ်ပေးရမည်။ Page တစ်ခုချင်းစီ (`studio.html`, `studio-*.js` စသည်) ထဲတွင် ပြန့်ကျဲနေသော shared code များကို သက်ဆိုင်ရာ Engine ထဲသို့ ရွှေ့ရမည်။ ရွှေ့ပြီးနောက် code ကို ဂရုတစိုက် ပြန်လည်စစ်ဆေးရမည်။ Instrument တစ်ခုချင်းစီအတွက် common အလုပ်ကို feature folder ထဲတွင် ထပ်ရေးခြင်း/ကူးခြင်း မပြုရ။ (အသေးစိတ် placement rule — "Shared engine placement and reuse" ကို ကြည့်ပါ။)

## အကြောင်းအရာစာရင်း

- **အခြေခံ Plan:** ၁ ရည်ရွယ်ချက် / feature / engine architecture · ၂ Frontend · ၃ Backend · ၄ Storage · ၅ Deployment · ၆ AWS portability · ၇ အဆင့်များ · ၈ Testing · ၉ လက်ရှိအခြေအနေ (Header) · ၁၀ Git/Cloudflare · ၁၁ Doc workflow
- [Notation Lab Page — 2026-11-13](#notation-lab-page--2026-11-13) (အစောပိုင်း baseline)
- [Create Video — Engine workflow](#create-video--engine-workflow--2026-11-13) (Drum / Piano workflow)
- [Notation Lab UI/UX Plan](#notation-lab-uiux-plan--revised-2026-11-15)
- [Writer Engine — Notation Editor](#writer-engine--notation-editor--2026-11-22) (Inst. box၊ sidebar၊ palettes)
- [Create Video — Final video layout](#create-video--final-video-layout--2026-11-22) (၃ ပိုင်း layout)
- Create Video — Video ထုတ်လုပ်ပုံ အသေးစိတ် (pipeline၊ Studio options၊ engine တာဝန်ခွဲခြားမှု၊ ဆုံးဖြတ်ချက်များ၊ ပြီးစီးမှုအခြေအနေ)
- Sound Engine နှင့် MuseScore SoundFont (SoundFont ရွေးချယ်ချက် ပါ)
- Metronome Studio
- **အခြား Plan များ:** [Video Engine Plan](../Video/Video%20Engine%20Plan/PLAN.md) · [Notation Plan](../Notation/Notation%20Plan/PLAN.md) · [Metronome Engine Plan](../Metronome/Metronome%20Engine%20Plan/PLAN.md) · [Sound Plan](../Notation/Sound%20Plan/README.md)

## 1. ရည်ရွယ်ချက်

M Sharing သည် music learning, music notes, online courses, video studio, library နှင့် user profile/dashboard များ ပါဝင်မည့် responsive web application ဖြစ်မည်။ လက်ရှိ repository ထဲတွင် Header Bar prototype ကိုသာ တည်ဆောက်ထားပြီး ဤ Plan သည် နောက်ပိုင်း frontend၊ backend၊ storage နှင့် deployment အဆင့်များအတွက် အခြေခံ architecture ဖြစ်သည်။

### 1.1 Feature ၄ ခု နှင့် revenue share

Web app တွင် အဓိက feature ၄ ခု ရှိသည် — **Notes ရောင်းခြင်း၊ Lessons တက်ခြင်း၊ Create Video နှင့် Music Notes ရေးခြင်း (Notation Lab/Editor)**။ Create Video နှင့် Notation Lab ကို အရင်ဆွေးနွေး/တည်ဆောက်ပြီး Notes Store နှင့် Lessons ကို နောက်မှ လုပ်မည်။

- **Notation Lab/Editor:** MuseScore ကဲ့သို့ notation ရေးနိုင်ရမည်။ Creator များသည် ရေးထားသောအရာကို web app ထဲတွင် ရောင်းချရန် list လုပ်နိုင်မည်။
- **Revenue share:** ရောင်းရသည့် sale တစ်ခုချင်းစီ၏ **၄၅%** ကို platform က ယူမည်။ ၎င်း ၄၅% ကို payment fee များ မနှုတ်မီ ရောင်းဈေးမှ တိုက်ရိုက်ယူမည်။
- **Create Video:** အသုံးပြုသူက MusicXML ဖိုင်ပေးပြီး Engine များကို အသုံးပြု၍ video ဖိုင်ထုတ်ပေးမည်။

### 1.2 Engine architecture

| Feature | အသုံးပြုမည့် Engine များ |
|---|---|
| Notation Editor | Notation Engine + Sound Engine + **Writer Engine** |
| Create Video | Notation Engine + Sound Engine + Video Engine + သက်ဆိုင်ရာ အခြား Engine များ (ဥပမာ instrument-specific engines) |

- **Notation Engine** — notation ကို ပြသသည်။ သီးခြား၊ မပြောင်းလဲဘဲ ရပ်တည်သည်။ Notation Editor နှင့် Create Video နှစ်ခုစလုံးက ၎င်းကို **ကိုယ်ပိုင်ဖြင့် တိုက်ရိုက်ခေါ်သုံးသည်**။
- **Sound Engine** — notation အတွက် audio (အသံ) ကို ထုတ်ပေးသည်။
- **Writer Engine** — Notation Editor ထဲတွင် လုပ်ဆောင်သမျှ — notation ကို ရေးပုံရေးနည်းနှင့် editor operation အားလုံးကို ပိုင်ဆိုင်သည်။
- **Video Engine** — video ထုတ်လုပ်ခြင်း (Create Video)။ Instrument အားလုံးအတွက် common အလုပ်ကို လုပ်သည် (အပေါ်ဆုံး သတိပေးချက်ကို ကြည့်ပါ)။

**ဆုံးဖြတ်ချက်:** Notation Editor သည် score ကို Create Video သို့ **တိုက်ရိုက် မပို့ပါ**။ ၎င်းတို့ နှစ်ခုကြား ချိတ်ဆက်မှုကို Notation Engine မှတစ်ဆင့်သာ သီးခြားစီ လုပ်ဆောင်သည်။ Writer Engine ၏ အသေးစိတ် (တည်နေရာ၊ API) ကို နောက်ထပ်ဆွေးနွေးပြီးမှ သတ်မှတ်မည်။

## 2. Frontend technology options

အောက်ပါ technologies များကို project အလိုက် အသုံးပြုနိုင်သော candidate options အဖြစ် ထည့်သွင်းစဉ်းစားမည်။ Framework အားလုံးကို application တစ်ခုတည်းထဲတွင် တပြိုင်နက် မသုံးဘဲ product requirements နှင့် team workflow အပေါ်မူတည်၍ primary frontend stack တစ်ခုကို ရွေးချယ်မည်။

| Technology | အသုံးပြုနိုင်သည့်နေရာ | Plan ထဲတွင် အခန်းကဏ္ဍ |
|---|---|---|
| React + Vite | Fast SPA, dashboard, interactive music tools | Primary SPA candidate |
| Next.js | SSR/SEO, routing, full-stack web features | SEO နှင့် server rendering လိုအပ်ပါက candidate |
| Svelte + SvelteKit | Lightweight၊ performance-focused application | Alternative frontend candidate |
| Vue + Nuxt | Structured Vue application, SSR/SEO | Alternative frontend candidate |
| Angular | Large team နှင့် strict enterprise architecture | Enterprise-scale alternative |
| Tailwind CSS | Responsive design system နှင့် reusable UI styling | Framework-independent styling layer |
| React Native Web | Web နှင့် mobile UI ကို component sharing လုပ်ရန် | Mobile roadmap ရှိပါက optional extension |

### Initial recommendation

ပထမဆုံး production frontend အတွက် **React + Vite + Tailwind CSS** ကို အဓိက candidate အဖြစ်ထားမည်။ Dashboard, course cards, music player controls နှင့် responsive Header/Sidebar များကို reusable components အဖြစ် ခွဲရေးရန် လွယ်ကူပြီး Cloudflare Pages သို့ static build deploy လုပ်ရန်လည်း ရိုးရှင်းသည်။

SEO-heavy public landing pages, server rendering သို့မဟုတ် route-level server features လိုအပ်လာပါက **Next.js** ကို ပြောင်းရွေးနိုင်သည်။ SvelteKit, Nuxt, Angular နှင့် React Native Web တို့ကို product scope ပြောင်းလဲလာချိန်တွင် architecture review ပြုလုပ်ပြီးမှ ရွေးချယ်မည်။

> **2026-11-23 ဆုံးဖြတ်ချက်:** လက်ရှိ site သည် static HTML/JS + Cloudflare Workers Static Assets (`Website/Website/`) ဖြစ်ပြီး Notation Lab၊ Create Video၊ Studio များကို ဤ stack ဖြင့် တည်ဆောက်ပြီးဖြစ်သည်။ ထို့ကြောင့် **ဤ stack ဖြင့် ဆက်သွားမည်**။ React + Vite သည် Dashboard၊ Store၊ Lessons ကဲ့သို့ state များသော page များ စတင်သည့်အခါမှ ပြန်စဉ်းစားမည့် candidate အဖြစ်သာ ထားသည်။

## 3. Backend architecture

Backend အတွက် **Supabase** ကို အဓိကအသုံးပြုမည်။ Frontend မှ Supabase ကို တိုက်ရိုက်သုံးနိုင်သည့်အရာများနှင့် server-side logic လိုအပ်သည့်အရာများကို ခွဲထားမည်။

- **Supabase Postgres** — users, profiles, courses, lessons, music notes metadata, purchases, playlists နှင့် application records များ
- **Supabase Auth** — sign up/sign in, session management, user identity နှင့် role-based access
- **Supabase Edge Functions သို့မဟုတ် Cloudflare Worker APIs** — payment/webhook, privileged operations, signed upload/download URL, third-party integrations နှင့် business rules
- **Row Level Security (RLS)** — user-owned records နှင့် private content များကို database layer တွင် ကာကွယ်မည်
- **Database migrations** — schema ပြောင်းလဲမှုများကို version-controlled SQL migrations ဖြင့် ထိန်းမည်

Supabase service-role key ကို browser code ထဲသို့ မထည့်ရ။ Browser တွင် public anon/publishable key နှင့် RLS ကိုသာ အသုံးပြုမည်။ Privileged operation များကို server-side function မှတစ်ဆင့်သာ လုပ်မည်။

## 4. File and media storage

Photo data သာမက audio, video, PDF, music notation files နှင့် user uploads များကို **Cloudflare R2** တွင် သိမ်းမည်။ Database ထဲတွင် binary file မသိမ်းဘဲ object key, owner, MIME type, size, checksum, visibility, status နှင့် created time စသည့် metadata များကိုသာ သိမ်းမည်။

- Upload/download ကို Cloudflare Worker သို့မဟုတ် server-side API မှ signed URL ဖြင့် ထိန်းမည်။
- Public asset နှင့် private asset ကို bucket/prefix နှင့် access policy အရ ခွဲမည်။
- R2 object key ကို application data ထဲတွင် business meaning မပါသော stable ID ဖြင့် သတ်မှတ်မည်။
- Photo, audio, video အတွက် size/type validation နှင့် virus/content validation flow ထည့်မည်။
- Frontend သည် R2 bucket credential ကို မမြင်ရ၊ မသုံးရ။
- CDN/cache headers နှင့် thumbnail/preview strategy ကို media type အလိုက် သီးခြားသတ်မှတ်မည်။

## 5. Deployment

အဓိက deployment platform ကို **Cloudflare** အဖြစ်ထားမည်။ Frontend build ကို Cloudflare Pages သို့မဟုတ် Pages-compatible deployment ဖြင့် တင်မည်။ API, signed URL, webhook နှင့် lightweight server logic များကို Cloudflare Workers တွင် တည်ဆောက်နိုင်မည်။ R2 သည် Cloudflare account အတွင်း object storage အဖြစ် အသုံးပြုမည်။

Environment variables နှင့် secrets များကို local source code သို့ commit မလုပ်ဘဲ Cloudflare project secrets နှင့် local `.env` (gitignored) ဖြင့် ထိန်းမည်။ Production, preview နှင့် development environment များကို သီးခြားခွဲမည်။

## 6. နောက်ပိုင်း AWS သို့ ပြောင်းနိုင်ရန် portability rules

နောက်ပိုင်း frontend နှင့် backend ကို AWS သို့ ပြောင်းနိုင်ရန် Cloudflare-specific code ကို application core ထဲသို့ မဖြန့်ကျက်ဘဲ adapter boundary ထားမည်။

- Storage အတွက် `StorageService` interface သတ်မှတ်ပြီး R2 adapter နှင့် နောက်ပိုင်း S3 adapter ကို သီးခြားထားမည်။ R2 သည် S3-compatible API ဖြစ်သောကြောင့် object operations များကို standard S3 semantics အတိုင်းရေးမည်။
- Database access ကို Supabase client calls နေရာတိုင်းတွင် ဖြန့်မရေးဘဲ repository/service layer ထားမည်။ PostgreSQL-compatible schema, SQL migrations နှင့် export/restore procedure များကို ထိန်းသိမ်းမည်။
- Authentication ကို UI components ထဲတွင် vendor-specific မဖြစ်စေဘဲ `AuthService` boundary ထားမည်။ Supabase Auth မှ AWS Cognito သို့ ပြောင်းရာတွင် application user ID mapping ကို ထိန်းမည်။
- Business logic ကို Cloudflare Worker-specific API များနှင့် မချိတ်ဘဲ standard HTTP API/service contracts ဖြင့် ရေးမည်။ နောက်ပိုင်း AWS Lambda, ECS သို့မဟုတ် container runtime သို့ ပြောင်းနိုင်မည်။
- Configuration ကို environment variables ဖြင့်သာ ထိန်းပြီး Cloudflare bindings, Supabase URL/key နှင့် AWS endpoint များကို source code ထဲတွင် hard-code မလုပ်ရ။
- Infrastructure ကို နောက်ပိုင်း Terraform/OpenTofu ဖြင့် Cloudflare နှင့် AWS resources နှစ်မျိုးစလုံးအတွက် ပြန်ဖော်ပြနိုင်အောင် naming, secrets နှင့် resource ownership ကို စနစ်တကျ ထားမည်။

## 7. အကောင်အထည်ဖော်မည့်အဆင့်များ

> **လက်ရှိ ဦးစားပေး (2026-11-23):** Create Video နှင့် Notation Lab ကို အရင်ဆောက်နေပြီး Notes Store၊ Lessons နှင့် Backend (Supabase) ကို နောက်မှ လုပ်မည်။ ထို့ကြောင့် အောက်ပါ Phase 1 (backend first) သည် မူလအစီအစဉ်ဖြစ်ပြီး လက်ရှိ အလုပ်လုပ်နေသော အစဉ်အတိုင်း မဟုတ်ပါ။ Backend ကို ရောင်းချမှု/account လိုအပ်လာသည့်အချိန်တွင် စမည်။

### Phase 1 — Foundation and backend first

- Frontend primary stack ကို finalise လုပ်ခြင်း
- Supabase project, database schema, migrations နှင့် RLS policies တည်ဆောက်ခြင်း
- Auth flow နှင့် user/profile model တည်ဆောက်ခြင်း
- R2 bucket, object naming, upload metadata နှင့် signed URL flow တည်ဆောက်ခြင်း
- API contracts နှင့် backend integration tests ရေးခြင်း

### Phase 2 — Frontend foundation

- React + Vite + Tailwind CSS ဖြင့် app shell တည်ဆောက်ခြင်း
- လက်ရှိ Header Bar ကို component အဖြစ် ပြောင်းခြင်း
- Responsive navigation, routing, auth state နှင့် API client ချိတ်ဆက်ခြင်း
- Shared design tokens, typography, colors နှင့် accessibility rules သတ်မှတ်ခြင်း

### Phase 3 — Core product features

- Dashboard နှင့် profile
- Courses နှင့် lessons
- Music Notes Store နှင့် library
- Video Studio/upload workflow
- Notation viewer နှင့် media preview

### Phase 4 — Cloudflare delivery

- Cloudflare Pages/Workers deployment pipeline
- လက်ရှိ nested static asset structure အတွက် repository root မှ `npx wrangler deploy --config Website/Website/wrangler.jsonc` ဖြင့် deploy လုပ်ခြင်း
- Preview နှင့် production environments
- R2 CDN/cache policy
- Logging, error monitoring, backups နှင့် rollback procedure

### Phase 5 — AWS migration readiness

- StorageService, AuthService, DatabaseRepository နှင့် API adapter boundaries စစ်ဆေးခြင်း
- Supabase Postgres export/restore drill
- R2 မှ S3 သို့ object sync test
- Cloudflare Worker API ကို AWS runtime တွင် local/container compatibility test
- Migration runbook, DNS cutover နှင့် rollback plan ရေးခြင်း

## 8. Quality and testing rules

Backend API နှင့် integration များကို frontend feature development မစမီ အရင်ဆုံး စမ်းသပ်မည်။ Database migrations, RLS, auth permissions, upload/download authorization, file validation နှင့် error responses အတွက် automated tests ထားမည်။ Frontend တွင် unit/component tests, responsive viewport checks, accessibility checks နှင့် API contract tests ထည့်မည်။ Cloudflare deployment မတင်မီ preview environment တွင် end-to-end smoke test ပြုလုပ်မည်။

## 9. လက်ရှိအခြေအနေ နှင့် Header UI/UX scope

(2026-11-23 မှတ်ချက် — ဤ section သည် Header အပိုင်းကိုသာ ဖော်ပြသည်။ Notation Lab၊ Create Video၊ Studio တို့၏ လက်ရှိအခြေအနေကို အောက်ပါ သက်ဆိုင်ရာ section များတွင် ကြည့်ပါ။) Header အပိုင်းတွင် Header Bar နှင့် phone bottom navigation ကို တည်ဆောက်ပြီးဖြစ်သည်။ Sample music-platform UI board ကို visual reference အဖြစ် အသုံးပြုထားသော်လည်း Hero, dashboard, course cards, music-note cards နှင့် အခြား page content များကို မစတင်ရသေးပါ။

### ပြီးစီးထားသည်

- Web Header ကို fixed အဖြစ်ထားပြီး logo ကို home link အဖြစ် သတ်မှတ်ထားသည်။
- Web Header အလယ်ဗဟိုတွင် `Courses`, `Store`, `Create Video`, `Notation Lab` navigation များ ထည့်ထားသည်။
- Web Header ၏ ညာဘက်တွင် Search, EN/MM, Dark/Light, Favorite, Cart, Notification နှင့် Account controls ထည့်ထားသည်။
- မတောင်းထားသော `Home Page` နှင့် `Library` menu များကို မထည့်ထားပါ။
- Phone အပေါ် Header တွင် Menu, Logo, Search နှင့် Notification ပဲ ပြထားသည်။
- Phone အောက် fixed bar တွင် `Home`, `Courses`, `Store`, `Create Video`, `Notation Lab`, `Account` tabs ခြောက်ခု ထည့်ထားသည်။
- Mobile menu toggle, active tab state, theme toggle နှင့် EN/MM indicator toggle တို့ ထည့်ထားသည်။
- Cloudflare Workers Static Assets အတွက် `wrangler.jsonc`, `_headers` နှင့် cache-busting asset versioning ထည့်ထားသည်။
- Header ကို ပိုမိုသေးငယ်အောင် ပြုလုပ်ပြီး (web `60px`, phone `56px`) `styles.css` ကို remote `@import` မှ local CSS အစစ်သို့ ပြောင်းထားသည်။
- Page လေးခုလုံး (`index.html`, `notation.html`, `notation-editor.html`, `studio.html`) တွင် Header markup, icon နှင့် stylesheet query တူညီအောင် ညှိထားသည်။ အသုံးမပြုသော `header-compact.css` ကို ဖယ်ရှားထားသည်။
- GitHub `main` branch သို့ push လုပ်ပြီး Wrangler dry-run နှင့် static HTTP checks ပြုလုပ်ထားသည်။

### မပြီးသေးသည်

- Header controls များကို Supabase shared backend နှင့် မချိတ်ရသေးပါ။
- Account authentication, Favorites, Cart နှင့် Notifications data flow မစတင်ရသေးပါ။
- Phone bottom tabs နှင့် Web navigation အတွက် real routes/page components မတည်ဆောက်ရသေးပါ။
- Frontend framework — **ဆုံးဖြတ်ပြီး**: လက်ရှိ static HTML/JS + Cloudflare Workers Static Assets ဖြင့် ဆက်သွားမည် (§2)။
- Supabase schema, RLS, auth နှင့် backend API မစတင်ရသေးပါ။
- Cloudflare R2 upload/download နှင့် media metadata integration မစတင်ရသေးပါ။
- Hero, Dashboard, Courses နှင့် Store page UI မစတင်ရသေးပါ။ (ဆက်လာသော အချက်များသည် 2026-11-13 အခြေအနေ မှတ်တမ်းဖြစ်ပြီး အများစု ပြီးစီးပြီ — လက်ရှိအခြေအနေကို နောက်ပိုင်း section များတွင် ကြည့်ပါ။) Notation Lab ကို သီးခြား route အဖြစ် ဖန်တီးပြီး MusicXML render, Page/Horizontal view, PDF export နှင့် Sound Engine event bridge အခြေခံကို ထည့်သွင်းထားသည်။ Create Video အတွက် further compact responsive tool-selection page prototype ကို တည်ဆောက်ပြီး Piano, Drums, Guitar, Bass, Strings, Voice, Metronome နှင့် More tools cards ထည့်ထားသည်။ Web View တွင် tool cards ၅ ခုစီ တစ်တန်းပေါ်ပြီး tablet တွင် ၃ ခု၊ phone တွင် ၂ ခု ပေါ်ရန် grid plan သတ်မှတ်ထားသည်။ Tool box တစ်ခုခုကိုနှိပ်လျှင် Create Video Page အောက်တွင်မဟုတ်ဘဲ shared `studio.html?tool=...` Studio Page သို့ navigate လုပ်မည်။ ထို Studio Page တွင် ဘယ်ဘက် instrument control panel နှင့် ညာဘက် Video preview panel ပါမည်။ Drum ကို ပထမဆုံးအဖြစ် Kick, Snare, Hi-hat, Tempo နှင့် recording controls ဖြင့် စတင်အကောင်အထည်ဖော်ထားသည်။ Dark/Light Mode သည် selection page နှင့် Studio Page နှစ်ခုလုံးရှိ surfaces, text contrast, cards, controls, preview နှင့် mobile navigation များအပေါ် သက်ရောက်ရမည်။ Hero နှင့် cards များကို web/phone view နှစ်မျိုးလုံးတွင် မျက်နှာပြင်မလွှမ်းမိုးစေရန် spacing နှင့် scale လျှော့ထားပြီး Logo ကို `#home` anchor သို့ ချိတ်ထားသည်။ Phone layout တွင် fixed navigation ကို မထိခိုက်စေရန် content safe space နှင့် compact breakpoint overrides များကို စစ်ဆေးပြီးပြီ။ နောက်တစ်ဆင့်တွင် card များနှင့် Studio Page controls များကို recorder, instrument editor, tempo control နှင့် video timeline flow များနှင့် အပြည့်အဝ ချိတ်ဆက်မည်။
- AWS migration implementation မစတင်ရသေးဘဲ နောက်ပိုင်း phase အဖြစ်သာ သတ်မှတ်ထားသည်။

## 10. လက်ရှိ Git/Cloudflare version

Header နှင့် mobile bottom navigation source များကို GitHub repository ၏ `main` branch တွင် ထိန်းထားသည်။ လက်ရှိ website deployment files များသည် `Website/Website/` အတွင်းတွင်ရှိပြီး Cloudflare deploy configuration အတွက် `Website/Website/wrangler.jsonc` ကို အသုံးပြုရမည်။ Commit history တွင် implementation နှင့် cache-busting ပြင်ဆင်ချက်များကို သီးခြားစစ်ဆေးနိုင်သည်။

## 11. Documentation နှင့် Plan update workflow

Website နှင့်ပတ်သက်သည့် implementation, UI/UX, deployment, configuration, bug fix သို့မဟုတ် refactor အလုပ်တစ်ခု ပြီးတိုင်း `Website/Doc/` အတွင်းတွင် အလုပ်မှတ်တမ်း၊ ပြောင်းလဲခဲ့သည့် paths၊ စမ်းသပ်မှုရလဒ်နှင့် မပြီးသေးသည့်အချက်များကို update လုပ်ရမည်။ Document အသစ်ဖန်တီးပါက `Website/Doc/README.md` တွင် link ထည့်ရမည်။

Plan, architecture decision, implementation sequence သို့မဟုတ် အလုပ်လုပ်သည့်ပုံစံကို ပြောဆို/ပြောင်းလဲသည့်အခါ `Website/Plan/README.md` သို့မဟုတ် သက်ဆိုင်ရာ `Website/Plan/` document ကို တစ်ပြိုင်နက် update လုပ်ရမည်။ UI/UX ကို ဖုန်းနှင့် web app/desktop နှစ်မျိုးလုံးအတွက် အစကတည်းက responsive ရေးပြီး အနည်းဆုံး viewport တစ်မျိုးစီတွင် စစ်ဆေးရမည်။ Code နှင့် သက်ဆိုင်ရာ Doc/Plan update များကို အတူတကွ commit လုပ်ပြီး စစ်ဆေးမှုအောင်မြင်လျှင် ချိတ်ဆက်ထားသော GitHub repository/branch သို့ push လုပ်ရမည်။ Push မတိုင်မီ remote ကို fetch လုပ်၊ remote changes ရှိလျှင် ပေါင်းစည်းပြီး၊ push ပြီး commit SHA ကို အတည်ပြုရမည်။ GitHub push သည် deployment ကို အလိုအလျောက်ခွင့်ပြုခြင်းမဟုတ်ပါ။ အသေးစိတ်စည်းမျဉ်းကို [Website Development Documentation Workflow](../Doc/Development-Workflow.md) တွင် ထားရှိသည်။

### Create Video UI copy rule

Create Video နှင့် Studio Page များတွင် explanatory marketing copy မထည့်ဘဲ page title, tool name နှင့် လုပ်ဆောင်ချက်အတွက် လိုအပ်သော control label များကိုသာ ထားမည်။ `Performance canvas` ကဲ့သို့ မလိုအပ်သော presentation label များကို မသုံးရ။

### Video preview controls

Studio Page ၏ Video preview controls များကို preview အပေါ်တွင် overlay မလုပ်ဘဲ အောက်တွင်ထားမည်။ Play/Pause, timeline seek နှင့် Full screen ကို အခြေခံ control များအဖြစ် ထည့်ထားပြီး နောက်ပိုင်းတွင် actual video source နှင့် timeline data model ချိတ်ဆက်မည်။

### Fullscreen exit behavior

Video preview fullscreen ဝင်ပြီးနောက် control bar ထဲတွင် Exit Full Screen button ကို ဆက်လက်မြင်ရမည်။ Button သည် `×` အဖြစ် ပြောင်းပြီး click သို့မဟုတ် browser `Esc` ဖြင့် fullscreen မှ ပြန်ထွက်နိုင်ရမည်။

## Notation Lab Page — 2026-11-13

> **2026-11-15 မှတ်ချက်:** ဤ section ထဲက viewer UI (အောက်ခြေ fixed dock, `Choose file` ခလုတ်၊ viewer controls) နှင့် အောက်က sub-section သုံးခုသည် အစောပိုင်း baseline ဖြစ်သည်။ Notation Lab ၏ လက်ရှိ UI/UX flow ကို [Notation Lab UI/UX Plan](#notation-lab-uiux-plan--revised-2026-11-15) section တွင် ကြည့်ပါ။ Engine, Sound Engine bridge နှင့် PDF export ဆိုင်ရာ အချက်များ မပြောင်းပါ။

Notation Lab ကို လက်ရှိ static-site architecture အတိုင်း `Website/Website/notation.html` route အဖြစ် ဆက်လက်တည်ဆောက်မည်။ Page တွင် hero/banner နှင့် မလိုအပ်သော explanatory copy မပါစေရ။ `.musicxml`, `.xml`, `.mxl` ကို Notation Engine browser bundle (`NotationEngine.renderFromMusicXml`, `unzipMxl`) ဖြင့် notation ပြသမည်။ `layout.mode` ကို `page` နှင့် `scroll` အကြား ပြောင်းနိုင်ပြီး ထွက်လာသော SVG ကို Engine ၏ `exportPdf()` ဖြင့် PDF ထုတ်မည်။ MusicXML ဖိုင်ရွေးရန် ကြီးမားသော box မထားဘဲ `Choose file` ခလုတ်ငယ်တစ်ခုသာထားမည်။ အဆိုပါခလုတ်နှင့် view/playback/volume/PDF controls ကို viewport အောက်ခြေရှိ fixed dock တွင်ထားပြီး ဖုန်းတွင် mobile bottom navigation အပေါ်ဘက်၌ ပြသမည်။

Playback/audio ကို Notation Engine ထဲတွင်မထည့်ဘဲ သီးခြား Sound Engine က တာဝန်ယူမည်။ Sound Engine source သည် လက်ရှိ repo ထဲတွင် မရှိသေးသောကြောင့် UI က `notationlab:*` browser event bridge မှတစ်ဆင့် playback data နှင့် volume ကိုပို့မည်။ Sound Engine မချိတ်ဆက်မချင်း အသံထွက်သည်ဟု မပြဘဲ connection status ကိုသာပြမည်။

လက်ရှိအဆင့်တွင် import, notation render, view switch, PDF export UI နှင့် audio bridge အခြေခံကို ထည့်သွင်းထားသည်။ Sound Engine ၏ တကယ့် playback ချိတ်ဆက်မှုနှင့် browser end-to-end စစ်ဆေးမှုကို နောက်အဆင့်တွင် ပြုလုပ်မည်။ Implementation record: [Notation Lab Page](../Doc/Notation-Lab-Page.md).


### Notation Lab: maximize score workspace

Score ကြည့်ရှုသည့်နေရာတွင် ပိုမိုနေရာရစေရန် အဓိကမျက်နှာပြင်ပေါ်ရှိ ထပ်နေသော `Notation Lab` ခေါင်းစဉ်၊ ဖိုင်အမည်နှင့် အောင်မြင်မှုအခြေအနေ စာသားကို ဖျောက်ပြီး `h1` နှင့် live status ကို assistive technology အတွက် ထားမည်။ အမှား၊ ဖိုင်ရွေးခြင်း သို့မဟုတ် Engine ပြဿနာ ဖြစ်သည့်အခါသာ status ကို မြင်ရအောင်ပြပြီး လိုအပ်သော အချက်အလက်ကို ထိန်းကာ screen နေရာကို သက်သာစေမည်။


### Notation Lab: full-width canvas and zoom

Notation ကို card ပုံစံဘောင်ထဲမထည့်ဘဲ website workspace အကျယ်အတိုင်း ပြသမည်။ အောက်ခြေ fixed toolbar ထဲတွင် Play ခလုတ်ဘေး၌ zoom အနီး/အဝေးခလုတ်များနှင့် လက်ရှိရာခိုင်နှုန်းကို ထည့်မည်။ ချဲ့နိုင်သည့်အကွာအဝေးကို 50%–200% သတ်မှတ်ပြီး Page/Horizontal view ပြောင်းရာတွင် လက်ရှိ zoom ကို ဆက်ထိန်းမည်။


### Notation Lab: compact responsive toolbar

Page နှင့် Horizontal ကို ခလုတ်နှစ်ခုအစား ရွေးချယ်စရာနှစ်ခုပါသော dropdown တစ်ခုအဖြစ်ထားမည်။ Phone တွင် `Choose file`, dropdown နှင့် PDF icon ကို အတန်းတစ်တန်း၊ Play/zoom/volume ကို နောက်တစ်တန်းတွင်ထား၍ fixed dock ၏ အမြင့်နှင့် control နေရာကို လျှော့မည်။ PDF icon သည် screen reader အတွက် `Download PDF` အမည်ကို ဆက်လက်ဖော်ပြမည်။ Desktop တွင် PDF စာသားကို ဆက်လက်ပြမည်။

## Create Video — Engine workflow — 2026-11-13
Create Video သည် video များဖန်တီးရန်အတွက် ဖြစ်သည်။ Drum ကိုရွေးပြီး Drum ထဲဝင်လျှင် Drum video ဖန်တီးမည်။ Piano video ဖန်တီးရန် Piano ထဲသို့ ဝင်ရမည်ဖြစ်ပြီး Piano workflow သည် Drum workflow နှင့် မတူပါ။ Engine တစ်ခုချင်းစီ၏ အကောင်အထည်ဖော်ပုံ၊ ချိတ်ဆက်ပုံအစီအစဉ်နှင့် မသတ်မှတ်ရသေးသော ကွာခြားချက်များကို အသုံးပြုသူ၏ နောက်ထပ်လမ်းညွှန်ချက်အတိုင်း ဆက်လက်သတ်မှတ်မည်။

### Shared engine placement and reuse
Notation Engine, Sound Engine နှင့် Video Engine တို့ကို သီးခြားတည်နေရာတစ်ခုစီတွင် တစ်ခုတည်းထားပြီး လိုအပ်သော video workflow များက ချိတ်ဆက်အသုံးပြုမည်။ **Video Engine** သည် Drum အတွက်သာမဟုတ်ဘဲ Piano နှင့် နောင်ထပ်ထည့်မည့် video ဖန်တီးမှုများတွင်လည်း အသုံးပြုမည့် shared Engine ဖြစ်သောကြောင့် `Website/Drum/` အတွင်း မထားရ။ Engine ကို feature folder တစ်ခုစီတွင် ထပ်မံကူးယူ/တည်ဆောက်မည့်အစား ၎င်း၏ သီးခြားတည်နေရာမှ ပြန်လည်အသုံးပြုမည်။

### Drum video workflow
- ပါဝင်မည့် Engine များ — **Notation Engine, Sound Engine, Video Engine, Drum Human Stick Engine, Drum Animation Engine, Audio Engine**။ Drum Human Stick Engine ၏ တာဝန် (Drum တီးသူ stick ၏ လှုပ်ရှားမှု) ကို [Engine တာဝန်ခွဲခြားမှု](#၁၀။-engine-တာဝန်ခွဲခြားမှု-ဆုံးဖြတ်ချက်) ဇယားတွင် သတ်မှတ်ပြီး။
- **Notation Engine** က note များကို ပြသမည်။ **Sound Engine** က အဆိုပါ note များအတိုင်း အသံထုတ်ပေးမည်။
- Drum video အတွက် လိုအပ်သော photo/data များကို Cloudflare R2 ထဲတွင် ထားမည်။ **Video Engine** က အရည်အသွေးကောင်းပြီး ချောမွေ့သော video file ထုတ်လုပ်ရာနှင့် R2 ထဲရှိ file များကို အသုံးပြုရာတွင် ကူညီမည်။
- **Drum Animation Engine** က Drum video အတွင်း ဘယ်ပုံကို ဘယ်အချိန်တွင် highlight လုပ်ရမည်အပါအဝင် animation ဆိုင်ရာအလုပ်များကို ကိုင်တွယ်မည်။

### Piano video workflow
- ပါဝင်မည့် Engine များ — **Notation Engine, Sound Engine, Video Engine, Piano Hand Human Engine, Piano Animation Engine, Audio Engine**။ Piano အတွက် 3D hand ကို လှုပ်ရှားစေမည့် သီးခြား **Piano 3D Hand Engine** ကိုလည်း တည်ဆောက်မည်။ Piano body ကိုလည်း 3D model အဖြစ် အသုံးပြုမည်။ Piano body နှင့် Drum workflow အကြား အသေးစိတ်ကွာခြားချက်များကို နောက်ထပ်ညွှန်ကြားချက်ရရှိပြီးမှ သတ်မှတ်မည်။
- **Notation Engine** က note များကို ပြသပြီး **Sound Engine** က အဆိုပါ note များအတိုင်း အသံထုတ်ပေးမည်။ **Video Engine** က အရည်အသွေးကောင်းပြီး ချောမွေ့သော video file ထုတ်လုပ်ရာနှင့် လိုအပ်သော file များကို အသုံးပြုရာတွင် ကူညီမည်။
- **Piano Hand Human Engine** က note တစ်လုံးချင်းအတွက် ဘယ်လက်/ညာလက်နှင့် ဘယ်လက်ချောင်းဖြင့် တီးရမည်ဆိုသော data ကို ပေးမည်။ **Piano 3D Hand Engine** က ထို data အတိုင်း 3D လက်လှုပ်ရှားမှုကို ပြမည်။
- **Piano Animation Engine** (သီးခြား) က Piano ခလုတ်များကို အရောင်ဖြင့် highlight လုပ်ခြင်းနှင့် အခြား animation ဆိုင်ရာအလုပ်များကို လုပ်မည်။ Engine တစ်ခုက အလုပ်တစ်မျိုးသာ လုပ်သည်ဟူသော မူအရ Drum Animation Engine ကို Piano တွင် မသုံးပါ။

## Notation Lab UI/UX Plan — revised 2026-11-15

အရင်းအမြစ်: `Website/Plan/Notation-Lab-UI-UX-Plan.md` (ထိုဖိုင်ကို မဖျက်ဘဲ ထိန်းထားသည်။ ဤ section သည် ၎င်း၏ အကြောင်းအရာကို Main Plan ထဲသို့ ပေါင်းထည့်ထားခြင်းဖြစ်သည်။)

**Status:** Active — revised 2026-11-15

### Product flow

Notation Lab starts as a focused entry screen. It must not expose the previous viewer or composer controls before a user chooses an intent.

1. **Open File** opens a file picker for supported score files. After a valid selection, the user is sent to the Editor with that file.
2. **Create** sends the user directly to the Editor to start a new score.
3. **Scan** is visually present but disabled and labelled **Coming soon**. No scan/upload workflow is implied or implemented.

### Entry-screen requirements

- Use three equally clear action boxes: Open File, Create, and Scan.
- Keep the page lightweight, responsive, keyboard-accessible, and free of the old notation canvas, bottom dock, playback, composer, diagnostics, and marketing-style workspace UI.
- Give each action a concise explanation and a clear disabled state for Scan.
- Preserve the existing site header and mobile navigation for brand consistency.

### Editor handoff

- The Editor is a dedicated route. It receives either a create intent or a selected local file.
- File transfer and editor implementation details will be expanded only after the entry screen is accepted.
- The current score composer implementation is removed; it is not the baseline for the new editor.

### Delivery sequence

1. Remove the composer enhancement and the old Notation Lab landing-workspace UI.
2. Implement the three-action entry page.
3. Add the editor route and create/open handoff contract.
4. Update this plan and work log after each accepted editor milestone.
5. Verify keyboard navigation, responsive layout, and file-type validation before publishing.

### Current milestone

Only steps 1–3 are in scope for this revision. Scan remains intentionally unavailable.


### Editor program — added 2026-11-15

The entry page is complete as the first UI milestone. The editor will now follow the score-first architecture and M1–M6 delivery sequence in [Notation Lab Editor — Audit, Product Design, and Capability Plan](../Doc/Notation-Lab-Editor-Architecture-2026-11-15.md).

The editor route now carries the shared site header plus a sticky secondary toolbar and a score workspace (see [Notation Lab Editor — Fixed Toolbar and Score Workspace](../Doc/Notation-Lab-Editor-Toolbar-2026-11-18.md)). Open, create, zoom, layout, playback, and export are live.

> **2026-11-22 မှတ်ချက်:** ဤနေရာတွင် ဖော်ပြထားသော အဟောင်း dock ကို 2026-11-20 တွင် ဖယ်ရှားခဲ့ပြီး 2026-11-22 တွင် shell အသစ် (ဘယ်ဘက်၊ မျှားလေး handle၊ အထဲဗလာ) ပြန်ထည့်ထားသည်။ အသေးစိတ်ကို [Writer Engine — Notation Editor](#writer-engine--notation-editor--2026-11-22) တွင် ကြည့်ပါ။

Note entry, selection model နှင့် undo/redo history သည် ပြီးပြီ (`Notation/Notation Plan/PLAN.md` Part K)။ Sidebar ၏ လက်ရှိအခြေအနေကို [Writer Engine — Notation Editor](#writer-engine--notation-editor--2026-11-22) တွင် ကြည့်ပါ။

### Next editor milestone

1. ✅ **Editable Properties** — ပြီးပြီ (`863b4c7`, `ece0125`)။ Properties panel မှ တန်ဖိုးများကို ပြင်လို့ရပြီး ရှိပြီးသား `commit()` command path ကို ပြန်သုံးသည်။
2. **Page / Horizontal view switch.** `state.layout` exists and both modes render, but the toolbar carries no button for it yet.
   *2026-11-22: ပြီးပြီ — bottom bar တွင် Page / Horizontal segmented control ထည့်ထားသည် (commit `2518fbe`)။*
3. **Session persistence.** The dock's open/closed state and the last panel are not remembered across a reload; the score library already is (`localStorage`).

Scan remains intentionally unavailable.

## Writer Engine — Notation Editor — 2026-11-22

Writer Engine သည် Notation Editor ထဲတွင် လုပ်ဆောင်သမျှကို ပိုင်ဆိုင်သည် — notation ကို ရေးပုံရေးနည်းနှင့် editor operation အားလုံး (note ထည့်/ဖျက်/ရွှေ့၊ marks နှင့် dynamics၊ clef/key/time သတ်မှတ်ခြင်း၊ measure ထည့်/ဖယ်၊ copy/paste၊ selection၊ undo/redo၊ MusicXML သိမ်းခြင်း)။ [Engine architecture](#12-engine-architecture) ကို ကြည့်ပါ။

**ဆုံးဖြတ်ချက်:** Writer Engine ကို `Website` အတွင်း **သီးခြား folder တစ်ခုဖြင့်** သီးခြား module အဖြစ် ခွဲထုတ်တည်ဆောက်မည် (Notation / Video / Guitar Engine များကဲ့သို့)။ Folder အမည်အတိအကျ (အဆိုပြု — `Website/Writer/Writer Engine`) ကို အတည်ပြုရန် ကျန်သည်။

### လက်ရှိအခြေအနေ (main branch, 2026-11-22 စစ်ဆေးချက်)

**Writer Engine ဟူသော သီးခြား module မရှိသေးပါ။** ၎င်း၏ လုပ်ဆောင်ချက်များသည် `Website/Website/` အတွင်း ဖိုင်နှစ်ခုတွင် ကွဲနေသည်။

| ဖိုင် | လက်ရှိ တာဝန် |
|---|---|
| `notation-doc.js` | Score document ပေါ်ရှိ edit command များ။ `insertEvent`, `deleteEvents` (ဖျက်လျှင် အလားတူ rest ထားခဲ့သည် — MuseScore ၏ Delete ကဲ့သို့)၊ `patchEvent` (marks)၊ `setDynamic`၊ `setSetup` (clef/key/time)၊ `insertMeasureAfter`/`removeMeasure` (measure နံပါတ်ပြောင်းလျှင် ဆက်စပ် table များပါ ရွှေ့သည်)၊ `excerpt` (copy) နှင့် `paste`၊ `toMusicXml` (Notation Engine ၏ `writeMusicXml` ကို ခေါ်သည်)။ |
| `notation-editor.js` (၃,၆၀၀ ကြောင်းခန့်) | UI state၊ selection၊ entry cursor၊ undo/redo history (နောက်ဆုံး ၁၀၀ ဆင့်၊ drag တစ်ခုလုံး ၁ ဆင့်)၊ palette marks၊ toolbar နှင့် popover များ၊ Inst. box၊ Mixer (placeholder)၊ keyboard shortcut များ။ |

**အခြေခံစည်းမျဉ်း:** Render လုပ်ထားသော SVG သည် source of truth မဟုတ်ပါ။ Edit တိုင်းသည် structured score document အသစ်တစ်ခု ဖန်တီးပြီး Notation Engine က ပြန် render လုပ်သည်။

**မကြာသေးမီ ပြောင်းလဲမှုများ (commits `2518fbe`, `bdf5896`, `56f757c`):**
- Inst. box တွင် piano ၈၈ ခလုတ် (A0–C8) အကုန်ပြပြီး Shift ဖြင့် chord ရေးနိုင်သည်။ Part အမျိုးအစားအလိုက် drum pads (kit)၊ fretted တူရိယာ၏ string/fret၊ ကျန်တာအတွက် keyboard ပြသည်။
- Grand staff တွင် staff တစ်ခုစီက voice ကိုယ်ပိုင်ဖြင့် ရေးသည် (treble = voice 1၊ bass = voice 2)။
- Chord mode တွင် beat ကို latch လုပ်ထားသည်။
- Bottom bar တွင် Page / Horizontal segmented control ပါပြီ (`state.layout` နှင့် sync)။
- Inst. နှင့် Mixer panel များ မျက်နှာပြင်ပြင်ပ မထွက်စေရန် `backdrop-filter` ပြဿနာ ပြင်ပြီ။

**Sidebar နှင့် Inst. box — လက်ရှိအခြေအနေ (git history စစ်ဆေးချက်):**
- **Inst. box အလျားလိုက်အပြည့်** — commit `9afa500` (2026-11-22) ဖြင့် ပြီးပြီ။ `placeWidePopover` က score workspace ၏ အကျယ်အတိုင်း box ကို ချပြီး တူရိယာအလိုက် keys / pads / fretboard ပြသည်။
- **Sidebar shell** — ဘယ်ဘက်၊ မျှားလေး handle ဖြင့် ဖျောက်ထား၊ handle ကို ထပ်နှိပ် သို့မဟုတ် အခြားနေရာနှိပ်လျှင် ပိတ်၊ Inst. box နှင့် တစ်ခုပွင့်လျှင် ကျန်တစ်ခု auto ပိတ် — commit `51eec10` (2026-11-22) ဖြင့် ပြီးပြီ။ **အထဲ (tabs, palettes) မရှိသေးဘဲ ဗလာဖြစ်သည်။** Palettes tab ကို score နှင့် ချိတ်သော commit `7e9ddb8` ကို `45e871e` ဖြင့် revert လုပ်ထားသည်။
- Dock သမိုင်း: 2026-11-19 ထည့် (`18f6ac9`) → 2026-11-20 ဖယ်ရှား (`ca30ceb`) → 2026-11-22 shell အသစ်အဖြစ် ပြန်ထည့် (`51eec10`)။ `Doc/Notation-Lab-Editor-Sidebar-Dock-2026-11-18.md` သည် အဟောင်း dock ကို ဖော်ပြထားသဖြင့် ခေတ်နောက်ကျနေသည်။
- Guitar: wizard သည် note lines ကို notation / tab / နှစ်ခုလုံး ရွေးခိုင်းပြီး tab staff ပေါ်တွင် ရေးနိုင်အောင် ပြုလုပ်ထားသည် (`a86116a`, 2026-11-21)။ Staff ပေါ်ရေးလျှင် Tab ပါ တစ်ပြိုင်တည်း ပေါ်ခြင်း ရှိမရှိ စစ်ဆေးရန် ကျန်သည်။

### အမည်ပေးခြင်း

- **Inst.** — အသုံးပြုသူ ကိုယ်တိုင်ပေးထားသော အမည်။ Toolbar ပေါ်ရှိ ကိုယ်ပိုင် instrument-entry box (Piano / Percussion / Guitar)။
- **Instruments tab** — Sidebar ထဲရှိ MuseScore ၏ Instruments panel ကဲ့သို့ ပုံမှန် part စာရင်း panel။ ၎င်းနှစ်ခုသည် မတူသောအရာများဖြစ်ပြီး အမည်ခွဲထားမည်။

### လိုအပ်ချက် ၁ — Inst. box (တူရိယာအလိုက်၊ အလျားလိုက် အပြည့်)

- Toolbar ၏ **Inst.** ကိုနှိပ်လျှင် box တစ်ခု တက်လာရမည်။ ထို box သည် editor window ၏ **အလျားလိုက် အကျယ်အပြည့်** ကို ယူရမည် (MuseScore ပုံစံ)။ **အခြေအနေ: ပြီးပြီ** (`9afa500`) — `placeWidePopover` ဖြင့် score workspace ၏ အကျယ်အတိုင်း ချထားသည်။
- ရေးနေသော part အလိုက် box အကြောင်းအရာ ပြောင်းရမည် —

| Part | Box |
|---|---|
| Piano စသော keyboard တူရိယာ | Keyboard (၈၈ ခလုတ်၊ A0–C8) |
| **Drum** | **Percussion** — drum pads၊ MuseScore ကဲ့သို့ အလျားလိုက် အပြည့် |
| **Guitar** | ကြိုးများနှင့် fret များ မြင်ရသော guitar fretboard (flat) — အလျားလိုက် အပြည့် |

- Box ထဲရှိ key / pad / fret ကို နှိပ်လျှင် **အပေါ်ရှိ staff ပေါ်တွင် note ရေးသွားရမည်**။
- **Guitar:** Staff ပေါ်တွင် note ရေးသည်နှင့် **အောက်ရှိ Tab note ပါ အလုပ်လုပ်ရမည်** (staff နှင့် Tab တစ်ပြိုင်တည်း)။ Notation Engine တွင် Tab ဆွဲသော geometry (`geometry/tab.ts`) နှင့် note တစ်လုံးချင်းတွင် string/fret ပါနိုင်သော data ရှိပြီး MusicXML writer တွင်လည်း ပါသည်။ သို့သော် Editor က staff note နှင့် Tab note ကို တစ်ပြိုင်တည်း ရေးပေးခြင်း ရှိမရှိ **စစ်ဆေးရန် ကျန်သည်**။
- ပြင်ပကို နှိပ်လျှင် ပိတ်ခြင်း၊ Box ထဲ toolbar tool နှိပ်လျှင် ဆက်ဖွင့်ထားခြင်း (`56f757c` ၏ အပြုအမူ) ကို ထိန်းမည်။

### လိုအပ်ချက် ၂ — ဘယ်ဘက် sidebar (MuseScore ပုံစံ)

**အပြုအမူ**
1. Sidebar သည် ပုံမှန်အားဖြင့် **ဘေးဘက်တွင် ပျောက်နေ**ပြီး မျှားလေး (arrow handle) တစ်ခုသာ မြင်ရမည်။
2. မျှားလေးကိုနှိပ်လျှင် sidebar ပေါ်လာမည်။
3. မျှားလေးကို ထပ်နှိပ်ခြင်း၊ သို့မဟုတ် sidebar box မဟုတ်သော **အခြားနေရာ တစ်ခုခုကို နှိပ်ခြင်း** ဖြင့် sidebar ပြန်ဝင်သွားမည်။
4. **Inst. box နှင့် sidebar တစ်ပြိုင်တည်း မပွင့်ရ** — တစ်ခု ပွင့်လာလျှင် ကျန်တစ်ခု auto ပိတ်ရမည်။
5. **ဖုန်းတွင်လည်း** ကွန်ပျူတာနှင့် တူညီစွာ (မျှားလေးဖြင့် ဖျောက်ထား၊ နှိပ်လျှင်ပေါ်) အလုပ်လုပ်မည်။

**အကြောင်းအရာ:** MuseScore နှင့် **တစ်ပုံစံတည်း** ဖြစ်ရမည် (အသုံးပြုသူပေးသော MuseScore screenshot အရ)။

- **Tab များ:** `Palettes`၊ `⋯` (အခြား panel များ)၊ `Properties`၊ `Instruments`
- **Palettes tab:** အပေါ်ဆုံးတွင် `Add Palettes` ခလုတ်နှင့် search (ဘီလူး) icon။ အောက်တွင် ဖွင့်/ပိတ်ရသော (မျှားလေးပါသော) palette အုပ်စုများ။ Screenshot ပါ အုပ်စု ၁၃ ခု —
  Clefs · Key signatures · Time signatures · Tempo · Pitch · Accidentals · Dynamics · Articulations · Text · Keyboard · Repeats & jumps · Barlines · Layout
- **အုပ်စုအားလုံး ပေါ်ရမည်:** အထက်ပါ ၁၃ ခုသာမက MuseScore ၏ palette အုပ်စု **အားလုံး** ပါဝင်စေမည်။ အရင်းအမြစ်များတွင် ဖော်ပြထားသော ထပ်ဆောင်းအုပ်စုများ (MuseScore 3 Advanced workspace နှင့် handbook အရ) — Grace notes · Lines · Arpeggios & glissandi · Breaths & pauses · Brackets · Ornaments · Fingering · Noteheads · Tremolos · Breaks & spacers · Beam properties · Bagpipe embellishments · Fretboard diagrams · Frames & measures၊ ထို့အပြင် `Master palette`။ **MuseScore 4 ၏ `Add Palettes` စာရင်းအတိအကျနှင့် နှိုင်းယှဉ်ပြီး အတည်ပြုရန် ကျန်သည်။**
- **Properties tab:** ရွေးထားသော note ၏ တန်ဖိုးများကို ဖတ်ရုံသာမက **ပြင်လို့ရရမည်** (pitch, duration, voice စသည်)။ ပြင်ဆင်မှုများသည် ရှိပြီးသား `commit()` command path နှင့် undo/redo ကို ပြန်သုံးမည်။
- **Instruments tab:** MuseScore ၏ Instruments panel ကဲ့သို့ ပုံမှန်အလုပ်လုပ်ရမည် (score ၏ part စာရင်း၊ part ပြောင်း/ထည့်/ဖယ်)။ Inst. box နှင့် မတူပါ။

**လက်ရှိနှင့် ကွာခြားချက်:** ယခု editor ရှိ marks palette တွင် articulations, ornaments, dynamics, fermata သာရှိသည်။ အုပ်စုအားလုံးကို ဖြည့်ရန် palette အကြောင်းအရာများ ထပ်သတ်မှတ်ရမည်။

### မဖြေရှင်းရသေးသော အချက်များ

1. Writer Engine folder အမည်အတိအကျ (အဆိုပြု `Website/Writer/Writer Engine`)။
2. MuseScore 4 `Add Palettes` စာရင်းအတိအကျ။
3. Editable Properties တွင် ပထမအဆင့်၌ ပြင်လို့ရမည့် field များ (pitch / duration / voice ...)။
4. Guitar staff note ↔ Tab note တစ်ပြိုင်တည်း ရေးခြင်း ယခု အလုပ်လုပ်/မလုပ် စစ်ဆေးခြင်း။
5. (ဖြေပြီး) Sidebar dock ကို 11-20 တွင် ဖယ်ရှားပြီး 11-22 တွင် shell အဖြစ် ပြန်ထည့်ထားသည် (`51eec10`)။

### အကောင်အထည်ဖော်မည့် အဆင့်များ (အဆိုပြုချက် — အတည်ပြုရန်)

1. ✅ ပြီးပြီ (`9afa500`) — Inst. box ကို တူရိယာအလိုက် (Piano / Percussion / Guitar) အလျားလိုက် အပြည့်ယူစေခြင်း။
2. ✅ ပြီးပြီ (`51eec10`) — Sidebar shell — ဘယ်ဘက်၊ ပျောက်နေ၊ မျှားလေး၊ ပြင်ပနှိပ်လျှင် ပိတ်ခြင်း၊ Inst. box နှင့် တစ်ခုပွင့်လျှင် ကျန်တစ်ခုပိတ်ခြင်း။ (အထဲ ဗလာ)
3. ✅ အစိတ်အပိုင်း ပြီးပြီ (`879da48`) — Palettes tab တွင် default အုပ်စု ၁၃ ခု (clefs, keys, times, tempo, accidentals, dynamics, articulations, ornaments, text, repeats, barlines, lines, breaks)၊ `Add Palettes` ဖြင့် ထပ်ထည့်နိုင်သော အုပ်စု ၆ ခု (fermata, pedal, grace notes, tremolos, arpeggios, noteheads)၊ အုပ်စုတစ်ခုချင်း ခေါက်/ဖြန့်၊ search၊ item နှိပ်လျှင် toggle လုပ်ပြီး score ပေါ် ရေးသည်။ **ကျန်ရှိသည် (Plan):**
   - **Default ၁၃ ခုကို သင့် screenshot ၏ MuseScore အစီအစဉ်အတိုင်း ပြောင်းမည်** — Clefs · Key signatures · Time signatures · Tempo · **Pitch** · Accidentals · Dynamics · Articulations · Text · **Keyboard** · Repeats & jumps · Barlines · **Layout**။ ယခု default ထဲရှိ Ornaments နှင့် Lines တို့သည် `Add Palettes` ထဲတွင် ဆက်ရှိမည်။
   - **Keyboard** = ရှိပြီးသား `Pedal` အုပ်စု (အမည်ပြောင်းရုံ)။ **Layout** = ရှိပြီးသား `Breaks & spacers` အုပ်စု (အမည်ပြောင်းရုံ)။
   - **Pitch** = ottava (8va, 8vb, 15ma, 15mb)။ Notation Engine သည် octave-shift ကို parse လုပ်ခြင်း၊ ဆွဲခြင်း (bracket)၊ MusicXML ထဲ ပြန်ရေးခြင်း လုပ်နိုင်ပြီး document ထဲတွင် `octaveShifts` table လည်း ရှိသည်။ သို့သော် Editor ဘက်တွင် ottava ထည့်/ဖယ်ပေးသော command မရှိသေးသဖြင့် **ထိုအပိုင်း အသစ်လိုသည်**။ မှတ်ချက် — MusicXML တွင် `type` သည် notation ရွေ့ရာဘက်ကို ဆိုလိုသဖြင့် 8va = `down` (size 8)၊ 8vb = `up` (size 8)၊ 15ma = `down` (15)၊ 15mb = `up` (15)။
   - Breaths & pauses၊ Brackets၊ Fingering၊ Beam properties၊ Fretboard diagrams၊ Frames & measures စသည့် ကျန်အုပ်စုများ — MuseScore 4 ၏ `Add Palettes` စာရင်းအတိအကျနှင့် နှိုင်းယှဉ်ပြီး အတည်ပြုရန်။
4. ✅ ပြီးပြီ (`863b4c7`, `ece0125`) — Properties tab (ပြင်လို့ရ၊ lyrics ပါ) နှင့် Instruments tab။ `⋯` (more panels) tab သည် မပြီးသေးပါ။
5. Guitar staff ↔ Tab တစ်ပြိုင်တည်း။
6. Writer Engine ကို သီးခြား folder/module အဖြစ် ခွဲထုတ်ခြင်း။

အဆင့်တစ်ခုချင်းစီကို သင် "ready" ဟု ပြောမှသာ စတင်မည်။

## Create Video — Final video layout — 2026-11-22

Create Video မှ ထွက်လာသော final video ကို **အပိုင်း ၃ ပိုင်း** ခွဲပြမည်။ အပိုင်း ၃ ပိုင်းသည် အမြဲတူသော်လည်း တူရိယာတစ်ခုနှင့်တစ်ခု အပိုင်းများ၏ **နေရာ** မတူပါ။ ထို့ကြောင့် Video Engine ၏ layout ကို တူရိယာအလိုက် ပြောင်းလို့ရသော **template** အဖြစ် တည်ဆောက်ရမည် (တူရိယာအသစ်ထည့်တိုင်း Engine ကို ပြန်မရေးဘဲ layout တစ်ခု ထပ်ကြေညာရုံဖြင့် ရစေရန်)။ ၎င်းသည် အပေါ်ဆုံး သတိပေးချက် (instrument အားလုံးအတွက် common အလုပ်ကို Video Engine က လုပ်ရမည်) နှင့် ကိုက်ညီသည်။

### အပိုင်း ၃ ပိုင်း

| အပိုင်း | အကြောင်းအရာ | ဆွဲပေးမည့် Engine |
|---|---|---|
| **Title / Info** | ဘယ်ဘက်တွင် Logo၊ ၎င်းဘေးတွင် Title 1၊ Title 1 အောက်တွင် Title 2။ ထိုတန်းထဲတွင်ပင် `4/4`၊ `BPM`၊ `Key`၊ `Metronome` | Video Engine (Metronome/BPM data၊ Key ကို MusicXML မှ) |
| **Notation** | Notation | Notation Engine |
| **တူရိယာ** | ထုတ်နေသော တူရိယာ (Drum / Piano / Guitar / Violin ...) | Drum Animation Engine၊ Piano Hand Engine စသည့် တူရိယာအလိုက် Engine |

Video Engine သည် ဤအပိုင်း ၃ ခုကို frame တစ်ခုထဲတွင် ပေါင်းဆွဲပေးရမည်။

**မှတ်ချက်:** Metronome tool ၏ video တွင် Title / Info အပိုင်း မပါပါ။

### တူရိယာအလိုက် နေရာချထားပုံ

| တူရိယာ | Title / Info | Notation | တူရိယာ |
|---|---|---|---|
| **Drum**၊ **Piano** | အပေါ်ဆုံး | အလယ် | **အောက်** |
| **Guitar** | **အောက်ဆုံး** | အလယ် | **အပေါ်** |
| **Violin** | **အောက်ဆုံး** | ဘေးတစ်ဖက် | **ဘေးတစ်ဖက်** (ဘယ်/ညာ မသတ်မှတ်ရသေး) |

```
Drum / Piano            Guitar                 Violin
┌───────────────┐    ┌───────────────┐    ┌──────────┬────────┐
│ Title / Info  │    │ Guitar        │    │ Notation │ Violin │
├───────────────┤    ├───────────────┤    │          │        │
│ Notation      │    │ Notation      │    ├──────────┴────────┤
├───────────────┤    ├───────────────┤    │ Title / Info      │
│ Drum / Piano  │    │ Title / Info  │    └───────────────────┘
└───────────────┘    └───────────────┘
```

(Violin ပုံတွင် Violin ကို ညာဘက်တွင် ဥပမာထားထားသည်။ Bass၊ Strings၊ Voice စသည့် အခြားတူရိယာများ၏ နေရာကို နောက်မှ သတ်မှတ်မည်။)

### Notation အပိုင်း

Notation ကို **Page** သို့မဟုတ် **Horizontal (အလျားလိုက်)** ရွေးနိုင်သည်။ ၎င်းတို့သည် Notation Engine ၏ `page` နှင့် `scroll` layout နှစ်မျိုးနှင့် ကိုက်ညီသည်။

| ရွေးချယ်မှု | Notation ရွေ့ပုံ |
|---|---|
| **Horizontal** | ညာဘက်မှ ဘယ်ဘက်သို့ |
| **Page** | အောက်မှ အပေါ်သို့ |

ရွေ့နေသော Notation ပေါ်တွင် အခု တီးနေသော note ကို **Notation Engine ၏ ကိုယ်ပိုင် cursor** ဖြင့် ပြမည် (Notation ၏ အလုပ်ဖြစ်သည်)။

### Metronome — ရေတွက်ပုံ ရွေးချယ်မှု (Studio option box အသစ်)

Video ထဲတွင် ထည့်ရန် ရွေးချယ်ခွင့်ပေးသော box များထဲတွင် Metronome အတွက် **ရေတွက်ပုံ ရွေးသော box** မပါသေးပါ။ ထပ်ထည့်ရမည်။

| ရွေးချယ်မှု | ပြပုံ | ခွဲပုံ |
|---|---|---|
| ၁ | `1, 2, 3, 4` | quarter note |
| ၂ | `1&, 2&, 3&, 4&` | eighth note |
| ၃ | `1e&a, 2e&a, 3e&a, 4e&a` | sixteenth note |

ရှိပြီးသား Metronome Studio ၏ `Count Voice` (အသံဖြင့်ရေတွက်ခြင်း) toggle/type/volume သည် UI သာရှိပြီး render နှင့် မချိတ်ရသေးပါ (Doc: Metronome Studio input controls)။

**ဆုံးဖြတ်ချက်:** ဤ ရွေးချယ်မှုသည် Video ပေါ်တွင် ပြသော ရေတွက်စာသားကိုသာ ပြောင်းသည်။ `Count Voice` ၏ အသံသည် သူ့ကိုယ်ပိုင် သီးခြားအသံဖြစ်ပြီး ဤရွေးချယ်မှုနှင့် မဆက်စပ်ပါ။

### Thank You video (Video အဆုံး)

- Video တိုင်း၏ **အဆုံးတွင်** R2 ထဲရှိ **Thank You video** ဖိုင်ကို ဆက်ပေါင်းထည့်ရမည်။ ၎င်းကို **Video Engine** က လုပ်ပေးရမည်။
- Thank You video ဖိုင်များသည် R2 ထဲတွင် ရှိပြီးသား ဖြစ်ပြီး **Landscape / Portrait / Square အလိုက် သီးခြားဖိုင်များ** ခွဲထားသည်။ Video ၏ output ပုံစံနှင့် ကိုက်ညီသောဖိုင်ကို ရွေးသုံးရမည်။ ဖိုင်အမည်၊ R2 path နှင့် ဖိုင်မရလျှင် ဘာလုပ်မည်ဆိုသည်တို့သည် **Video Engine ၏ တာဝန်** ဖြစ်ပြီး Engine ထဲတွင်သာ ထားမည် (Plan ထဲတွင် မသတ်မှတ်ပါ)။
- **Engine ၏ လက်ရှိအခြေအနေ (2026-11-22 စစ်ဆေးချက်):** Video Engine (`assets/video-engine.js`) သည် `segments` ကို အစဉ်လိုက်ဆက်ပြီး MP4 တစ်ဖိုင်တည်း ထုတ်ပေးနိုင်သည်။ Code ၏ မှတ်ချက်တွင် Video အဓိကနှင့် အဆုံးရှိ Thank You clip ကို ဖိုင်တစ်ခုတည်းဖြစ်စေရန် ရည်ရွယ်ကြောင်း ဖော်ပြထားသည်။ `<video>` ကဲ့သို့ ကိုယ်ပိုင်အမြန်နှုန်းရှိသော source ကို frame တစ်ခုချင်း တောင်းဆိုပြီး စောင့်နိုင်သည်။ သို့သော် Studio page များဘက်တွင် R2 မှ Thank You clip ကို ခေါ်ပြီး အဆုံး segment အဖြစ် ထည့်သော code ကို ရှာမတွေ့ပါ ("thank"/"outro"/"ending" ဖြင့် ရှာဖွေစစ်ဆေးချက်)။ ထို့ကြောင့် Engine ဘက် အခြေခံရှိသော်လည်း page ဘက် ချိတ်ဆက်မှု မရှိသေးဟု ယူဆရသည်။
- Engine ၏ code မှတ်ချက်အရ Thank You clip သည် **optional** (မရလျှင် export ကို မတားပါ)။ အသုံးပြုသူ၏ လိုအပ်ချက်မှာ Video တိုင်းတွင် ထည့်ရမည် ဖြစ်သည်။ မရလျှင် ဘာလုပ်မည်ကို အောက်တွင် မေးခွန်းအဖြစ် ဖွင့်ထားသည်။
- အသံသည် segment အားလုံး၏ အသံကို ပေါင်းပြီး တစ်ပုံတည်း encode လုပ်သဖြင့် Thank You clip ၏ အသံပါ အဆုံးတွင် ချောမွေ့စွာ ဆက်ပေါင်းနိုင်ရမည်။

### ဆုံးဖြတ်ပြီးသော အချက်များ (2026-11-22 နောက်ဆုံး)

- **ရေတွက်ပုံ ရွေးချယ်မှု** သည် Video ပေါ်ရှိ စာသားကိုသာ ပြောင်းသည်။ `Count Voice` အသံသည် သီးခြား။
- **Notation ပေါ်ရှိ တီးနေသော note** ကို Notation Engine ၏ ကိုယ်ပိုင် cursor ဖြင့် ပြမည်။
- **Thank You ဖိုင်အမည်၊ R2 path၊ ဖိုင်မရလျှင် လုပ်ပုံ** — Video Engine ၏ တာဝန်၊ Engine ထဲတွင်သာ ထားမည်။
- **Logo** — R2 ထဲတွင် အမြဲတမ်း ဖိုင်ရှိပြီး (default) အသုံးပြုသူကလည်း ကိုယ်ပိုင်ဖိုင် ထည့်နိုင်သည်။ **Title 1 / Title 2** သည် အသုံးပြုသူ ရိုက်ထည့်သည့်အတိုင်း ပြမည်။ **Video အရှည်** = Count Voice + MusicXML အရှည် + Thank You video။

### Violin နှင့် အခြားတူရိယာ layout (default သတ်မှတ်ချက်)

အသုံးပြုသူ၏ ညွှန်ကြားချက်အရ ကျွန်တော်ဆုံးဖြတ်ထားသော default များ ဖြစ်သည်။ ထုတ်လုပ်ပြီးသော video အစစ်ကို စမ်းကြည့်ပြီးမှ ပြင်ဆင်မည်။

1. **Violin** — Notation ဘယ်ဘက်၊ Violin ညာဘက် (၆၀/၄၀)၊ Title / Info အောက်ဆုံး။
2. **Bass** — Guitar layout ကို ပြန်သုံး (တူရိယာအပေါ်၊ Title / Info အောက်ဆုံး)။ Fretted bass ဖြစ်မှ Guitar Engine ကို ပြန်သုံးနိုင်ကြောင်း အတည်ပြုရန် (Video Engine Plan Phase 3)။
3. **Strings** — Violin layout ကို ပြန်သုံး (ဘေးတစ်ဖက်)။
4. **Voice** — Drum / Piano layout ကို သုံး (waveform/visual ကို အောက်၊ Title / Info အပေါ်)။
5. `Title 1`၊ `Title 2` သည် အသုံးပြုသူ ရိုက်ထည့်သည့်အတိုင်း (ဆုံးဖြတ်ပြီး)။

## Create Video — Video ထုတ်လုပ်ပုံ အသေးစိတ် — 2026-11-22

ဤ section သည် Create Video ၏ video ထုတ်လုပ်သည့် အပိုင်းအားလုံးကို စုစည်းဖော်ပြသည်။ အပိုင်း ၃ ပိုင်း ပြင်အဆင်၏ အကျဉ်းကို အထက်ပါ [Create Video — Final video layout](#create-video--final-video-layout--2026-11-22) တွင်ကြည့်ပါ။ လက်ရှိ code အခြေအနေကို 2026-11-22 တွင် `main` branch မှ ဖတ်စစ်ထားသည်။ တူရိယာတစ်ခုချင်းစီကို Video Engine နှင့် ချိတ်ဆက်ရန် **Adapter Contract (၆ ချက်)** နှင့် **Phase 0–6** အစီအစဉ်ကို [`Website/Video/Video Engine Plan/PLAN.md`](../Video/Video%20Engine%20Plan/PLAN.md) တွင် အသေးစိတ်သတ်မှတ်ပြီးဖြစ်သည်။ ဤ section သည် ထိုအစီအစဉ်နှင့် ကိုက်ညီရမည် (အထူးသဖြင့် — adapter သည် `draw(ctx, atSeconds, frameIndex)` ကို deterministic ဖြစ်စေရမည်၊ လိုအပ်သော asset မရလျှင် export ကို မစတင်ရ၊ adapter သည် encoder/muxer ကို မပိုင်ရ)။

### ၁။ ထုတ်လုပ်မှု လမ်းကြောင်း

```
Studio ၏ options box ──► MusicXML ဖိုင် + settings
                              │
        ┌─────────────────────┼──────────────────────┐
        ▼                     ▼                      ▼
 Title / Info            Notation Engine        တူရိယာ Engine
 (Logo, Title 1/2,       (Page / Horizontal,    (Drum / Piano / Guitar /
  4/4, BPM, Key,          cursor)                Violin ...)
  Metronome)                  │                      │
        └─────────────────────┼──────────────────────┘
                              ▼
        Video Engine — frame တစ်ခုချင်း ၃ ပိုင်းကို ပေါင်းဆွဲ
                              │   + အသံ (Sound Engine, Metronome, Count Voice) ကို AAC တစ်ပုံတည်းပေါင်း
                              ▼
                 Segment: Video အဓိက  ──►  Segment: Thank You (R2)
                              ▼
                       MP4 တစ်ဖိုင်တည်း
```

**Output:** Video Engine သည် H.264 video နှင့် AAC-LC အသံ (48 kHz) ပါသော MP4 တစ်ဖိုင်တည်း ထုတ်ပေးသည်။ လက်ရှိ 30 FPS။ Browser က H.264/AAC ကို encode မလုပ်နိုင်လျှင် ရှင်းရှင်းလင်းလင်း ငြင်းပယ်သည်။ Segment များ (`segments`) ကို အစဉ်လိုက်ဆက်ပြီး အသံကို segment အားလုံးမှ ပေါင်းကာ encode လုပ်သည်။

**အရွယ်အစား (ratio) — Video အားလုံးအတွက် စံတူ (ဆုံးဖြတ်ချက်):** Metronome အပါအဝင် video အားလုံး (တူရိယာအားလုံး) သည် အောက်ပါ အရွယ်သုံးမျိုးသာ ထွက်ရမည်။

| Ratio | Pixel |
|---|---|
| 16:9 Landscape | 1920 × 1080 |
| 1:1 Square | 1080 × 1080 |
| 9:16 Portrait | 1080 × 1920 |

**လက်ရှိ:** Drum Studio သည် ဤအရွယ်များကို သုံးပြီးဖြစ်သည်။ Metronome Studio သည် 1280×720 / 720×720 / 720×1280 ဖြစ်နေသဖြင့် **ပြောင်းရမည်**။ အရွယ်ကို Video Engine ၏ shared setting တစ်ခုတည်းမှ သတ်မှတ်ရမည် (Studio တစ်ခုချင်းစီက ကိုယ်ပိုင်မသတ်ရ)။ 1080p အတွက် memory budget ကို စစ်ရမည်။

### ၂။ Studio ၏ options box (Video ထဲထည့်ရန် ရွေးချယ်စရာများ)

| ရွေးချယ်စရာ | လက်ရှိ code | မှတ်ချက် |
|---|---|---|
| MusicXML ဖိုင် | Metronome Studio တွင် ရှိ၊ Drum Studio သည် MusicXML ကို ကိုယ်တိုင် parse လုပ်၍ drum hit များထုတ်သည် | |
| Title 1 / Title 2 (စာသား၊ အရောင်၊ အရွယ်) | ရှိပြီး (Drum Studio) | **အသုံးပြုသူ ရိုက်ထည့်သည့်အတိုင်း ပြမည်** (ဆုံးဖြတ်ပြီး) |
| Logo | ရှိပြီး — default `assets/logo/m-sharing-drum-logo.svg` + user ကိုယ်ပိုင်ဖိုင်တင်နိုင် | Plan ၏ ဆုံးဖြတ်ချက်မှာ default ကို **R2** ထဲတွင် ထားမည်၊ လက်ရှိတွင် repo ထဲ asset ဖိုင်ဖြစ်သည် |
| Video Ratio | ရှိပြီး (16:9 / 1:1 / 9:16) | |
| Notation View | ရှိပြီး (`Page — Landscape` ပါ) | Plan ၏ **Page / Horizontal** နှင့် ကိုက်အောင် ညှိရန် |
| Video Color | ရှိပြီး | |
| Sound Model + volume | ရှိပြီး (Metronome Studio တွင် UI သာ) | Render နှင့် ချိတ်ရန် ကျန်သည် |
| Count Voice (on/off၊ type၊ volume) | ရှိပြီး | အသံအမျိုးအစားသာ — "1 2 3 4" သို့ "ONE TWO THREE FOUR" |
| **ရေတွက်ပုံ ရွေးချယ်မှု** (`1,2,3,4` / `1&,…` / `1e&a,…`) | **မရှိသေး — အသစ်** | Video ပေါ်ရှိ စာသားကိုသာ ပြောင်း၊ Count Voice အသံနှင့် မဆက်စပ် |
| 4/4 (meter)၊ BPM၊ Key | Metronome Studio တွင် BPM / bars / beats per bar / beat unit ရှိ၊ Drum Studio တွင် မရှိ၊ Key မရှိ | Title / Info အပိုင်းတွင် ပြရမည် |

### ၃။ အပိုင်းတစ်ခုချင်းစီ၏ တာဝန်

**Title / Info**
- ဘယ်ဘက်တွင် Logo၊ ဘေးတွင် Title 1၊ Title 1 အောက်တွင် Title 2။ ထိုတန်းထဲတွင် `4/4`၊ `BPM`၊ `Key`၊ `Metronome`။
- `4/4`၊ `BPM`၊ `Key` ကို **MusicXML မှ ယူမည်** (အတည်ပြုပြီး)။ `Title 1` / `Title 2` ကိုသာ အသုံးပြုသူ ရိုက်ထည့်သည့်အတိုင်း ပြမည်။ `Metronome` သည် beat တိုင်း ကိုယ်ပိုင်ရှိပြီးသား Metronome design များကို ပြန်သုံး၍ပြမည်။
- ဆွဲသူ — Video Engine။ လက်ရှိ Drum video တွင် Logo သည် ညာဘက်ထိပ်တွင်ရှိပြီး (Plan: ဘယ်ဘက်)၊ 4/4 / BPM / Key / Metronome မပါသေး။

**Notation**
- ဆွဲသူ — Notation Engine (`renderFromMusicXml`)။ **Page** (အောက်မှ အပေါ်သို့ရွေ့) နှင့် **Horizontal** (ညာမှ ဘယ်သို့ရွေ့) ရွေးနိုင်မည်။
- တီးနေသော note ကို Notation Engine ၏ ကိုယ်ပိုင် cursor ဖြင့် ပြမည်။
- **လက်ရှိ:** Studio (`studio-video.js`, `studio-metronome.js`) သည် Notation Engine ကို မသုံးသေးပါ။ Drum video သည် ကိုယ်ပိုင် canvas ပေါ်တွင် drum lane (KICK / SNARE / HI-HAT) နှင့် playhead ကိုဆွဲထားသည်။

**တူရိယာအပိုင်း**

| တူရိယာ | Engine | လက်ရှိအခြေအနေ |
|---|---|---|
| Drum | Drum Human Stick Engine (ရှိ)၊ Drum Animation Engine (Plan တွင်သာ၊ code မရှိ) | **တစ်ခုတည်း အလုပ်လုပ်သော instrument။** Drum Animation Engine ၏ တာဝန်မှာ **R2 ထဲရှိ Drum data/ပုံများကို မကျန်အောင် ပြသပေးခြင်း** (လိုအပ်မှသာ ထပ်ထည့်)။ ယခုလက်ရှိ MusicXML event မရှိလျှင် deterministic default drum pattern ဖြင့် ထုတ်သည် |
| Piano | Piano Hand Human Engine (ရှိ)၊ Piano 3D Hand Engine (folder ဗလာ) | Video Engine Plan Phase 2 |
| Guitar | Guitar Engine (ရှိ) | Video Engine Plan Phase 1 (ပထမဦးစားပေး) |
| Violin | Engine folder မရှိသေး | မစတင်ရသေး |
| Bass / Strings / Voice | — | Video Engine Plan Phase 3 / 4 / 5 |

Drum မဟုတ်သော instrument များအတွက် Studio သည် "visual video export is only available in Drum Studio" ဟု ပြပြီး ပိတ်ထားသည်။

### ၄။ Layout template (Video Engine)

- အပိုင်း ၃ ခု၏ နေရာအစီအစဉ်ကို **data ဖြင့်ကြေညာ**ရမည် (တူရိယာတစ်ခုချင်းအတွက် layout တစ်ခု)၊ Engine code ထဲ တူရိယာအလိုက် `if` မရေးရ။ တူရိယာအသစ်ထည့်လျှင် layout တစ်ခု ထပ်ကြေညာရုံဖြင့် ရရမည်။
- တူရိယာအလိုက် နေရာချထားပုံကို [အထက်ပါ ဇယား](#တူရိယာအလိုက်-နေရာချထားပုံ) တွင် ကြည့်ပါ (Drum/Piano — Title အပေါ်၊ တူရိယာအောက် / Guitar — တူရိယာအပေါ်၊ Title အောက် / Violin — ဘေး၊ Title အောက်)။
- Ratio သုံးမျိုး (16:9, 1:1, 9:16) စီအတွက် အပိုင်းတစ်ခုချင်း၏ အချိုး ကွဲမည်ဖြစ်သည်။ အသေးစိတ်ကို မဖြေရှင်းရသေးသော အချက်များတွင် ဖွင့်ထားသည်။

### ၅။ အသံ

- အသံအားလုံးကို Video Engine က segment အားလုံးမှ စုပေါင်း၍ AAC တစ်ပုံတည်း encode လုပ်သည်။
- ရင်းမြစ် — Sound Engine (Notation ၏ အသံ)၊ Metronome click၊ Count Voice။ Metronome adapter သည် ယခု `OfflineAudioContext` ဖြင့် click-track ကို ကိုယ်တိုင်ထုတ်သည် (Shared Sound Engine မဟုတ်)။
- **လက်ရှိ:** `Website/Notation/Sound Egnine` folder သည် `.gitkeep` သာရှိပြီး Video အတွက် Sound Engine မရှိသေးပါ။ Drum video သည် အသံမပါ (silent)၊ Sound Model နှင့် Count Voice settings သည် metadata အဖြစ်သာ သိမ်းထားသည်။ ထို့ကြောင့် အသံပါ Video (အထက်ပါ requirement) သည် Video Engine Plan ၏ **Phase 6** (shared audio) အပေါ် မူတည်သည် — Sound Engine သည် Video အတွက် finite `AudioBuffer` ကို offline ထုတ်ပေးနိုင်ရမည်။

### ၆။ R2 ကို အသုံးပြုပုံ

| အရာ | အခြေအနေ |
|---|---|
| Drum ပုံများ | R2 မှ ယူသုံးရမည် (ဖိုင်စာရင်း မသတ်မှတ်ရသေး) |
| Logo default | R2 ထဲတွင် အမြဲရှိ၊ user ကလည်း ကိုယ်ပိုင်တင်နိုင် |
| Thank You video | R2 ထဲ ရှိပြီးသား၊ Landscape / Portrait / Square သီးခြားဖိုင်၊ Video Engine ၏ တာဝန် |
| SoundFont | R2 versioned prefix (အထက်ပါ Sound Engine section) |

R2 မှ ဖိုင်ကို တစ်ကြိမ်သာ ဖတ်ပြီး cache လုပ်ရမည်၊ frame တိုင်း/ပြန်ပြန် မခေါ်ရ။ ဖိုင်အမည်၊ path၊ မရလျှင် လုပ်ပုံတို့ကို Video Engine ထဲတွင်သာ ထားမည်။

### ၇။ ကန့်သတ်ချက်များ (လက်ရှိ)

- လက်ရှိ code တွင် Drum Studio နှင့် Metronome Studio နှစ်ခုလုံး၏ video အရှည်ကို အများဆုံး ၁၂ စက္ကန့်ဟု ကန့်သတ်ထားသည် (Drum: `MAX_SECONDS = 12`၊ Metronome: 12 စက္ကန့်ကျော်သော setting ကို ပိတ်ထားသည်)။
- **ဆုံးဖြတ်ချက်:** Video အရှည် = **Count Voice + MusicXML ဖိုင်၏ အရှည် + Thank You video** ၃ ခု၏ ပေါင်းလဒ်။ ကိုယ်ပိုင် အရှည်ကန့်သတ်ချက် မထားဘဲ ထိုပေါင်းလဒ်အတိုင်း ဖြစ်ရမည်။ ထို့ကြောင့် `MAX_SECONDS` ကို ဖယ်ရှားပြီး Video Engine ၏ memory guard ကိုသာ safety အဖြစ် ထားမည်။
- Video Engine တွင် memory budget နှင့် H.264 level စစ်ဆေးချက် ပါပြီးသား (picture size နှင့် fps အလိုက်)။ Video ကို ရှည်လျှင်/ကြီးလျှင် ပိုမိုလိုအပ်မည်။

### ၈။ အကောင်အထည်ဖော်ရန် အစီအစဉ် (အဆိုပြုချက် — အတည်ပြုရန်)

1. **Drum Studio — Title / Info အပိုင်း:** Logo ဘယ်ဘက်ပြောင်း၊ `4/4`၊ `BPM`၊ `Key`၊ `Metronome` ထည့်။
2. **Layout template ခွဲထုတ်ခြင်း:** အပိုင်း ၃ ခုကို data ဖြင့်ကြေညာနိုင်အောင် Video Engine ကို ပြင်။
3. **Notation Engine ချိတ်ခြင်း:** အလယ်အပိုင်း (Page / Horizontal၊ cursor)။
4. **Drum အပိုင်း:** R2 မှ Drum ပုံများသုံး၍ ဆွဲ။
5. **ရေတွက်ပုံ ရွေးချယ်မှု** (Studio option) ထည့်။
6. **Thank You segment** ကို Video Engine ထဲ ချိတ်။
7. **Guitar** (Phase 1)၊ ထို့နောက် **Piano** (Phase 2)၊ **Violin**။

အဆင့်တစ်ခုချင်းစီကို သင် "ready" ဟု ပြောမှသာ စတင်မည်။

### ၉။ ပြီးစီးမှု အခြေအနေ (Doc စစ်ဆေးချက် — 2026-11-22)

`Website/Video/Video Engine Doc/README.md`၊ `Metronome Engine Doc/DOC.md`၊ `Website/Doc/Create-Video-Page.md` နှင့် code ကို ဖတ်၍ ပြုစုထားသည်။

**ပြီးပြီ**

| အပိုင်း | အခြေအနေ |
|---|---|
| Video Engine core | Canvas frame များကို WebCodecs ဖြင့် MP4/WebM အဖြစ် render/mux၊ MediaRecorder fallback၊ optional `AudioBuffer`၊ progress/cancel၊ memory guard၊ cleanup။ Tests — MP4 muxer ၁၅၊ cleanup/safety ၅ (စုစုပေါင်း ၂၀/၂၀ အောင်)၊ Chromium smoke၊ Drum browser integration နှင့် ffprobe စစ်ဆေးချက်။ |
| Create Video selection page | Tool card များ (Piano, Drums, Guitar, Bass, Strings, Voice, Metronome, More) နှင့် shared `studio.html?tool=...` routing။ |
| Studio ၏ shared control panel | MusicXML ရွေးခြင်း၊ Logo၊ Title 1 / Title 2 (စာသား/အရောင်/အရွယ်)၊ Drum Brand/Model၊ Notation View (Page Landscape / Portrait / Square)၊ Sound Model + volume၊ Count Voice (Off/On၊ ပုံစံ ၂ မျိုး၊ volume)၊ Video Color (Black/White)၊ Video Ratio (16:9 / 1:1 / 9:16)၊ Generate Video။ Ratio ပြောင်းလျှင် output အရွယ်ပြောင်းသည်။ |
| Drum adapter | Video ထုတ်နိုင်သည် — **visual-only (အသံမပါ)**။ MusicXML plain XML ကို parse လုပ်သည်။ |
| Metronome adapter | Design ၁၁ မျိုး၊ landscape/portrait/square၊ BPM/meter/bars၊ `OfflineAudioContext` ဖြင့် click-track အသံပါ ထုတ်နိုင်သည်။ Chromium စစ်ဆေးချက် pass။ |

**မပြီးသေး / မရှိသေး**

| အပိုင်း | အခြေအနေ |
|---|---|
| Drum အသံ | Drum sound နှင့် Count Voice အသံ မချိတ်ရသေး။ `.mxl` ဖိုင် parse မလုပ်ရသေး။ |
| Guitar adapter | Guitar Engine (TypeScript၊ tests၊ bundle၊ `positionsAt()`၊ `stageShapes()`၊ SVG renderer) ရှိသော်လည်း Studio event producer၊ Canvas painter၊ photo asset preload မရှိ။ Bundle path တွင် `website/assets` (အသေး) နှင့် `Website/Website/assets` ကွဲနေ၍ ရှင်းရမည်။ Guitar Engine သည် အသံမထုတ်ပါ။ |
| Piano adapter | Piano Hand Human Engine (keyboard geometry၊ key press curve၊ fingering၊ IK) ရှိ။ Note event input၊ renderer၊ Studio adapter၊ အသံ မရှိ။ `Piano 3D Hand Engine` folder သည် `.gitkeep` သာ။ Wrist motion မပြီး၊ IK ကို website GLB နှင့် calibrate မလုပ်ရသေး။ ပထမ key-only visual adapter ကို ရည်မှန်း။ |
| Violin | Engine folder မရှိ။ |
| Bass / Strings | Playable code မရှိ။ Fretted လား keyboard/synth/orchestral လား instrument အဓိပ္ပာယ် သတ်မှတ်ရန်။ |
| Voice | Source/capture/import၊ permission/privacy ဆုံးဖြတ်ချက် မရှိသေး။ |
| အသံပါသော export | `AudioBuffer` မပေးလျှင် silent video ထုတ်သည်။ Sound Engine သည် Video ထဲသို့ မချိတ်ရသေး။ Notation ၏ အသံပါ ထုတ်ရန် Plan ၏ လိုအပ်ချက်ဖြစ်၍ **audible export ကို requirement အဖြစ် အတည်ပြုရန်**။ |
| ၃ ပိုင်း layout | မရှိသေး — အထက်ပါ ပေါင်းစပ်ဆွဲခြင်း၊ Title/Info၊ layout template၊ Notation Engine ချိတ်ခြင်း၊ ရေတွက်ပုံ ရွေးချယ်မှု၊ Thank You segment။ |
| Doc များ | `Drum Human Stick Engine Doc`၊ `Guitar Engine Doc`၊ `Piano Hand Human Engine Doc` folder များ `.gitkeep` သာရှိ — Doc မရေးရသေး။ |

**သတိ:** GitHub သို့ push လုပ်ခြင်းသည် Cloudflare site ကို အလိုအလျောက် deploy မလုပ်ပါ (Video Engine Doc: public Worker သည် push နှင့် deploy မလုပ်မချင်း ယခင် version ကို ဆက်ပေးသည်)။

### ၁၀။ Engine တာဝန်ခွဲခြားမှု (ဆုံးဖြတ်ချက်)

**မူ:** Engine တစ်ခုသည် အလုပ်တစ်မျိုးသာ လုပ်သည်။ Engine တစ်ခုတည်းက အလုပ်အားလုံးကို မလုပ်စေရ။ Engine တစ်ခုက အခြား Engine ၏ အလုပ်ကို လိုက်မလုပ်ရ၊ လိုအပ်လျှင် ထို Engine ကို ခေါ်သုံးရမည်။

| Engine | တာဝန် (တစ်ခုတည်း) | မလုပ်ရသည့်အရာ |
|---|---|---|
| Notation Engine | MusicXML မှ notation ကို ဆွဲခြင်း၊ cursor | အသံ၊ video encode၊ editor operation |
| Sound Engine | Notation အတွက် အသံထုတ်ခြင်း | notation ဆွဲခြင်း၊ video |
| Writer Engine | Notation Editor ထဲ ရေးခြင်းနှင့် editor operation အားလုံး | video၊ အသံ |
| Video Engine | Segment/frame များ ပေါင်းဆွဲ၊ AudioBuffer ပေါင်း၊ MP4 encode၊ Thank You ဆက်ခြင်း | တူရိယာ animation၊ notation ဆွဲခြင်း |
| Drum Animation Engine | **R2 ထဲရှိ Drum data/ပုံများကို မကျန်အောင် ပြသပေးခြင်း** (ဘယ်ပုံကို ဘယ်အချိန် highlight)၊ လိုအပ်မှ ထပ်ထည့် | notation၊ အသံ၊ encode |
| Drum Human Stick Engine | Drum တီးသူ (stick) ၏ လှုပ်ရှားမှု | R2 ပုံများ ပြခြင်း |
| Guitar Engine / Piano Hand Human Engine | သက်ဆိုင်ရာ တူရိယာ၏ position / finger / hand data | video encode |
| Metronome Engine | Metronome design နှင့် click-track | notation၊ Title / Info |

**Drum Animation Engine ၏ စည်းကမ်း:** R2 ထဲ ရှိသမျှ Drum data ကို manifest (စာရင်း) မှ ဖတ်၍ **မကျန်အောင်** ပြရမည်။ ဖိုင်အမည်ကို code ထဲ hard-code မလုပ်ရ။ ရှိရမည့်ဖိုင် မတွေ့လျှင် တိတ်တိတ် ကျော်မသွားဘဲ diagnostic ဖြင့် ပြရမည်။

### ၁၁။ ဆုံးဖြတ်ပြီးသော အချက်များ (နောက်ဆုံး)

အသုံးပြုသူ၏ ညွှန်ကြားချက် — "ကျန်တာ မစဉ်းစားဘဲ လုပ်ပါ" ကြောင့် အောက်ပါအချက်များကို ကျွန်တော် သတ်မှတ်ထားသော **ပုံမှန် (default) တန်ဖိုးများ** အဖြစ် ရေးထားသည်။ ပြင်လိုလျှင် ပြင်လို့ရသည်။

1. **Video အရှည်** = Count Voice (အစ၊ count-in) + MusicXML အရှည် + Thank You video။
2. **Title 1 / Title 2** = အသုံးပြုသူ ရိုက်ထည့်သည့်အတိုင်း။ **4/4၊ BPM၊ Key** = MusicXML မှ။
3. **Metronome tool ၏ video** တွင် Title / Info အပိုင်း မပါ။
4. **Title / Info ထဲရှိ `Metronome`** (အခြားတူရိယာ video များတွင်) = beat တိုင်းတွင် တုန်ခါသော metronome icon ငယ် (အသံမပါ)။ ရှိပြီးသား Metronome design ကို ပြန်သုံးမည်။
5. **အသံပါသော Video** = requirement။ Count Voice (အစ) နှင့် Notation ၏ အသံ (Sound Engine) ပါရမည်။ Audible export ကို Plan ၏ လိုအပ်ချက်အဖြစ် သတ်မှတ်သည်။
6. **Ratio အလိုက် အပိုင်းအချိုး** (အစပျိုး default၊ ချိန်ညှိနိုင်):

| Ratio | Title / Info | Notation | တူရိယာ |
|---|---|---|---|
| 16:9 | အမြင့် ~၁၂% | ~၄၈% | ~၄၀% |
| 1:1 | ~၁၂% | ~၄၄% | ~၄၄% |
| 9:16 | ~၈% | ~၄၂% | ~၅၀% |

   **Violin (ဘေးတစ်ဖက်):** 16:9 နှင့် 1:1 တွင် Notation ကို ဘယ်ဘက် ~၆၀%၊ Violin ကို ညာဘက် ~၄၀% ထားပြီး အောက်ဆုံးတွင် Title / Info အကျယ်အပြည့်။ 9:16 (Portrait) တွင် ဘေးချင်းယှဉ်လျှင် ကျဉ်းလွန်းသဖြင့် Notation အပေါ်၊ Violin အောက် ထပ်၍ အောက်ဆုံးတွင် Title / Info။
7. **Drum ပုံများ** — ဖိုင်စာရင်း/အမည်/path ကို Plan ထဲ မသတ်မှတ်၊ R2 ထဲက manifest မှ Drum Animation Engine က ဖတ်မည်။ **Thank You ဖိုင်အမည်/path** သည် Video Engine ထဲတွင်သာ။

### မဖြေရှင်းရသေးသော အချက်များ (Video ထုတ်လုပ်ပုံ)

1. R2 ထဲတွင် Drum manifest (ပုံစာရင်း) ကို ဘယ်လိုပုံစံနှင့် ထားမည် — Drum Animation Engine ကို စတင်သည့်အချိန်တွင် ဆုံးဖြတ်မည်။
2. အပေါ်ပါ ၁၁။ (4) (Metronome icon) နှင့် (6) (အချိုးများ) ကို အသုံးပြုသူသည် **ထုတ်လုပ်ပြီးသော video အစစ်ကို စမ်းကြည့်ပြီးမှ** ပြင်ဆင်မည်။ ယခုတန်ဖိုးများကို default အဖြစ်သာ သုံးသည်။

## Sound Engine နှင့် MuseScore SoundFont — 2026-11-13

Notation Engine က score note များကို timing ပါသော `noteOn`, `noteOff`, `programChange` နှင့် `controlChange` events အဖြစ် ထုတ်ပေးပြီး Sound Engine က ထို events များကို အသံအဖြစ် render/playback လုပ်မည်။ ပထမဆုံး sound source အဖြစ် MuseScore 3 နှင့် MuseScore 2.2+ တွင် အသုံးပြုသော official `MuseScore_General.sf3` ကို သုံးမည်။ SoundFont၊ license၊ sample attribution နှင့် version metadata များကို Cloudflare R2 တွင် versioned prefix ဖြင့် သိမ်းမည်။ အသေးစိတ်သည် [Sound Engine Plan](../Notation/Sound%20Plan/README.md) နှင့် [MuseScore General R2 Asset Record](../Notation/Sound%20Doc/MuseScore-General-R2-Asset.md) တွင် ရှိသည်။

R2 မှ ဖိုင်များကို note တစ်လုံးချင်း သို့မဟုတ် playback တစ်ကြိမ်ချင်း ထပ်ခါတလဲလဲ မခေါ်စေရန် `soundfont-manifest.json` ကို တစ်ကြိမ် fetch လုပ်ပြီး `.sf3` binary ကို browser Cache API သို့မဟုတ် IndexedDB တွင် cache-first ဖြင့် သိမ်းမည်။ JSON သည် audio binary မဟုတ်ဘဲ asset path, cache key, checksum, MIDI bank/program mapping နှင့် attribution references များပါသော manifest ဖြစ်မည်။ Browser-compatible SoundFont sampler/WASM adapter ကို နောက် implementation အဆင့်တွင် ရွေးချယ်ပြီး Notation Engine event clock နှင့် Sound Engine clock ကို sync လုပ်မည်။

### SoundFont source collection — 2026-11-13

Sound Engine အတွက် comparison/fallback source အဖြစ် `MS Basic.sf3`, `MuseScore_General.sf3`, `MuseScore_General.sf2`, `GeneralUser GS 1.472.sf2`, `FluidR3_GM.sf2` နှင့် `Salamander Grand Piano V3 SF2` တို့ကို စုစည်းထားမည်။ Asset တစ်ခုချင်းစီကို R2 versioned prefix သီးခြားဖြင့် ထားပြီး manifest JSON မှ asset ID, format, source, license file, bytes နှင့် checksum ကို ပြမည်။ Default/lightweight fallback ကို MuseScore General သို့မဟုတ် GeneralUser GS ထားပြီး 1.2 GB ခန့်ရှိသော Salamander SF2 ကို optional high-quality piano asset အဖြစ်သာ preload လုပ်မည်။

MS Basic ၏ upstream license file သည် MuseScore General filename/text အဟောင်း reference ပါနေသဖြင့် public သို့မဟုတ် commercial redistribution မလုပ်မီ rights holder ထံမှ အတည်ပြုချက် သို့မဟုတ် legal review ရယူရမည်။ SoundFont source collection ၏ file list, R2 upload path, license notes နှင့် checksum record ကို [SoundFont Collection R2 Asset Record](../Notation/Sound%20Doc/SoundFont-Collection-R2.md) တွင် ထားမည်။

### SoundFont ရွေးချယ်ချက် — 2026-11-22

**ရွေးချယ်မှု စံနှုန်း:** (၁) Commercial အသုံးပြုခွင့်ရှိသော license၊ (၂) တူရိယာသံ အစုံအလင် (General MIDI program အားလုံးကို ဖုံးနိုင်ခြင်း)။ License လုံးဝမပါသော ဖိုင်သည် ပိုင်ရှင်က ခွင့်မပြုထားသောဖိုင် (all rights reserved) ဖြစ်သဖြင့် မသုံးရ။ M Sharing သည် ရောင်းချမှု (platform share ၄၅%) ပါဝင်သော commercial platform ဖြစ်သောကြောင့် commercial ခွင့်ပြုချက်ကို အရေးကြီးဆုံးအဖြစ် သတ်မှတ်သည်။

| SoundFont | License | ဆုံးဖြတ်ချက် |
|---|---|---|
| **MuseScore General** (`ms-core`, v0.2) | MIT | **အဓိက အသံ။** Commercial သုံးခွင့်ရှိပြီး General MIDI တူရိယာအစုံပါသည်။ |
| Salamander Grand Piano V3 | CC BY 3.0 | Optional။ Piano အရည်အသွေး ပိုလိုလျှင် နောက်မှထည့်မည် (attribution လိုသည်၊ 1.27 GB ကြီးသည်)။ |
| GeneralUser GS 1.472 | ဖိုင်ပါ `LICENSE.txt` အတိုင်း | Fallback သို့မဟုတ် ဖယ်ထားမည်။ |
| FluidR3 GM | MIT | မလိုတော့ — MuseScore General သည် ၎င်းကို ပြင်ဆင်ထားသော ဗားရှင်းဖြစ်သည်။ |
| MS Basic | မရှင်းလင်းသေး | ဖယ်ထားမည်။ Rights holder ထံမှ အတည်ပြုချက်ရမှ ပြန်စဉ်းစားမည်။ |

**MIT နှင့် လိုက်နာရမည့်အချက်:** မူပိုင်ခွင့်ကြေညာချက်နှင့် MIT ခွင့်ပြုချက်စာသားကို SoundFont ကူးထားသည့် ဖိုင်တိုင်းနှင့်အတူ ထားရမည်။ ထို့ကြောင့် `MuseScore_General_License.md` ကို asset နှင့်အတူ R2 ထဲတွင် ဆက်ထားပြီး website ၏ credits အပိုင်းတွင် ဖော်ပြမည်။

**အရည်အသွေးအပေါ် ရိုးသားချက်:** MuseScore General v0.2 သည် work-in-progress ဖြစ်ပြီး FluidR3 အခြေပြု ပြင်ဆင်ထားခြင်းဖြစ်သည်။ အစုံအလင်ဆုံးနှင့် license အလုံခြုံဆုံး ဖြစ်သော်လည်း တူရိယာတစ်ခုချင်းစီတိုင်းတွင် အကောင်းဆုံးအသံ မဟုတ်နိုင်ပါ။ R2 ထဲရှိ ဖိုင်များကို ဤဆုံးဖြတ်ချက်ကြောင့် မဖျက်ပါ — Plan ကိုသာ ပြောင်းလဲထားသည်။

### Notation Engine ↔ SoundFont bridge — 2026-11-13

Notation playback event stream တွင် pitched note များ၏ MIDI note number နှင့် duration ticks ကို ထည့်ပြီး `R2SoundFontEngine` က R2 manifest/cache မှ MuseScore General SF3 ကို တစ်ကြိမ် load လုပ်ကာ SpessaSynth AudioWorklet ဖြင့် WebAudio ထုတ်ပေးမည်။ Notation Lab ၏ play/pause/volume lifecycle သည် SoundFont engine နှင့် ချိတ်ပြီး phone/web viewport နှစ်မျိုးအတွက် UI control တစ်ခုတည်းကို သုံးမည်။ လက်ရှိအဆင့်တွင် unpitched drum mapping နှင့် MusicXML instrument program/bank routing သည် နောက်ထပ်အလုပ်ဖြစ်သည်။


## Metronome Studio — 2026-11-14

Create Video ရှိ Metronome card ကို `studio.html?tool=metronome` သို့ ချိတ်ပြီး Metronome Engine design 11 မျိုး၊ landscape/portrait/square output၊ quarter-note BPM၊ meter နှင့် bar controls ဖြင့် video ဖန်တီးနိုင်သည်။ Engine bundle ကို `Website/Website/assets/metronome-engine.js` သို့ reproducible sync/check လုပ်ပြီး `studio-metronome.js` က frame time မှ deterministic SVG state တွက်ကာ shared Video Engine ကို ပြန်သုံးသည်။ Metronome adapter သည် `OfflineAudioContext` ဖြင့် click-track `AudioBuffer` ကို ကိုယ်တိုင်ထုတ်ပေးသည်; ဤသည် Shared Sound Engine မဟုတ်ပါ။ Render အရှည်သည် 12 sec အထိဖြစ်သည်။

Phone 375px နှင့် web/desktop 1280px viewport checks, Metronome portrait video/audio export နှင့် Drum regression တို့ Chromium တွင် pass ဖြစ်သည်။ အသေးစိတ် Plan: [Metronome Engine Plan](../Metronome/Metronome%20Engine%20Plan/PLAN.md); code/test inventory: [Metronome Engine Doc](../Metronome/Metronome%20Engine%20Doc/DOC.md). နောက်ဦးစားပေးမှာ Guitar၊ ထို့နောက် Piano, Bass, Strings နှင့် Voice ကို သီးခြား instrument adapter ဖြင့်ချိတ်ဆက်ခြင်းဖြစ်သည်။

### Metronome Studio input controls — 2026-11-15

Metronome Studio control panel ၏ အပေါ်တွင် `.musicxml`, `.xml`, `.mxl` ရွေးချယ်နိုင်သော MusicXML file field ကို ထည့်မည်။ ရှိပြီးသား design, orientation, BPM, bars နှင့် meter controls များ၏ ပုံစံ/အစီအစဉ်ကို ထိန်းထားပြီး၊ ၎င်းတို့အောက်တွင် အခြား instrument studio များနှင့်တူသော `Count Voice` toggle/type/volume နှင့် `Sound Model`/volume controls ကို ပြမည်။ File selection သည် browser ပေါ်တွင် filename ပြသသည့် local input ဖြစ်သည်; MusicXML ကို video timing သို့ parse ချိတ်ဆက်ခြင်း၊ Count Voice အသံထုတ်ခြင်း၊ Sound Model အသံနှင့် volume ကို render ထဲသုံးခြင်းသည် သီးခြားနောက်အဆင့်ဖြစ်ပြီး ဤ UI pass ထဲတွင် မပါဝင်ပါ။
