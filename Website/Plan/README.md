# M Sharing Website — Development Plan

## 1. ရည်ရွယ်ချက်

M Sharing သည် music learning, music notes, online courses, video studio, library နှင့် user profile/dashboard များ ပါဝင်မည့် responsive web application ဖြစ်မည်။ လက်ရှိ repository ထဲတွင် Header Bar prototype ကိုသာ တည်ဆောက်ထားပြီး ဤ Plan သည် နောက်ပိုင်း frontend၊ backend၊ storage နှင့် deployment အဆင့်များအတွက် အခြေခံ architecture ဖြစ်သည်။

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

လက်ရှိ implementation အဆင့်တွင် Header Bar နှင့် phone bottom navigation ကိုသာ တည်ဆောက်ထားသည်။ Sample music-platform UI board ကို visual reference အဖြစ် အသုံးပြုထားသော်လည်း Hero, dashboard, course cards, music-note cards နှင့် အခြား page content များကို မစတင်ရသေးပါ။

### ပြီးစီးထားသည်

- Web Header ကို fixed အဖြစ်ထားပြီး logo ကို home link အဖြစ် သတ်မှတ်ထားသည်။
- Web Header အလယ်ဗဟိုတွင် `Courses`, `Store`, `Create Video`, `Notation Lab` navigation များ ထည့်ထားသည်။
- Web Header ၏ ညာဘက်တွင် Search, EN/MM, Dark/Light, Favorite, Cart, Notification နှင့် Account controls ထည့်ထားသည်။
- မတောင်းထားသော `Home Page` နှင့် `Library` menu များကို မထည့်ထားပါ။
- Phone အပေါ် Header တွင် Menu, Logo, Search နှင့် Notification ပဲ ပြထားသည်။
- Phone အောက် fixed bar တွင် `Home`, `Courses`, `Store`, `Create Video`, `Notation Lab`, `Account` tabs ခြောက်ခု ထည့်ထားသည်။
- Mobile menu toggle, active tab state, theme toggle နှင့် EN/MM indicator toggle တို့ ထည့်ထားသည်။
- Cloudflare Workers Static Assets အတွက် `wrangler.jsonc`, `_headers` နှင့် cache-busting asset versioning ထည့်ထားသည်။
- GitHub `main` branch သို့ push လုပ်ပြီး Wrangler dry-run နှင့် static HTTP checks ပြုလုပ်ထားသည်။

### မပြီးသေးသည်

- Header controls များကို Supabase shared backend နှင့် မချိတ်ရသေးပါ။
- Account authentication, Favorites, Cart နှင့် Notifications data flow မစတင်ရသေးပါ။
- Phone bottom tabs နှင့် Web navigation အတွက် real routes/page components မတည်ဆောက်ရသေးပါ။
- Frontend framework final decision မချမှတ်ရသေးပါ။
- Supabase schema, RLS, auth နှင့် backend API မစတင်ရသေးပါ။
- Cloudflare R2 upload/download နှင့် media metadata integration မစတင်ရသေးပါ။
- Hero, Dashboard, Courses, Store နှင့် Notation Lab page UI မစတင်ရသေးပါ။ Create Video အတွက် further compact responsive tool-selection page prototype ကို တည်ဆောက်ပြီး Piano, Drums, Guitar, Bass, Strings, Voice, Metronome နှင့် More tools cards ထည့်ထားသည်။ Web View တွင် tool cards ၅ ခုစီ တစ်တန်းပေါ်ပြီး tablet တွင် ၃ ခု၊ phone တွင် ၂ ခု ပေါ်ရန် grid plan သတ်မှတ်ထားသည်။ Tool box တစ်ခုခုကိုနှိပ်လျှင် Create Video Page အောက်တွင်မဟုတ်ဘဲ shared `studio.html?tool=...` Studio Page သို့ navigate လုပ်မည်။ ထို Studio Page တွင် ဘယ်ဘက် instrument control panel နှင့် ညာဘက် Video preview panel ပါမည်။ Drum ကို ပထမဆုံးအဖြစ် Kick, Snare, Hi-hat, Tempo နှင့် recording controls ဖြင့် စတင်အကောင်အထည်ဖော်ထားသည်။ Hero နှင့် cards များကို web/phone view နှစ်မျိုးလုံးတွင် မျက်နှာပြင်မလွှမ်းမိုးစေရန် spacing နှင့် scale လျှော့ထားပြီး Logo ကို `#home` anchor သို့ ချိတ်ထားသည်။ Phone layout တွင် fixed navigation ကို မထိခိုက်စေရန် content safe space နှင့် compact breakpoint overrides များကို စစ်ဆေးပြီးပြီ။ နောက်တစ်ဆင့်တွင် card များနှင့် Studio Page controls များကို recorder, instrument editor, tempo control နှင့် video timeline flow များနှင့် အပြည့်အဝ ချိတ်ဆက်မည်။
- AWS migration implementation မစတင်ရသေးဘဲ နောက်ပိုင်း phase အဖြစ်သာ သတ်မှတ်ထားသည်။

## 10. လက်ရှိ Git/Cloudflare version

Header နှင့် mobile bottom navigation source များကို GitHub repository ၏ `main` branch တွင် ထိန်းထားသည်။ လက်ရှိ website deployment files များသည် `Website/Website/` အတွင်းတွင်ရှိပြီး Cloudflare deploy configuration အတွက် `Website/Website/wrangler.jsonc` ကို အသုံးပြုရမည်။ Commit history တွင် implementation နှင့် cache-busting ပြင်ဆင်ချက်များကို သီးခြားစစ်ဆေးနိုင်သည်။

## 11. Documentation နှင့် Plan update workflow

Website နှင့်ပတ်သက်သည့် implementation, UI/UX, deployment, configuration, bug fix သို့မဟုတ် refactor အလုပ်တစ်ခု ပြီးတိုင်း `Website/Doc/` အတွင်းတွင် အလုပ်မှတ်တမ်း၊ ပြောင်းလဲခဲ့သည့် paths၊ စမ်းသပ်မှုရလဒ်နှင့် မပြီးသေးသည့်အချက်များကို update လုပ်ရမည်။ Document အသစ်ဖန်တီးပါက `Website/Doc/README.md` တွင် link ထည့်ရမည်။

Plan, architecture decision, implementation sequence သို့မဟုတ် အလုပ်လုပ်သည့်ပုံစံကို ပြောဆို/ပြောင်းလဲသည့်အခါ `Website/Plan/README.md` သို့မဟုတ် သက်ဆိုင်ရာ `Website/Plan/` document ကို တစ်ပြိုင်နက် update လုပ်ရမည်။ Code change နှင့် သက်ဆိုင်ရာ Doc/Plan update များကို အတူတကွ commit လုပ်ရန် ဦးစားပေးရမည်။ အသေးစိတ်စည်းမျဉ်းကို [Website Development Documentation Workflow](../Doc/Development-Workflow.md) တွင် ထားရှိသည်။
