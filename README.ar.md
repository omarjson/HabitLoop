# HabitLoop

متتبع عادات **تطبيق ويب تقدمي (PWA)** يعمل دون اتصال بالإنترنت، مع مزامنة محلية أولاً، وجدولة ذكية، ورؤى مدعومة بالتعلم الآلي داخل المتصفح، وعناصر الألعاب. بدون خادم وبدون حسابات — تبقى كل بياناتك على جهازك.

![HabitLoop](public/icons/icon-192.png)

## ✨ الميزات

- **العادات وتسجيل الإنجاز** — تسجيل يومي بنقرة واحدة مع ملاحظات اختيارية
- **جدولة متقدمة** — يومي، كل عدد من الأيام، مرات أسبوعياً، مرات شهرياً، أو أيام محددة من الأسبوع؛ سلاسل تتحمل فترات السماح
- **السلاسل والإحصائيات** — السلسلة الحالية والأطول، ونسبة الإنجاز، وإجمالي مرات التسجيل
- **الخريطة الحرارية والرسوم البيانية** — شبكة مساهمة بصيغة SVG على غرار GitHub + أعمدة الاتجاه الأسبوعي
- **الرؤى (تعلم آلي)** — تحليل مشاعر ملاحظاتك داخل المتصفح عبر `transformers.js` (WebGPU/CPU)، ومحرك ارتباطات بين العادات
- **عناصر الألعاب** — نقاط خبرة ومستويات وأوسمة وبطاقات سلسلة قابلة للمشاركة بصيغة SVG
- **مزامنة عبر الأجهزة** — CRDT بلا تعارض (`yjs` + `y-indexeddb`) مع مزامنة نظير-to-نظير عبر `y-webrtc` (بدون خادم)
- **التذكيرات** — إشعارات عبر Notification API للعادات المستحقة
- **تعدد اللغات وسهولة الوصول** — الإنجليزية/العربية، تنقل كامل بلوحة المفاتيح، ARIA، وضع داكن/فاتح
- **PWA** — قابل للتثبيت، يعمل دون اتصال بالكامل
- **تصدير / استيراد** — نسخة احتياطية بصيغة JSON

## 🚀 النشر (مجاني)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/omarjson/habitloop)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/omarjson/habitloop)

أو انشر على **GitHub Pages** تلقائياً — سير العمل المرفق يبنى وينشر مع كل دفعة إلى `main`.
أمر البناء: `npm run build` ← المخرجات في `dist/`.

## 🛠️ التطوير المحلي

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # اختبارات vitest
npm run test:e2e   # playwright (يتطلب: npx playwright install chromium)
npm run build      # بناء الإنتاج -> dist/
```

## 🧱 البنية

```
src/
  main.js        نقطة الدخول: تربط الواجهة والمزامنة والتذكيرات وعامل الخدمة
  store.js       Y.Doc + y-indexeddb (العادات والإنجازات)
  sync.js        مزامنة y-webrtc نظير-to-نظير + إدارة الغرفة
  schedule.js    قواعد التكرار وحساب السلاسل والنسب
  stats.js       تجميع السلاسل والنسب وبيانات الخريطة والرسوم
  insights.js    مشاعر transformers.js + محرك الارتباطات
  game.js        نقاط الخبرة والمستويات والأوسمة وبطاقة السلسلة
  ui.js          عرض الواجهات + نافذة العادة
  theme.js       حفظ الوضع الداكن/الفاتح
  reminders.js   إشعارات التذكير
  sw.js          عامل الخدمة (تخزين دون اتصال)
i18n/            en.json, ar.json
tests/           اختبارات vitest (schedule)
e2e/             سيناريو playwright للتسجيل
```

### نموذج البيانات
- `habit`: `{ id, name, emoji, color, frequency, tags[], createdAt, archived }`
- `completion`: `{ habitId, date, done, note, ts }` بمفتاح `habitId@date`

## 📦 التقنيات
Vanilla JS + [Vite](https://vitejs.dev) · [yjs](https://yjs.dev) · [idb](https://github.com/jakearchibald/idb) · [@xenova/transformers](https://huggingface.co/docs/transformers.js) · Vitest · Playwright

## 📄 الترخيص
MIT — راجع ملف [LICENSE](LICENSE).

[🇬🇧 English README](README.md)
