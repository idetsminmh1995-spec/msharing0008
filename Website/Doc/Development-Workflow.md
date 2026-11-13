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

## Commit နှင့် repository record

Code change နှင့်အတူ သက်ဆိုင်ရာ Doc/Plan update ကို commit တစ်ခုတည်းတွင် ထည့်သွင်းရန် ဦးစားပေးရမည်။ Documentation မပါဘဲ website-related change ကို ပြီးစီးသည်ဟု မသတ်မှတ်ရ။

## 2026-11-13 — Website folder restructuring

`Website/` အတွင်း `Website/Website/` folder အသစ်ဖန်တီးပြီး `_headers`, `index.html`, `script.js`, `styles.css` နှင့် `wrangler.jsonc` ဖိုင်များကို ထို folder အတွင်းသို့ ရွှေ့ခဲ့သည်။ ပြောင်းလဲမှုကို commit `c93b6a9` ဖြင့် `main` branch သို့ push လုပ်ထားသည်။
