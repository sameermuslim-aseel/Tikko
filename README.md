# Tikko (تیکو)

اپ تسک منجمنت خانوادگی — موبایل‌اول، RTL، PWA.

مشخصات کامل محصول و مراحل ساخت در [PLAN.md](PLAN.md) است.

## استک

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 · shadcn/ui (Radix, RTL) · Supabase · TanStack Query · date-fns · Vazirmatn

## راه‌اندازی

```bash
npm install
cp .env.local.example .env.local   # مقادیر Supabase را پر کنید
npm run dev
```

سپس http://localhost:3000

## وضعیت

- [x] مرحلهٔ ۰ — راه‌اندازی پروژه، RTL، فونت
- [x] مرحلهٔ ۱ — دیتابیس و Auth
- [x] مرحلهٔ ۲ — نمای «امروز»
- [x] مرحلهٔ ۳ — تسک شخصی
- [x] مرحلهٔ ۴ — داشبورد ادمین
- [x] مرحلهٔ ۵ — PWA (دیپلوی: DEPLOY.md)
