# M Sharing Website

M Sharing music platform ၏ responsive web interface ဖြစ်သည်။ လက်ရှိ version တွင် fixed responsive Header Bar ကို တည်ဆောက်ထားသည်။

## Cloudflare Workers Static Assets

ဤ static Website ကို Cloudflare Workers Static Assets ဖြင့် deploy လုပ်ရန် repository root တွင် `wrangler.jsonc` ထည့်ထားသည်။ `npx wrangler deploy` သည် `Website` folder ကို asset directory အဖြစ် အသုံးပြုမည်။ အပြည့်အစုံကို [Cloudflare Workers Deployment Guide](Doc/Cloudflare-Deployment.md) တွင် ကြည့်ပါ။

`Website/_redirects` ကို မသုံးပါ။ Wrangler Workers deployment တွင် `/* /index.html 200` သည် infinite redirect loop ဖြစ်စေနိုင်သောကြောင့် ဖယ်ရှားထားသည်။

## Project folders

- `Plan/` — frontend, shared backend, storage နှင့် AWS migration architecture plan
- `Doc/` — implementation နှင့် deployment documentation
- `_headers` — Cloudflare security/cache headers
- `index.html`, `styles.css`, `script.js` — Header Bar UI
