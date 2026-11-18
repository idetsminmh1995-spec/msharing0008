# Shared Header — Compact Sizing and Cross-Page Consistency

**Date:** 2026-11-18
**Status:** Done; verified in Chromium at web and phone viewports.

## လုပ်ဆောင်ခဲ့သည့်အလုပ်

1. Header Bar ကို ပိုမိုသေးငယ်အောင် ပြုလုပ်ခြင်း။
2. Page တိုင်းတွင် Header ပုံစံ တူညီအောင် ပြုလုပ်ခြင်း။

## 1. Header သေးငယ်စေခြင်း

`Website/Website/styles.css` သည် ယခင်က CSS အစစ် မဟုတ်ဘဲ pinned commit မှ ဖိုင်ကို `@import url('https://raw.githubusercontent.com/...')` ဖြင့် ဆွဲယူနေသည်။ ထို remote ဖိုင်ကို local မှ ပြင်လို့မရသောကြောင့် CSS အစစ် (pinned commit `55195af` ၏ content) ကို local `styles.css` အဖြစ် ပြန်လည်ထည့်သွင်းပြီး `@import` ကို ဖယ်ရှားခဲ့သည်။

ပြောင်းလဲချက်များ:

- `--header-height`: `72px` → `60px` (desktop/web)
- Mobile (≤860px) `--header-height`: `64px` → `56px`; bottom bar အမြင့် `64px` ကို မပြောင်းထားပါ
- `.nav-link.is-active::after` ၏ `bottom`: `-27px` → `-21px` (header အမြင့်အသစ်နှင့် active underline ကိုက်ညီစေရန်)

## 2. Page တိုင်း Header တူညီစေခြင်း

ယခင်က `notation-editor.html` တွင် Header သည် အပြည့်အစုံ မပါဘဲ Menu, Search, EN/MM, Favorite, Cart, Notification, Account နှင့် mobile navigation များ လွတ်နေသည်။ ယခု page လေးခုလုံးတွင် **တူညီသော Header markup** အသုံးပြုသည်။

- `index.html`
- `notation.html`
- `notation-editor.html`
- `studio.html`

တူညီစေရန် ညှိထားသည့်အချက်များ:

- Menu button, Brand, Desktop nav (Courses / Store / Create Video / Notation Lab), Search, EN/MM, Theme, Favorite, Cart, Notification, Account controls အားလုံး page တိုင်းတွင် တူညီသည်
- Mobile drawer navigation နှင့် phone bottom navigation (tabs ၆ ခု) page တိုင်းတွင် တူညီသည်
- Icon SVG path များ (Favorites, Cart, Notification dot အပါအဝင်) တူညီသည်
- `styles.css` cache-busting query ကို `?v=editor-toolbar-20261118` တစ်ခုတည်း အသုံးပြုသည်
- Active navigation item သည် သက်ဆိုင်ရာ page အလိုက် `is-active` နှင့် `aria-current="page"` ရရှိသည်

## ဖိုင်များ

- `Website/Website/styles.css` — local CSS အစစ်အဖြစ် ပြောင်းလဲခြင်း၊ header အမြင့် လျှော့ချခြင်း
- `Website/Website/index.html`, `notation.html`, `notation-editor.html`, `studio.html` — တူညီသော Header markup နှင့် stylesheet query
- `Website/Website/header-compact.css` — အသုံးမပြုတော့သော ဖိုင်; ဖယ်ရှားခဲ့သည် (ဘယ် page မှ မချိတ်ထားခဲ့ပါ)

## စမ်းသပ်စစ်ဆေးခဲ့သည့်အရာများနှင့် ရလဒ်

Chromium (headless) ဖြင့် page လေးခုလုံးကို web `1280px` နှင့် phone `375px` viewport နှစ်မျိုးတွင် တိုင်းတာစစ်ဆေးခဲ့သည်။

| Page | Web header | Phone header | Phone menu | Phone bottom nav |
|---|---|---|---|---|
| index.html | 60px, fixed | 56px, fixed | ပေါ်သည် | ပေါ်သည် |
| notation.html | 60px, fixed | 56px, fixed | ပေါ်သည် | ပေါ်သည် |
| notation-editor.html | 60px, fixed | 56px, fixed | ပေါ်သည် | ပေါ်သည် |
| studio.html | 60px, fixed | 56px, fixed | ပေါ်သည် | ပေါ်သည် |

Page လေးခုလုံးတွင် brand ၂ ခု (header + drawer), desktop nav link ၄ ခု, language button ၁ ခု, bottom nav tab ၆ ခု နှင့် desktop icon ၆ ခု တူညီစွာ ရရှိသည်။

`notation-editor.html` တွင် interactive စစ်ဆေးချက်များ အောင်မြင်သည်: mobile menu ဖွင့်နိုင်သည် (`is-open` + `aria-expanded=true`), theme toggle `dark → light` ပြောင်းသည်, EN/MM toggle `MM/EN` ပြောင်းသည်။

HTTP check: page လေးခုလုံးနှင့် `styles.css` အားလုံး `200` ပြန်သည်။

## မပြီးသေးသည့်အလုပ် / သတိပြုရန်အချက်

- Google Fonts အတွက် `@import url('https://fonts.googleapis.com/...')` ကို `styles.css` အပေါ်ဆုံးတွင် ဆက်လက်ထားရှိသည် (remote CSS ဖိုင်ဆွဲယူမှု မဟုတ်တော့ပါ)။
- Header controls များသည် ယခင်အတိုင်း local UI state သာဖြစ်ပြီး Supabase shared backend မချိတ်ရသေးပါ။
- ဤပြောင်းလဲမှုကို GitHub `main` သို့ push လုပ်ရန် ကျန်ရှိသည်; Cloudflare deployment ကို သီးခြားတောင်းဆိုမှသာ လုပ်ရမည်။
