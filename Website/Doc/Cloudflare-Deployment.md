# Cloudflare Pages Deployment Guide

ဤ project ကို Cloudflare Pages သို့ GitHub repository မှတစ်ဆင့် ကိုယ်တိုင် deploy လုပ်နိုင်ရန် ပြင်ဆင်ထားသည်။ လက်ရှိ Website သည် static HTML/CSS/JavaScript ဖြစ်သောကြောင့် build tool သို့မဟုတ် Node dependency မလိုပါ။

## GitHub repository

- Repository: `idetsminmh1995-spec/msharing0008`
- Website source folder: `Website`
- Deploy branch: `main`

## Cloudflare Pages တွင် ထည့်ရမည့် settings

Cloudflare Dashboard သို့ဝင်ပြီး **Workers & Pages → Create application → Pages → Connect to Git → GitHub** ကိုရွေးပါ။ `msharing0008` repository နှင့် `main` branch ကို ရွေးပြီး အောက်ပါအတိုင်း ဖြည့်ပါ။

| Setting | ထည့်ရမည့်တန်ဖိုး |
|---|---|
| Project name | `msharing-music-platform` သို့မဟုတ် သင်ကြိုက်သည့် unique name |
| Production branch | `main` |
| Framework preset | `None` |
| Root directory | မဖြည့်ထားပါနှင့် (repository root ကိုသုံးမည်) |
| Build command | မဖြည့်ထားပါနှင့် |
| Build output directory | `Website` |
| Deploy command | မဖြည့်ထားပါနှင့် |

ထို့နောက် **Save and Deploy** ကိုနှိပ်ပါ။ Cloudflare သည် repository ထဲက `Website/index.html` ကို static site အဖြစ် deploy လုပ်မည်။

### Alternative setting

Cloudflare UI တွင် Root directory ကို သီးခြားသတ်မှတ်နိုင်သော version ဖြစ်ပါက Root directory ကို `Website` ထည့်ပြီး Build command နှင့် Deploy command ကို မဖြည့်ဘဲ Build output directory ကို `.` သို့မဟုတ် UI ကပြသော default တန်ဖိုးအတိုင်းထားနိုင်သည်။ အထက်က repository-root setting (`Build output directory = Website`) ကို အရင်ဆုံးသုံးရန် အကြံပြုသည်။

## ထည့်ပြီးသား Cloudflare files

- `Website/_headers` — security headers နှင့် cache policy
- `Website/_redirects` — မတွေ့သော route များကို `index.html` သို့ fallback ပြုလုပ်ခြင်း
- `Website/index.html` — Header Bar page
- `Website/styles.css` — responsive fixed Header Bar styles
- `Website/script.js` — menu, theme နှင့် language interactions

## Custom domain ချိတ်ခြင်း

Deploy အောင်မြင်ပြီးနောက် Pages project ထဲမှ **Custom domains → Set up a custom domain** ကိုရွေးပါ။

- Domain ကို Cloudflare မှာ manage လုပ်ထားပါက DNS record ကို Cloudflare က အလိုအလျောက်ထည့်ပေးနိုင်သည်။
- အခြား registrar မှာရှိပါက Cloudflare ပြသည့် CNAME record နှင့် target ကို DNS provider ထဲတွင် ထည့်ပါ။
- DNS ပြောင်းလဲပြီး SSL active ဖြစ်သည်အထိ စောင့်ပြီး `https://your-domain.com` ကို စမ်းပါ။

## Deploy ပြီးနောက် စစ်ရန်

1. Cloudflare deployment status သည် **Success** ဖြစ်ရမည်။
2. `https://<project>.pages.dev/` ကိုဖွင့်ပါ။
3. Desktop width တွင် navigation နှင့် web icons အားလုံး ပေါ်ရမည်။
4. Phone width တွင် Menu, Logo, Search, Notification ပဲ ပေါ်ရမည်။
5. Scroll လုပ်သည့်အခါ Header Bar သည် အပေါ်တွင် fixed ဖြစ်နေမည်။
6. Phone တွင် Menu button, Dark/Light control နှင့် EN/MM control ကို စမ်းပါ။
7. Browser DevTools Network တွင် `index.html`, `styles.css`, `script.js` သည် HTTP 200 ပြန်ရမည်။

## လက်ရှိ backend status

လက်ရှိ Header prototype သည် backend မချိတ်ရသေးသော static UI ဖြစ်သည်။ Supabase နှင့် Cloudflare R2 integration မစတင်သေးသောကြောင့် ယခု Cloudflare Pages deployment အတွက် Environment variables မလိုသေးပါ။ Backend စတင်ချိတ်သည့်အခါ Supabase URL နှင့် public anon/publishable key ကဲ့သို့ browser-safe values များကိုသာ Pages environment variables ထဲတွင် ထည့်မည်။ Service-role key, R2 secret key နှင့် private credentials များကို frontend code သို့မဟုတ် GitHub ထဲတွင် မထည့်ရ။

## နောက်ပိုင်း backend ချိတ်ရန် မှတ်ချက်

Supabase API နှင့် R2 signed upload/download API များကို frontend မှ တိုက်ရိုက် private credential မသုံးဘဲ server-side endpoint သို့မဟုတ် Cloudflare Worker မှတစ်ဆင့် ချိတ်မည်။ ထိုအချိန်တွင် Cloudflare Pages project ၏ **Settings → Environment variables** ထဲတွင် Preview နှင့် Production values များကို သီးခြားထည့်ပြီး redeploy လုပ်ရမည်။
