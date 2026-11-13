# M Sharing Website

M Sharing music platform ၏ responsive web interface ဖြစ်သည်။ လက်ရှိ version တွင် fixed responsive Header Bar ကို တည်ဆောက်ထားသည်။

## Cloudflare Workers Static Assets

ဤ static Website ကို Cloudflare Workers Static Assets ဖြင့် deploy လုပ်ရန် `wrangler.jsonc` ကို `Website/Website/` အတွင်းတွင် ထားရှိသည်။ Repository root မှ `npx wrangler deploy --config Website/Website/wrangler.jsonc` ကို run လုပ်ပါ။ အပြည့်အစုံကို [Cloudflare Workers Deployment Guide](Doc/Cloudflare-Deployment.md) တွင် ကြည့်ပါ။

`Website/Website/_redirects` ကို မသုံးပါ။ Wrangler Workers deployment တွင် `/* /index.html 200` သည် infinite redirect loop ဖြစ်စေနိုင်သောကြောင့် ဖယ်ရှားထားသည်။

## Project folders

- `Plan/` — frontend, shared backend, storage နှင့် AWS migration architecture plan
- `Doc/` — implementation နှင့် deployment documentation
- `Website/` — deployable static assets, Wrangler config နှင့် website source
