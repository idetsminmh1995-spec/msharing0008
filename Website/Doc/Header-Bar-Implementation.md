# Header Bar Implementation

## လက်ရှိ scope

M Sharing web app နှင့် နောက်ပိုင်း mobile app တို့သည် shared backend ကို အသုံးပြုမည်ဟု သတ်မှတ်ထားသည်။ ဤအဆင့်တွင် backend ချိတ်ဆက်မှုမလုပ်သေးဘဲ Web Header Bar UI နှင့် responsive behavior ကိုသာ တည်ဆောက်ထားသည်။

## Web view

Desktop/web view တွင် ဘယ်ဘက်မှ logo နှင့် `Home Page`, `Courses`, `Store`, `Create Video`, `Notation Lab` navigation များ ပါဝင်သည်။ ညာဘက်တွင် Search icon, `EN/MM` language control, Dark/Light theme control, Favorite icon, Cart icon, Notification icon နှင့် Account icon များ ပါဝင်သည်။

## Phone view

Phone view တွင် user သတ်မှတ်ထားသည့်အတိုင်း Menu icon, logo, Search icon နှင့် Notification icon ပဲ ပြထားသည်။ Menu icon ကိုနှိပ်လျှင် mobile navigation panel တွင် Home Page, Courses, Store, Create Video နှင့် Notation Lab များ ပေါ်လာသည်။

## Fixed behavior

Header ကို `position: fixed` နှင့် `top: 0` သတ်မှတ်ထားသောကြောင့် page scroll လုပ်သည့်အခါ Header Bar သည် အပေါ်တွင် အမြဲတည်နေပြီး မရွေ့ပါ။ Header အောက်က content မဖုံးစေရန် body တွင် header height နှင့်တူသော top padding ထည့်ထားသည်။ Anchor navigation သွားသည့်အခါ fixed header မဖုံးစေရန် `scroll-padding-top` ပါ ထည့်ထားသည်။

## Interactions

- Dark/Light icon ဖြင့် theme ပြောင်းနိုင်သည်။
- `EN/MM` control ဖြင့် language indicator ပြောင်းနိုင်သည်။
- Phone menu ကို ဖွင့်/ပိတ်နိုင်သည်။
- Mobile navigation item ရွေးပြီးနောက် menu ပြန်ပိတ်သည်။
- Icon နှင့် menu button များတွင် accessible `aria-label` နှင့် menu အတွက် `aria-expanded` ထည့်ထားသည်။

## ဖိုင်များ

- `Website/index.html` — responsive Header Bar markup
- `Website/styles.css` — fixed positioning, web/mobile breakpoints နှင့် theme styles
- `Website/script.js` — mobile menu, theme toggle နှင့် EN/MM toggle

## နောက်ပိုင်း backend ချိတ်ဆက်မည့်အချက်

Account, Favorites, Cart, Notification နှင့် language preference state များကို နောက်ပိုင်းတွင် shared Supabase backend/API နှင့် ချိတ်ဆက်မည်။ UI ထဲတွင် လက်ရှိထည့်ထားသော interactions များသည် local preview behavior သာ ဖြစ်သည်။
