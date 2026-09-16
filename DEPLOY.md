# دیپلوی Tikko

## ۱. قبل از دیپلوی — امنیت

این‌ها در حالت توسعه عمداً باز گذاشته شدند. قبل از آنلاین شدن باید بسته شوند.

- [ ] **Confirm email را روشن کنید**
      (Authentication → Sign In / Providers → Email)
      الان خاموش است، یعنی هر کسی می‌تواند با ایمیلی که مال خودش نیست ثبت‌نام کند.
      برای روشن کردن، اول باید SMTP سفارشی وصل باشد (بند بعد)، وگرنه
      محدودیت ۲ ایمیل در ساعت دوباره ثبت‌نام را خراب می‌کند.

- [ ] **SMTP سفارشی (Resend)**
      دامنه را در Resend تأیید کنید، API key بسازید، و در
      Authentication → Emails → SMTP Settings وارد کنید:
      `smtp.resend.com` / پورت `465` / یوزرنیم `resend` / پسورد = API key.
      بعد در Authentication → Rate Limits سقف ایمیل را بالا ببرید
      (پیش‌فرض بعد از SMTP سفارشی ۳۰ در ساعت است).

- [ ] **صفحهٔ ثبت‌نام باز است**
      هر کسی که آدرس را داشته باشد می‌تواند حساب بسازد. برای اپ دونفره
      بهتر است بعد از ساخت حساب‌ها، ثبت‌نام را ببندید یا فقط با کد دعوت
      اجازه دهید. (فاز بعدی)

## ۲. ورود با Magic Link (اختیاری)

الان ورود با ایمیل + رمز عبور است چون دامنه نداشتیم.
برای برگشتن به Magic Link طبق PLAN.md بخش ۵:

1. در `src/app/(auth)/login/page.tsx` به‌جای `signInWithPassword`
   از `signInWithOtp` استفاده کنید.
2. یک route handler در `src/app/auth/callback/route.ts` بسازید که
   `exchangeCodeForSession` را صدا بزند.
3. آدرس callback را در Redirect URLs سوپابیس اضافه کنید.

## ۳. دیپلوی روی Vercel

1. پروژه را روی GitHub پوش کنید.
2. در Vercel → New Project → ریپو را import کنید.
3. متغیرهای محیطی را اضافه کنید (Settings → Environment Variables):

   | نام | مقدار |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | آدرس API پروژه (نه آدرس داشبورد) |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | کلید `sb_publishable_...` |

   کلید `sb_secret_...` را اینجا نگذارید.

4. Deploy.

## ۴. تنظیم آدرس‌ها در سوپابیس

بعد از دیپلوی، در Authentication → URL Configuration:

- **Site URL**: آدرس production (مثلاً `https://tikko.vercel.app`)
- **Redirect URLs**: همان آدرس + `http://localhost:3000` برای توسعهٔ محلی

بدون این، ورود روی دامنهٔ اصلی کار نمی‌کند.

## ۵. تست روی گوشی واقعی

- [ ] **Android / Chrome** — منو → Add to Home screen
- [ ] **iOS / Safari** — Share → Add to Home Screen
      (iOS فقط از Safari این کار را قبول می‌کند، نه Chrome)
- [ ] بعد از باز کردن از آیکون، نوار آدرس نباید دیده شود (حالت standalone)
- [ ] تیک زدن با یک دست راحت باشد
- [ ] تاریخ شمسی و راست‌به‌چپ درست نمایش داده شود

## ۶. آیکون‌ها

آیکون‌ها از `public/icon.svg` ساخته می‌شوند:

```bash
node scripts/generate-icons.mjs
```

اگر طرح آیکون را عوض کردید، این دستور را دوباره اجرا کنید.
