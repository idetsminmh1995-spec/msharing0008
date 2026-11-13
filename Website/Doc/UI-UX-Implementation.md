# Header UI/UX Implementation

## Scope

ဤအဆင့်တွင် M Sharing ၏ **Header Bar နှင့် mobile bottom navigation bar** ကိုသာ ပြင်ဆင်ထားသည်။ Hero section, feature cards, music-note cards, dashboard နှင့် အခြား page content များကို မထည့်သွင်းထားပါ။ Sample music-platform UI board ၏ dark/navy background, red accent, compact top header နှင့် phone bottom tab bar ကို reference အဖြစ် အသုံးပြုထားသည်။

## Web view

Desktop/web view တွင် logo နှင့် `Courses`, `Store`, `Create Video`, `Notation Lab` navigation များ ပါဝင်သည်။ `Home Page` နှင့် မတောင်းထားသော `Library` menu နှစ်ခုလုံးကို မထည့်ထားပါ။ Logo ကို home သို့သွားရန် အသုံးပြုနိုင်သည်။ ညာဘက်တွင် Search icon, `EN/MM` language control, Dark/Light theme control, Favorite icon, Cart icon, Notification icon နှင့် Account icon များ ပါဝင်သည်။ Active navigation item ကို red underline ဖြင့် ပြထားသည်။

## Phone view

Phone view ၏ အပေါ်ဘက် Header တွင် Menu icon, logo, Search icon နှင့် Notification icon ပဲ ပြထားသည်။ အောက်ဘက် fixed bottom bar တွင် `Home`, `Courses`, `Store`, `Create Video`, `Notation Lab` နှင့် `Account` tabs ခြောက်ခုသာ ပါဝင်သည်။ Bottom bar သည် screen အောက်ခြေတွင် အမြဲတည်နေပြီး page content မဖုံးစေရန် body bottom padding ထည့်ထားသည်။

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

## ပြီးစီးထားသောအလုပ်များ

လက်ရှိ Header scope အတွင်း Web Header ကို fixed ပြုလုပ်ခြင်း၊ logo/home link ထည့်ခြင်း၊ Web Header အလယ်တွင် `Courses`, `Store`, `Create Video`, `Notation Lab` ထားခြင်း၊ ညာဘက်တွင် Search, EN/MM, Dark/Light, Favorite, Cart, Notification နှင့် Account controls ထည့်ခြင်းတို့ ပြီးစီးထားသည်။ `Home Page` နှင့် `Library` ကဲ့သို့ မတောင်းထားသော menu များကို ဖယ်ထားသည်။

Phone အတွက် top Header တွင် Menu, Logo, Search, Notification ထားပြီး အောက် fixed bar တွင် `Home`, `Courses`, `Store`, `Create Video`, `Notation Lab`, `Account` tabs ခြောက်ခု ထည့်ပြီးဖြစ်သည်။ Mobile menu toggle, active tab, theme/language indicator, cache-busting asset links နှင့် Cloudflare Workers Static Assets configuration ကိုလည်း ပြင်ဆင်ပြီး Wrangler dry-run/static checks ဖြင့် စစ်ထားသည်။

## မပြီးသေးသောအလုပ်များ

- Navigation item များအတွက် တကယ့် route/page components မတည်ဆောက်ရသေးပါ။
- Search, Favorite, Cart, Notification နှင့် Account controls သည် local UI state သာဖြစ်ပြီး Supabase shared backend မချိတ်ရသေးပါ။
- EN/MM toggle သည် လက်ရှိ indicator ပြောင်းခြင်းသာဖြစ်ပြီး ဘာသာပြန် content မချိတ်ရသေးပါ။
- Dark/Light toggle သည် လက်ရှိ local page theme သာဖြစ်ပြီး user preference ကို database တွင် မသိမ်းရသေးပါ။
- Supabase Auth, database schema, RLS, Cloudflare R2 upload/download နှင့် media metadata မစတင်ရသေးပါ။
- Dashboard, Courses, Store, Create Video နှင့် Notation Lab အတွင်းပိုင်း UI မစတင်ရသေးပါ။

## နောက်အဆင့်

ဤ Header နှင့် mobile bottom navigation UI/UX ကို အတည်ပြုပြီးမှသာ အခြား page sections သို့မဟုတ် Supabase shared backend integration ကို သီးခြားအဆင့်အဖြစ် စတင်မည်။
