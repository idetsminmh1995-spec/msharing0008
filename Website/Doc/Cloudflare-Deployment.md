# Cloudflare Workers Static Assets Deployment Guide

## အရေးကြီးသော error fix

သင်ပေးထားသော deploy log အရ လက်ရှိ Cloudflare project သည် **Pages မဟုတ်ဘဲ Cloudflare Workers Static Assets** အဖြစ် deploy လုပ်နေသည်။ `npx wrangler deploy` က `Website/_redirects` ထဲက `/* /index.html 200` rule ကိုဖတ်ပြီး `Invalid _redirects configuration: Infinite loop detected` error ဖြစ်စေသည်။ ဤ project တွင် လက်ရှိ client-side route မရှိသေးသောကြောင့် `_redirects` ဖိုင်ကို ဖယ်ရှားထားသည်။

`wrangler.jsonc` ကို repository root တွင် ထည့်ထားပြီး static asset directory ကို `./Website` ဟု တိတိကျကျ သတ်မှတ်ထားသည်။ ထို့ကြောင့် Wrangler prompt မေးခြင်းမရှိဘဲ deploy လုပ်နိုင်မည်။

## GitHub repository

- Repository: `idetsminmh1995-spec/msharing0008`
- Production branch: `main`
- Static asset directory: `Website`
- Worker name: `msharing0008`

## Cloudflare UI အသစ်တွင် ထည့်ရမည့် settings

Cloudflare Dashboard → **Workers & Pages** → သက်ဆိုင်ရာ Worker project → **Settings / Build configuration** ထဲတွင် အောက်ပါအတိုင်းထားပါ။ UI စာသားအမည် အနည်းငယ်ကွာနိုင်သော်လည်း တန်ဖိုးများမှာ ဤအတိုင်းဖြစ်ရမည်။

| Setting | ထည့်ရမည့်တန်ဖိုး |
|---|---|
| Framework | `Static` |
| Root directory | repository root (`/`) |
| Build command | မဖြည့်ပါနှင့် |
| Deploy command | `npx wrangler deploy` |
| Output directory | `Website` |
| Production branch | `main` |

`wrangler.jsonc` ရှိနေသောကြောင့် Output Directory ကို UI က မေးပါက `Website` ထည့်နိုင်သည်။ အမှန်တကယ် deploy source ကို root `wrangler.jsonc` ၏ `assets.directory` က ထိန်းချုပ်မည်။

## ပြင်ဆင်ပြီးသားဖိုင်များ

- `wrangler.jsonc` — Workers Static Assets deployment configuration
- `Website/_headers` — security headers နှင့် cache policy
- `Website/index.html` — Header Bar page
- `Website/styles.css` — responsive fixed Header Bar styles
- `Website/script.js` — menu, theme နှင့် language interactions

## မထည့်ရတော့သောဖိုင်

`Website/_redirects` ကို ဖယ်ရှားထားသည်။ `/* /index.html 200` သည် ဤ Wrangler Workers deployment တွင် index.html ကို သူ့ထံသူ redirect လုပ်သည့် infinite loop ဖြစ်စေသောကြောင့် ဖြစ်သည်။ အနာဂတ်တွင် client-side routes လိုလာပါက `_redirects` မသုံးဘဲ Wrangler assets configuration ၏ SPA not-found handling ကို သီးခြားစီ သတ်မှတ်မည်။

## Deploy ပြီးနောက် စစ်ရန်

1. GitHub `main` branch သို့ latest commit ရောက်နေကြောင်း စစ်ပါ။
2. Cloudflare build log တွင် `Executing user deploy command: npx wrangler deploy` ဟု ပြရမည်။
3. `Detected Project Settings` တွင် `Framework: Static` နှင့် `Output Directory: Website` ဖြစ်ရမည်။
4. `Invalid _redirects configuration` error မရှိရပါ။
5. Worker URL ကိုဖွင့်ပြီး `index.html`, `styles.css`, `script.js` အလုပ်လုပ်ကြောင်း စစ်ပါ။
6. Desktop width တွင် navigation နှင့် web icons အားလုံး ပေါ်ရမည်။
7. Phone width တွင် Menu, Logo, Search, Notification ပဲ ပေါ်ရမည်။
8. Page scroll လုပ်သည့်အခါ Header Bar က fixed ဖြစ်နေမည်။

## Local deploy command (လိုအပ်ပါက)

Cloudflare login ပြီးသား local terminal မှာ repository root ကနေ အောက်ပါ command ကို run နိုင်သည်။

```bash
npx wrangler deploy
```

Cloudflare login မလုပ်ရသေးပါက `npx wrangler login` ကို တစ်ကြိမ် run ပြီး browser မှာ authorize လုပ်ပါ။ GitHub ထဲသို့ token သို့မဟုတ် secret မတင်ရပါ။

## Backend နှင့် secrets

လက်ရှိ Header prototype သည် backend မချိတ်ရသေးသော static UI ဖြစ်သောကြောင့် ယခု deploy အတွက် environment variables မလိုသေးပါ။ နောက်ပိုင်း Supabase နှင့် Cloudflare R2 ချိတ်သည့်အခါ Supabase URL နှင့် public anon/publishable key ကဲ့သို့ browser-safe values များကို Cloudflare Worker/Workers project secrets သို့မဟုတ် vars ထဲတွင် သီးခြားထည့်မည်။ Supabase service-role key, R2 secret key နှင့် private credentials များကို frontend code၊ `wrangler.jsonc` သို့မဟုတ် GitHub ထဲတွင် မထည့်ရ။
