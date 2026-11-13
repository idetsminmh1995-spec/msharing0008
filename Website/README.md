# M Sharing Website

M Sharing music platform ၏ responsive web interface ဖြစ်သည်။ လက်ရှိ version တွင် fixed responsive Header Bar ကို တည်ဆောက်ထားသည်။

## Cloudflare Pages

ဤ static Website ကို Cloudflare Pages မှ deploy လုပ်နိုင်သည်။ GitHub repository root မှ deploy လုပ်လျှင် Build output directory ကို `Website` သတ်မှတ်ပြီး build command မလိုပါ။ အပြည့်အစုံကို [Cloudflare Deployment Guide](Doc/Cloudflare-Deployment.md) တွင် ကြည့်ပါ။

## Project folders

- `Plan/` — frontend, shared backend, storage နှင့် AWS migration architecture plan
- `Doc/` — implementation နှင့် deployment documentation
- `_headers` — Cloudflare Pages security/cache headers
- `_redirects` — Cloudflare Pages route fallback
