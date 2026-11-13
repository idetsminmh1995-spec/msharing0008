# Header Bar Implementation

## အကျဉ်းချုပ်

M Sharing music-platform UI board ကို visual reference အဖြစ် အသုံးပြုပြီး Website ၏ Header Bar ပထမအဆင့်ကို တည်ဆောက်ထားသည်။ လက်ရှိအဆင့်တွင် Header Bar သာ ပါဝင်ပြီး dashboard, hero section နှင့် အခြားစာမျက်နှာ content များ မထည့်ရသေးပါ။

## Web / Desktop view

- Brand mark `M` နှင့် `Sharing` wordmark ကို ဘယ်ဘက်တွင် ထည့်ထားသည်။
- Primary navigation အဖြစ် `Home`, `Courses`, `Store`, `Create`, `Library` ကို ထည့်ထားသည်။
- လက်ရှိစာမျက်နှာကို အနီရောင် underline ဖြင့် active state ပြထားသည်။
- Music/courses/notes ရှာဖွေရန် search box ထည့်ထားသည်။
- Notification icon နှင့် unread notification dot ထည့်ထားသည်။
- Profile avatar နှင့် profile menu indicator ထည့်ထားသည်။

## Phone / Mobile view

- Desktop navigation ကို ဖျောက်ပြီး hamburger menu သို့ ပြောင်းထားသည်။
- Mobile header တွင် menu button, brand, notification, profile ကို compact layout ဖြင့် ပြထားသည်။
- Screen width 560px အောက်တွင် search box နှင့် profile chevron ကို ဖျောက်ထားပြီး touch target များကို မျက်နှာပြင်နှင့်ကိုက်ညီအောင် ထိန်းထားသည်။
- Hamburger ကိုနှိပ်လျှင် mobile navigation menu ပွင့်/ပိတ်သည်။ Navigation item ကိုရွေးပြီးလျှင် menu ပြန်ပိတ်သည်။

## ဖိုင်များ

- `Website/index.html` — Header Bar markup နှင့် semantic navigation
- `Website/styles.css` — dark theme, responsive breakpoints, spacing, colors, hover/focus states
- `Website/script.js` — mobile menu toggle နှင့် accessible `aria-expanded` state

## Design decisions

- Reference ပုံ၏ black/navy background နှင့် red accent ကို အဓိက palette အဖြစ် အသုံးပြုထားသည်။
- `Inter` font ကို UI text အတွက် အသုံးပြုထားသည်။ Google Fonts မရပါက system sans-serif fallback သုံးမည်။
- CSS media queries သုံးပြီး desktop/tablet/mobile layout များကို dependency မလိုဘဲ responsive ပြုလုပ်ထားသည်။
- Icon များကို inline SVG ဖြင့် ထည့်ထားသောကြောင့် icon library ထပ်မံ install လုပ်ရန် မလိုပါ။
