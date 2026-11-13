# Website Development Documentation Workflow

M Sharing Website နှင့် ပတ်သက်သည့် development အလုပ်များအတွက် အောက်ပါ documentation workflow ကို အမြဲလိုက်နာရမည်။

## Website implementation အလုပ်ပြီးတိုင်း

Website source code, UI/UX, routing, deployment, configuration, bug fix, refactor သို့မဟုတ် infrastructure အလုပ်တစ်ခု ပြီးဆုံးတိုင်း `Website/Doc/` အတွင်းတွင် မှတ်တမ်းရေးရမည်။ မှတ်တမ်းတွင် အနည်းဆုံး အောက်ပါအချက်များ ပါဝင်ရမည်။

- ပြုလုပ်ခဲ့သည့်အလုပ်နှင့် ရည်ရွယ်ချက်
- ပြောင်းလဲခဲ့သည့် file/path များ
- အရေးကြီးသော implementation detail သို့မဟုတ် configuration
- စမ်းသပ်စစ်ဆေးခဲ့သည့်အရာများနှင့် ရလဒ်
- မပြီးသေးသည့်အလုပ် သို့မဟုတ် သတိပြုရန်အချက်များ

မှတ်တမ်းသည် သက်ဆိုင်ရာ existing document တွင် update လုပ်နိုင်သကဲ့သို့ အလုပ်အမျိုးအစားသီးခြားဖြစ်ပါက `Website/Doc/` အတွင်း document အသစ်တစ်ခုလည်း ဖန်တီးနိုင်သည်။ `Website/Doc/README.md` တွင် document အသစ်၏ link ကို ထည့်ရမည်။

## Plan သို့မဟုတ် လုပ်ငန်းစဉ် ပြောင်းလဲတိုင်း

Product plan, technical plan, implementation sequence, architecture decision သို့မဟုတ် အလုပ်လုပ်သည့်ပုံစံ ပြောင်းလဲ/သတ်မှတ်သည့်အခါ `Website/Plan/README.md` သို့မဟုတ် သက်ဆိုင်ရာ `Website/Plan/` document ကို update လုပ်ရမည်။ Update တွင် လက်ရှိဆုံးဖြတ်ချက်၊ အကြောင်းရင်း၊ သက်ရောက်မှုနှင့် နောက်တစ်ဆင့်လုပ်ရမည့်အလုပ်ကို ရှင်းလင်းစွာ ဖော်ပြရမည်။

## Responsive UI/UX

UI/UX code ရေးသားသည့်အခါ ဖုန်းနှင့် web app/desktop layout နှစ်မျိုးလုံးကို စတင်ကတည်းက responsive ဖြစ်အောင်ရေးရမည်။ အနည်းဆုံး phone viewport တစ်ခုနှင့် desktop web-app viewport တစ်ခုတွင် layout, overflow, navigation နှင့် controls အသုံးပြုနိုင်မှုကို စစ်ဆေးရမည်။

## Commit နှင့် repository record

Code change နှင့်အတူ သက်ဆိုင်ရာ Doc/Plan update ကို တစ်စုတစ်စည်းတည်း commit လုပ်ရမည်။ စစ်ဆေးမှုအောင်မြင်ပြီးနောက် website-related အလုပ်တိုင်းကို ချိတ်ဆက်ထားသော GitHub repository နှင့် လက်ရှိ branch သို့ push လုပ်ရမည်။ Push မလုပ်မီ remote branch ကို fetch လုပ်ပြီး remote changes ရှိပါက မိမိပြောင်းလဲမှုနှင့် အခြားပြောင်းလဲမှုများ မပျောက်စေဘဲ ပေါင်းစည်းရမည်။ Push ပြီးနောက် commit SHA ကို စစ်ဆေးအတည်ပြုရမည်။ GitHub push လုပ်ခြင်းသည် Cloudflare deployment/publication ကို ခွင့်ပြုခြင်းမဟုတ်ပါ။ အသုံးပြုသူက သီးခြားတောင်းဆိုမှသာ deploy လုပ်ရမည်။ Documentation မပါဘဲ website-related change ကို ပြီးစီးသည်ဟု မသတ်မှတ်ရ။

## 2026-11-13 — Website folder restructuring

`Website/` အတွင်း `Website/Website/` folder အသစ်ဖန်တီးပြီး `_headers`, `index.html`, `script.js`, `styles.css` နှင့် `wrangler.jsonc` ဖိုင်များကို ထို folder အတွင်းသို့ ရွှေ့ခဲ့သည်။ ပြောင်းလဲမှုကို commit `c93b6a9` ဖြင့် `main` branch သို့ push လုပ်ထားသည်။

## 2026-11-13 — Owner workflow requirements

Website UI အလုပ်တိုင်းတွင် ဖုန်းနှင့် web app layout ကို responsive ဖြစ်အောင် ရေးပြီး စစ်ဆေးရန်၊ website အလုပ်ပြီးတိုင်း `Doc/` တွင် မှတ်တမ်းတင်ရန်၊ Plan သို့မဟုတ် အလုပ်လုပ်ပုံ ပြောင်းလဲတိုင်း `Plan/` ကို update လုပ်ရန်နှင့် စစ်ဆေးမှုအောင်မြင်သည်နှင့် ချိတ်ဆက်ထားသော GitHub repository သို့ push လုပ်ရန် owner က သတ်မှတ်ခဲ့သည်။ ဤစည်းမျဉ်းကို အထက်ပါအပိုင်းများတွင် workflow အဖြစ် ထည့်သွင်းထားသည်။
