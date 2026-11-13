# Header UI/UX Implementation

## Scope

ဤအဆင့်တွင် M Sharing ၏ **Header Bar နှင့် mobile bottom navigation bar** ကိုသာ ပြင်ဆင်ထားသည်။ Hero section, feature cards, music-note cards, dashboard နှင့် အခြား page content များကို မထည့်သွင်းထားပါ။ Sample music-platform UI board ၏ dark/navy background, red accent, compact top header နှင့် phone bottom tab bar ကို reference အဖြစ် အသုံးပြုထားသည်။

## Web view

Desktop/web view တွင် logo နှင့် `Home`, `Courses`, `Store`, `Create`, `Library` navigation များ ပါဝင်သည်။ `Home Page` ဆိုသောစာသားကို ဖယ်ရှားပြီး sample ပုံစံအတိုင်း `Home` ဟု တိုတောင်းထားသည်။ ညာဘက်တွင် Search icon, `EN/MM` language control, Dark/Light theme control, Favorite icon, Cart icon, Notification icon နှင့် Account icon များ ပါဝင်သည်။ Active navigation item ကို red underline ဖြင့် ပြထားသည်။

## Phone view

Phone view ၏ အပေါ်ဘက် Header တွင် Menu icon, logo, Search icon နှင့် Notification icon ပဲ ပြထားသည်။ Sample ပုံထဲက phone navigation ပုံစံအတိုင်း အောက်ဘက်တွင် fixed bottom bar ထည့်ထားပြီး `Home`, `Courses`, အလယ်တွင် red `+` Create button, `Store` နှင့် `Profile` tabs ပါဝင်သည်။ Bottom bar သည် screen အောက်ခြေတွင် အမြဲတည်နေပြီး page content မဖုံးစေရန် body bottom padding ထည့်ထားသည်။

## Fixed behavior

အပေါ် Header ကို `position: fixed` ဖြင့် အပေါ်တွင် အမြဲတည်ထားသည်။ Phone bottom navigation ကိုလည်း `position: fixed` ဖြင့် အောက်တွင် အမြဲတည်ထားသည်။ Header နှင့် bottom bar နှစ်ခုလုံးအတွက် content မဖုံးစေရန် top/bottom spacing နှင့် anchor scroll padding ထည့်ထားသည်။

## Interactions

- Dark/Light icon ဖြင့် Header theme ပြောင်းနိုင်သည်။
- `EN/MM` control ဖြင့် language indicator ပြောင်းနိုင်သည်။
- Phone menu ကို ဖွင့်/ပိတ်နိုင်သည်။
- Mobile bottom navigation တွင် active tab ကို red accent ဖြင့် ပြထားသည်။
- Menu နှင့် icon button များတွင် accessible `aria-label` နှင့် `aria-expanded` ထည့်ထားသည်။

## ဖိုင်များ

- `Website/index.html` — Header Bar နှင့် mobile bottom navigation markup
- `Website/styles.css` — fixed top header, fixed phone bottom bar, desktop/mobile breakpoints နှင့် sample-inspired colors
- `Website/script.js` — mobile menu, theme toggle နှင့် EN/MM toggle

## နောက်အဆင့်

ဤ Header နှင့် mobile bottom navigation UI/UX ကို အတည်ပြုပြီးမှသာ အခြား page sections သို့မဟုတ် Supabase shared backend integration ကို သီးခြားအဆင့်အဖြစ် စတင်မည်။
