# UI/UX Implementation — Landing Page

## ရည်ရွယ်ချက်

M Sharing ကို ပေးထားသော music-platform UI board ၏ visual direction နှင့် ကိုက်ညီစေရန် လက်ရှိ `Fixed Header Bar preview` ကို landing-page UI shell အဖြစ် ပြန်လည်တည်ဆောက်ထားသည်။ လက်ရှိအဆင့်သည် UI/UX foundation ဖြစ်ပြီး Supabase, R2 သို့ backend ချိတ်ဆက်မှု မပါသေးပါ။

## ပြင်ထားသောအရာများ

Hero section တွင် `Your Complete Music Platform` headline, Learn/Play/Create eyebrow, short description, Get Started CTA နှင့် Watch Video CTA ထည့်ထားသည်။ Sample board ၏ black/navy background, red highlight နှင့် music energy ကို CSS-based red glow, piano key illustration, violin silhouette နှင့် music-note accents ဖြင့် ပြန်ဖန်တီးထားသည်။ External image asset မလိုအပ်အောင် illustration ကို CSS ဖြင့်တည်ဆောက်ထားသည်။

Hero အောက်တွင် Music Notes Store, Video Studio, Online Courses နှင့် Notation Lab feature cards ထည့်ထားသည်။ ထို့အပြင် Canon in D, Für Elise, Moonlight Sonata နှင့် Happy Birthday အတွက် popular music notes cards များနှင့် sheet-music style previews ထည့်ထားသည်။

## Responsive behavior

Desktop တွင် hero ကို two-column layout ဖြင့် ပြပြီး feature နှင့် notes cards များကို four-column layout အသုံးပြုထားသည်။ Tablet/mobile တွင် hero ကို single-column အဖြစ် ပြောင်းပြီး cards များကို two-column သို့ လျှော့ထားသည်။ Phone header တွင် သတ်မှတ်ထားသည့်အတိုင်း Menu, Logo, Search နှင့် Notification ပဲ ထားသည်။ Header သည် `position: fixed` ဖြင့် scroll လုပ်စဉ် အပေါ်မှာ အမြဲတည်နေသည်။

## ဖိုင်များ

- `Website/index.html` — landing page markup, fixed header, hero, features နှင့် music-note cards
- `Website/styles.css` — dark/light design tokens, responsive layout, CSS illustration နှင့် interaction states
- `Website/script.js` — mobile menu, theme toggle နှင့် EN/MM indicator toggle

## နောက်အဆင့်

UI foundation အတည်ပြုပြီးနောက် Supabase shared backend နှင့် ချိတ်မည့် auth state, user profile, favorites, cart, notification နှင့် course/store data ကို component များထဲသို့ ထည့်မည်။
