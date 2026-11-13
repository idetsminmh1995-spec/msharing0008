# Header UI/UX Implementation

## Scope

ဤအဆင့်တွင် M Sharing ၏ **Header Bar တစ်ခုတည်း** ကိုသာ ပြင်ဆင်ထားသည်။ Hero section, feature cards, music-note cards, dashboard နှင့် အခြား page content များကို မထည့်သွင်းထားပါ။ Sample music-platform UI board ၏ dark/navy background, red accent နှင့် compact navigation style ကို Header UI အတွက်သာ အသုံးပြုထားသည်။

## Web view

Desktop/web view တွင် logo နှင့် `Home Page`, `Courses`, `Store`, `Create Video`, `Notation Lab` navigation များ ပါဝင်သည်။ ညာဘက်တွင် Search icon, `EN/MM` language control, Dark/Light theme control, Favorite icon, Cart icon, Notification icon နှင့် Account icon များ ပါဝင်သည်။ Active navigation item ကို red underline ဖြင့် ပြထားသည်။

## Phone view

Phone view တွင် user သတ်မှတ်ထားသည့်အတိုင်း Menu icon, logo, Search icon နှင့် Notification icon ပဲ ပြထားသည်။ Menu icon ကိုနှိပ်လျှင် navigation links များကို mobile menu အဖြစ် ဖွင့်/ပိတ်နိုင်သည်။

## Fixed behavior

Header ကို `position: fixed` နှင့် `top: 0` equivalent inset သတ်မှတ်ထားသောကြောင့် page scroll လုပ်သည့်အခါ အပေါ်တွင် အမြဲတည်နေသည်။ Header အောက်က content မဖုံးစေရန် body top padding နှင့် anchor scroll padding ထည့်ထားသည်။

## Interactions

- Dark/Light icon ဖြင့် Header theme ပြောင်းနိုင်သည်။
- `EN/MM` control ဖြင့် language indicator ပြောင်းနိုင်သည်။
- Phone menu ကို ဖွင့်/ပိတ်နိုင်သည်။
- Mobile navigation item ရွေးပြီးနောက် menu ပြန်ပိတ်သည်။
- Menu နှင့် icon button များတွင် accessible `aria-label` နှင့် `aria-expanded` ထည့်ထားသည်။

## ဖိုင်များ

- `Website/index.html` — Header Bar markup နှင့် header-only preview
- `Website/styles.css` — fixed positioning, desktop/mobile breakpoints, colors နှင့် interaction states
- `Website/script.js` — mobile menu, theme toggle နှင့် EN/MM toggle

## နောက်အဆင့်

Header UI/UX ကို အတည်ပြုပြီးမှသာ အခြား page sections သို့မဟုတ် Supabase shared backend integration ကို သီးခြားအဆင့်အဖြစ် စတင်မည်။
