# PLAN — Thank You (Outro) ending ကို အမြဲပါအောင် လုပ်ခြင်း

| | |
|---|---|
| **အခြေအနေ** | Draft v1 — မင်း "ready" မပြောမချင်း coding မစပါ |
| **အခြေခံ** | repo `main` @ `78f975a` (2026-11-10) |
| **ကျုံးဝင်တာ** | `website/assets/outro-video.js` + instrument page ၆ ခု (drum, guitar, bass-guitar, piano, violin, metronome) + `cloudflare-worker` |
| **စည်းကမ်း** | အဆင့်တစ်ခုချင်း၊ test အရင်၊ အဆင့်ပြီးတိုင်း ရပ်ပြီး မင်းအတည်ပြုမှ နောက်တစ်ဆင့် |

---

## 0. ရည်ရွယ်ချက်

**ပန်းတိုင်:** ထုတ်လုပ်တဲ့ video တိုင်းရဲ့ အဆုံးမှာ **Thank You ending တစ်ခု အမြဲ ပါရမယ်။** R2 နှေးတာ၊ ပြတ်တာ၊ ဖိုင်မတွေ့တာ၊ Worker ပျက်တာ ဖြစ်လည်း မပျောက်ရဘူး။

**အောင်မြင်ပြီလို့ သတ်မှတ်ချက် (တစ်ကြောင်းတည်း):**
> R2 ကို လုံးဝ block လုပ်ထားလည်း export တိုင်း ending နဲ့ပဲ ပြီးရမယ်။ R2 ကောင်းရင် R2 ရဲ့ clip ကို သုံးမယ်။

**ဒီ plan ရဲ့ အပြင်ဘက် (သီးခြား plan):** R2 ပုံ/ဗီဒီယို ပို့ပုံ cache/custom domain အကြီးစား ပြောင်းလဲမှု၊ export composition တည်ငြိမ်ရေး (pin/gate — drum မှာ ရှိပြီး)၊ GLB license။

---

## 1. လက်ရှိအခြေအနေ (ကုဒ်ထဲက အတည်ပြုပြီး)

| အချက် | ဘယ်မှာ |
|---|---|
| Clip key ပုံစံ: `Thank Video/{aspect}/{kind}/{aspect} {Black\|White} {Kind}.mp4`၊ ဖိုင်မတွေ့ရင် နောက် key ကို ဆက်စမ်း (အများဆုံး ~၅ ခု) | `outro-video.js` ရဲ့ key ဆောက်တဲ့အပိုင်း |
| `kind`: drum၊ guitar (bass ပါ)၊ **`paino`** (piano + violin — စာလုံးပေါင်း `paino`)၊ metronome | page ၆ ခု |
| Fetch လုပ်ပုံ: `${API_BASE}/assets/shared/<key>` → `arrayBuffer()` → blob → `<video>` | `outro-video.js` |
| **၁၀ စက္ကန့် abort** က ဖိုင်တစ်ခုလုံး ဒေါင်းတာ (`arrayBuffer()`) ကိုပါ ကာထား (11-08 commit `6b87b74` က ထည့်) | `loadOutro` |
| Metadata စောင့်တာ ၈ စက္ကန့်၊ မရရင် **reject** (အရင်က ဆက်သွားတယ်) | `waitForMetadata` |
| အားလုံးကျရင် `null` ပြန်၊ ကျတာကို **၃၀ စက္ကန့်** မှတ်ထား | `failureCache`၊ `lastFailure()` |
| Worker `/assets/shared/*`: R2 object ကို တစ်ဖိုင်လုံး stream၊ `max-age=60`၊ **Range မရှိ၊ 304 မရှိ** | `cloudflare-worker/src/index.ts` |
| Outro မရရင် export ရပ်တာ မဟုတ်၊ warning + "ending မပါဘဲ ဆက်မလား" dialog | drum page `generateVideo` / `askOptionalRender` |
| Segment contract: `{ seconds, draw(ctx, at, index), audio }` | `docs/VIDEO-ENGINE.md` |
| Same-origin logo SVG ရှိပြီးသား (`sharing-*-logo-full.svg`) | `website/assets/logo/` |
| Outro test မရှိ | `website/tests/` (loader/cleanup/voice-samples သုံးခုပဲ) |

**အားသာချက်:** Page ၆ ခုလုံးက `outro-video.js` တစ်ခုတည်းကို သုံးတာမို့ loader ကို ပြင်ရင် ၆ ခုလုံး တစ်ပြိုင်နက် ကောင်းမယ်။

---

## 2. ဘာကြောင့် မပါတော့တာလဲ — သံသယများ (အတည်မပြုရသေး)

| # | သံသယ | အထောက်အထား | အတည်ပြုနည်း (S0) |
|---|---|---|---|
| H1 | ၁၀ စက္ကန့် abort က ကြီးတဲ့ mp4 ကို ဒေါင်းမပြီးခင် ဖြတ်ချ | 11-08 ရဲ့ commit နဲ့ "မကြာသေးခင်မှ ပျောက်တာ" ကိုက်၊ Worker က Range/cache မရှိ | Network tab မှာ clip ဒေါင်းချိန်/ဆိုဒ် ကြည့် |
| H2 | R2 ထဲ clip နာမည်/folder မကိုက် (case, space, `paino`) | key ကို အတိအကျ ခန့်မှန်းတာ | URL ကို တိုက်ရိုက်ဖွင့်၊ 404 လား |
| H3 | `ALLOWED_ORIGINS` ကန့်သတ်ထားလို့ CORS ကျ | loader က `mode:'cors'` | Console မှာ CORS error ရှိလား |
| H4 | Browser က clip codec (HEVC/AAC မဟုတ်) မဖတ်နိုင် | metadata/decode error | `<video>` error၊ ဖိုင်ကို `ffprobe` |
| H5 | Deploy လုပ်ထားတဲ့ Worker က repo ကုဒ်နဲ့ မတူ (`/assets/shared/` မပါ) | Worker source ကို တစ်ချိန်က repo ပြင်ပမှာ ထိန်းခဲ့ဖူး | လက်ရှိ Worker မှာ route စမ်း |
| H6 | R2/Workers ရဲ့ တစ်ခါတစ်ရံ ပြတ်ခြင်း/limit | အရင်က intermittent ပြဿနာ | Worker logs |

### S0 — Diagnosis checklist (coding မလို)

1. နောက်ဆုံး export ရဲ့ စာ: **`not found: 404`** လား **`unavailable: timeout/5xx`** လား (ဒါက H1/H3-H6 နဲ့ H2 ကို အရင်ခွဲပေးမယ်)။
2. Drum page ထဲက `API_BASE` ကို သုံးပြီး `…/assets/shared/Thank%20Video/16x9/drum/16x9%20Black%20Drum.mp4` ကို browser မှာ တိုက်ရိုက်ဖွင့်။ မှတ်ရန်: status၊ **ဖိုင်ဆိုဒ်**၊ **ကြာချိန်**၊ `Access-Control-Allow-Origin`။
3. Console/Network မှာ အနီရောင် error ရှိလား။
4. R2 ထဲက clip တစ်ခုကို ဒေါင်းပြီး `ffprobe` (codec၊ ဖိုင်ဆိုဒ်၊ `faststart` ရှိ/မရှိ) မှတ်။

| S0 ရလဒ် | ပထမ လုပ်မယ့် အဆင့် |
|---|---|
| 404 | S5 (နာမည်/folder ပြင်) + S1 (နာမည်အစားထိုး) |
| ၁၀ စက္ကန့်ကျော် ဒေါင်းရ / timeout | S1 + S5 (clip သေးအောင်) |
| CORS error | S4 (`ALLOWED_ORIGINS`) |
| ဖိုင်ရပေမယ့် မဖွင့်နိုင် | S5 (re-encode) |
| အကုန် ကောင်းနေ | S1 ကိုသာ (timeout ကို ဘေးကင်း) နဲ့ S2 |

> **S2 (built-in ending) ကို S0 ရလဒ်ရှိသည်ဖြစ်စေ မရှိသည်ဖြစ်စေ လုပ်ရမယ်။** ဒါက "အမြဲ ပါရမယ်" ဆိုတဲ့ ပန်းတိုင်ကို အာမခံတာ။

---

## 3. ဒီဇိုင်းဆုံးဖြတ်ချက်များ (default ပါ၊ မင်းပြင်လို့ရ)

### 3.1 အလွှာ ၃ ထပ် (priority)
1. **R2 clip** (ပိုလှတဲ့ upgrade) — preload ပြီးသားဆိုရင် သုံး။
2. **Built-in ending** (အာမခံ) — R2 မရရင် **ဘာမေးမှု မလိုဘဲ အလိုအလျောက်** သုံး။
3. ဘာမှ မရတော့မှ (built-in ရဲ့ own-origin logo/font ကျ) → **render မစဘဲ ရှင်းရှင်းပြ။** (ဒါက ဖြစ်ကို မဖြစ်သင့်ဘူး)

### 3.2 Loader (outro-video.js) ရဲ့ စံနှုန်း

| ပစ္စည်း | default |
|---|---|
| First-byte timeout | ၁၅ စက္ကန့် |
| **Stall timeout** (byte မလာတာ) | ၁၅ စက္ကန့် (ဒေါင်းနေသရွေ့ မဖြတ်) |
| စုစုပေါင်း အမြင့်ဆုံး | ၁၂၀ စက္ကန့် |
| Metadata စောင့် | ၁၅ စက္ကန့်၊ ၁ ကြိမ် retry |
| Retry | 408 / 429 / 5xx / network / timeout → **၂ ကြိမ်** (၀.၅၊ ၁.၅ စက္ကန့် + jitter)၊ retry မှာ `cache: reload` |
| **404 / 403** | retry မလုပ်၊ နောက် key ကို ဆက် (နာမည် alias ပါ) |
| Failure cache | အားလုံးကုန်ပြီး ကျမှသာ၊ **၃၀ စက္ကန့်** (ရှိပြီးသားအတိုင်း) |
| Progress | bytes/total ကို callback နဲ့ ပြ (UI gate panel အတွက်) |
| ရလဒ် object | `{ source: 'r2' \| 'builtin', key, bytes, ms, attempts, reason }` |

**Error အမျိုးအစား ခွဲမယ်:** `not-found` · `unavailable (timeout/5xx)` · `blocked (CORS)` · `codec`။ UI/report က ဒါကို ပြမယ်။

### 3.3 Preload
- Kit/aspect/style ရွေးတာနဲ့ **နောက်ကွယ်မှာ clip ကို ဒေါင်း** (render မစခင်)၊ blob ကို မှတ်ထား။
- Render ခလုတ်နှိပ်တဲ့အခါ preload မပြီးသေးရင် **အများဆုံး ၃၀ စက္ကန့်** စောင့်ပြီး မရရင် built-in ကို သုံး (ဒေါင်းတာ ဆက်လုပ်တာ ရပ်)။

### 3.4 Built-in ending (S2 ရဲ့ spec)
- **ကာလ:** ၃.၀ စက္ကန့်၊ fade-in ၀.၄ စက္ကန့်။
- **အကြောင်းအရာ:** `sharing-{kind}-logo-full.svg` + "Thank you for watching" + site URL။ Style (black/white) နဲ့ aspect (16:9 / 9:16 / 1:1) အလိုက် အနေအထား။
- **Segment contract အတိုင်း** (`seconds` + `draw(ctx, at)`)၊ `audio` မပါ (default) — audio sting လိုချင်ရင် D4။
- **Network လုံးဝ မမှီခို:** Logo/font က same-origin (`website/assets/`)၊ canvas မှာ ဆွဲ။
- Font မ load ရင် gate ရှိပြီးသား font စောင့်တာကို ပြန်သုံး။

### 3.5 Worker (S4)
- `/assets/shared/*` ကို **Range** (206) နဲ့ **If-None-Match → 304** ကိုင်၊ cache ကို ရှည်ရှည် + versioned နာမည်။
- `ALLOWED_ORIGINS` ထဲ site ရဲ့ origin အားလုံး (www/non-www၊ localhost dev) ပါမပါ စစ်။
- (ရွေးချယ်) `/api/outro` — ရှိတဲ့ clip စာရင်း ပြန်ပေး၊ page က ခန့်မှန်းစရာ၊ ၄၀၄ ၅ ကြိမ်စမ်းစရာ မလို။
- Worker deploy က repo ကနေလား (Workers Build) ဒါမှမဟုတ် dashboard ကနေလား ဆိုတာ **အရင်အတည်ပြု** (H5)။

### 3.6 R2 clip spec (S5)
- H.264 (yuv420p)၊ ≤ 1080p၊ 30 fps၊ AAC အသံ၊ **faststart**၊ **တစ်ဖိုင် ~၈ MB အောက်**။
- နာမည် စည်းမျဉ်း: ဖိုင်/folder ကို case-sensitive အတိအကျ။ `paino` စာလုံးပေါင်းကို R2 နဲ့ ကိုက်ထား၊ loader က `piano` alias ကိုပါ စမ်း (၁ ခု ထပ်တိုး)။

---

## 4. မင်းဆုံးဖြတ်ရမယ့်အချက် (Open decisions)

| # | မေးခွန်း | default |
|---|---|---|
| D1 | R2 မရရင် built-in ကို **အလိုအလျောက်** သုံးမလား၊ dialog မေးမလား | အလိုအလျောက် (warning စာကြောင်းနဲ့) |
| D2 | Built-in ending ရဲ့ ကာလ/စာသား/URL | ၃ စက္ကန့်၊ "Thank you for watching" + site URL (မင်းပေးပါ) |
| D3 | Render မှာ preload မပြီးသေးရင် ဘယ်လောက်စောင့်မလဲ | ၃၀ စက္ကန့် |
| D4 | Built-in ကို audio sting ပါမလား | မပါ |
| D5 | `paino` folder ကို နာမည်ပြောင်းမလား၊ alias နဲ့ထားမလား | alias (R2 မပြောင်း) |
| D6 | Page ၆ ခုလုံး တစ်ပြိုင်နက် ပြောင်းမလား၊ drum အရင်လား | drum အရင်၊ အောင်မှ ကျန် ၅ ခု (call-site ပြောင်းလဲမှု သေးငယ်) |

---

## 5. အဆင့်လိုက် လုပ်ငန်းစဉ်

> အရွယ်: **S** ≈ တစ်ရက်အတွင်း · **M** ≈ နှစ်ရက်ခန့် · **L** ≈ အပတ်ဝက်ခန့် (ခန့်မှန်းချက်သက်သက်)

### S0 — Diagnosis (S၊ coding မလို)
- အပေါ် §2 checklist ကို လုပ်၊ ရလဒ်ကို ဒီဖိုင်ရဲ့ Work log မှာ မှတ်။
- **အောင်မြင်စံ:** အကြောင်းရင်း (404 / timeout / CORS / codec) ကို ရွေးချယ်လို့ရ။

### S1 — Loader hardening (M)
- **ဖိုင်:** `website/assets/outro-video.js`
- **လုပ်စရာ:** §3.2 အတိုင်း — stall/first-byte timeout၊ retry၊ error အမျိုးအစား၊ progress callback၊ `paino`/`piano` alias၊ structured result။
- **Test အရင်:** `website/tests/outro-video.test.mjs` (mock `fetch`/stream) — slow-but-steady ၂၅ စက္ကန့် ဒေါင်း **အောင်**၊ ၂၀ စက္ကန့် byte မလာ **ကျ**၊ 404 → နောက် key၊ 500 → retry ၂ ကြိမ်၊ အကုန်ကျ → result မှာ reason ပါ။
- **အောင်မြင်စံ:** Test စိမ်း၊ အရင် behavior (cache/failureCache) မပျက်။

### S2 — Built-in ending (M)
- **ဖိုင်:** `outro-video.js` (သို့) `website/assets/builtin-ending.js` အသစ်
- **လုပ်စရာ:** §3.4 အတိုင်း canvas end card segment (segment contract)။
- **Test:** Segment `seconds` မှန်၊ `draw` က aspect ၃ မျိုး × style ၂ မျိုးမှာ exception မပစ်၊ golden frame နှိုင်း။
- **အောင်မြင်စံ:** Network မရှိဘဲ ending ထွက်။

### S3 — Policy + page ချိတ်ဆက် (L)
- **Drum page အရင်:** Preload (§3.3)၊ gate ထဲ "Thank You" ကို required အဖြစ် (R2 → built-in fallback)၊ D1 အတိုင်း စာသား၊ render report ထဲ `outro: { source, key, bytes, ms, attempts, reason }`။
- **ပြီးမှ** guitar/bass-guitar/piano/violin/metronome (call-site သေးငယ်)၊ ပြီးရင် `node tools/stamp-assets.mjs` ပြန် stamp။
- **အောင်မြင်စံ:** DevTools မှာ Worker host ကို block → ၆ page လုံး ending နဲ့ ပြီး၊ report မှာ `source: builtin` ပြ။

### S4 — Worker (M)
- **ဖိုင်:** `cloudflare-worker/src/index.ts`၊ README
- **လုပ်စရာ:** §3.5 အတိုင်း Range + 304 + cache + `ALLOWED_ORIGINS` စစ် (+ `/api/outro` ရွေးချယ်)။
- **Test:** Worker unit/integration (လက်ရှိ test မရှိ — မျိုးစေ့ အနည်းငယ်)၊ `curl` နဲ့ 206/304 စစ်။
- **အောင်မြင်စံ:** Range request က 206၊ ဒုတိယအကြိမ် 304၊ site origin က CORS ကောင်း။

### S5 — R2 clip ပြင်ဆင်ခြင်း (S–M၊ လက်စွဲ)
- Clip တိုင်းကို §3.6 spec အတိုင်း re-encode၊ upload၊ `ffprobe` နဲ့ အတည်ပြု၊ ဖိုင်ဆိုဒ်/နာမည် စာရင်းထုတ်။
- **အောင်မြင်စံ:** ဖိုင်တိုင်း ≤ ~၈ MB၊ browser တိုက်ရိုက်ဖွင့်ရ၊ loader က ၁၀ စက္ကန့်အတွင်း မျှော်မှန်းဒေါင်းရ။

### S6 — အပြည့်အစုံ စမ်းသပ်ခြင်း (M)
- **Unit:** S1/S2 test အကုန်။
- **Browser (chromium):** Network throttle (slow-3G)၊ R2 block၊ Worker 500၊ 404 → ဘယ်လိုပဲဖြစ်ဖြစ် ending ပါ။ `tools/test-video-engine-browser.mjs` ပုံစံ။
- **CI:** repo မှာ `.github/workflows` မရှိ — အနည်းဆုံး `node --test website/tests` နဲ့ browser test ကို push တိုင်း run။

### S7 — ထုတ်ဝေခြင်းနဲ့ စာရွက်စာတမ်း (S)
- Build → copy → `node tools/stamp-assets.mjs --check` (အရင် stale ဖြစ်ခဲ့)။
- `docs/VIDEO-ENGINE.md` ကို outro fallback နဲ့ update၊ ဒီ plan ကို status လိုက်ပြင်။

---

## 6. Definition of Done

- [ ] R2 ကို block လုပ်ထားလည်း **page ၆ ခုလုံး** export က ending နဲ့ပဲ ပြီး
- [ ] R2 slow-3G မှာ clip ကို ဒေါင်းရ (သို့) ၃၀ စက္ကန့်အတွင်း built-in သို့ ပြောင်း
- [ ] 404 မ retry၊ 5xx/timeout retry ၂ ကြိမ်၊ error အမျိုးအစား မှန်
- [ ] Render report/UI မှာ `source: r2 | builtin` နဲ့ အကြောင်းရင်း ပြ
- [ ] Worker `/assets/shared/*` က Range (206) နဲ့ 304 ကိုင်၊ CORS မှန်
- [ ] R2 clip အားလုံး spec (≈၈ MB၊ H.264/AAC/faststart) ကိုက်
- [ ] Unit + browser test စိမ်း၊ `stamp-assets --check` စိမ်း
- [ ] Docs (`VIDEO-ENGINE.md`၊ ဒီ plan) update

---

## 7. အန္တရာယ်များ

| အန္တရာယ် | ကာကွယ်ပုံ |
|---|---|
| Built-in က R2 clip ထက် မလှလို့ မကြိုက် | D2 မှာ မင်းဒီဇိုင်းသတ်မှတ်၊ R2 ကောင်းရင် R2 ကို အမြဲ ဦးစားပေး |
| Preload က bandwidth/Worker request တိုးစေ | Aspect+style နဲ့ တိုက်ဆိုင်တာတစ်ခုပဲ ဒေါင်း၊ blob ကို cache၊ kit/aspect ပြောင်းရင် ဖျက် |
| ၆ page မှာ call-site ကွဲလွဲမှု | drum အရင်၊ အတူတူ pattern ကို ကူး၊ test ကို page တိုင်းမှာ |
| Worker deploy လမ်းကြောင်း မသိ (H5) | S0 မှာ အရင်အတည်ပြု |
| Ending ကာလ တိုးလို့ video ရှည်လာ | ၃ စက္ကန့်ပဲ၊ ကာလကို report ထဲ ပြ |
| `paino` စာလုံးပေါင်းကြောင့် ဘာသာပြန်/ရှာဖွေရ ရှုပ် | alias ကို loader မှာ တစ်နေရာတည်း၊ ဒီ plan မှာ မှတ် |

---

## 8. Work log

| ရက်စွဲ | အဆင့် | ဘာလုပ်ခဲ့လဲ | ရလဒ် / ဆုံးဖြတ်ချက် |
|---|---|---|---|
| | S0 | | |
| | | | |

*Log ကို အဆင့်တစ်ခုပြီးတိုင်း ဖြည့်ပါ၊ ဆုံးဖြတ်ချက် D1–D6 ကိုလည်း ဒီမှာ မှတ်ပါ။*
