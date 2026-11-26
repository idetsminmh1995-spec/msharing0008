# M Sharing Website

M Sharing music platform ၏ responsive web interface ဖြစ်သည်။ လက်ရှိ version တွင် fixed responsive Header Bar ကို တည်ဆောက်ထားသည်။

## Cloudflare Workers Static Assets

ဤ static Website ကို Cloudflare Workers Static Assets ဖြင့် deploy လုပ်ရန် `wrangler.jsonc` ကို `Website/Website/` အတွင်းတွင် ထားရှိသည်။ Repository root မှ `npx wrangler deploy --config Website/Website/wrangler.jsonc` ကို run လုပ်ပါ။ အပြည့်အစုံကို [Cloudflare Workers Deployment Guide](Doc/Cloudflare-Deployment.md) တွင် ကြည့်ပါ။

`Website/Website/_redirects` ကို မသုံးပါ။ Wrangler Workers deployment တွင် `/* /index.html 200` သည် infinite redirect loop ဖြစ်စေနိုင်သောကြောင့် ဖယ်ရှားထားသည်။

## Project folders

| Folder | ထဲတွင် ရှိရမည့်အရာ |
|---|---|
| `Plan/` | **Plan ဖိုင် တစ်ခုတည်း** (`README.md` = Main Plan) |
| `Doc/` | လုပ်ပြီးသော အလုပ်မှတ်တမ်း Doc များ (`README.md` = index)၊ `Doc/Archive/` = အသုံးမဝင်တော့သော ဖိုင်အဟောင်းများ |
| `SQL/` | **SQL ဖိုင်များသာ** (Supabase migrations) |
| `Worker/` | **Worker ဖိုင် တစ်ခုတည်း** (Cloudflare Worker) |
| `Website/` | Deploy လုပ်ရသော static site၊ Wrangler config |
| `Notation/`, `Video/`, `Drum/`, `Guitar/`, `Piano/`, `Metronome/`, `Writer/` | Engine code နှင့် ၎င်းတို့၏ Engine Plan / Doc folder |

အသေးစိတ်စည်းမျဉ်းကို Main Plan ၏ `Repository structure — folder rules` section တွင် ကြည့်ပါ။
