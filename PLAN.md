# Tikko — پلان ساخت (MVP)

نام محصول: **Tikko** (نمایشی فارسی: «تیکو»)

> این فایل را در ریشهٔ پروژه به نام `PLAN.md` بگذارید و در `CLAUDE.md` به آن ارجاع دهید. Claude Code را مرحله به مرحله پیش ببرید (هر مرحله یک session جدا).

---

## ۱. خلاصهٔ محصول

یک وب‌اپ موبایل‌محور (PWA) برای تعیین و پیگیری تسک‌های روزانه بین دو (یا چند) کاربر.

- **ادمین** از داشبورد تسک تعیین می‌کند: به کدام کاربر، در کدام روزها (تکرار هفتگی)، با کدام کتگوری و اولویت.
- **کاربر** در نمای روزانه چک‌لیست خود را می‌بیند، تسک را تیک می‌زند، و می‌تواند تسک شخصی برای خودش اضافه کند.
- کاربر **نمی‌تواند** تسک‌های تعیین‌شده توسط ادمین را حذف یا ویرایش کند (فقط تیک/برداشتن تیک).
- ثبت‌نام و ورود با ایمیل.

## ۲. کاربران و نقش‌ها

| نقش | مجوزها |
|---|---|
| `admin` | ایجاد/ویرایش/حذف هر تسک، تعیین به هر کاربر، مدیریت کتگوری‌ها، دیدن پیشرفت همه |
| `member` | دیدن تسک‌های خود، تیک زدن، ایجاد/ویرایش/حذف تسک‌های **شخصی خودش** |

اولین کاربری که ثبت‌نام می‌کند ادمین می‌شود (یا ادمین از داشبورد نقش می‌دهد). واحد سازمانی: **household** (خانواده). هر کاربر عضو یک household است.

## ۳. استک تکنولوژی (پیشنهادی)

| لایه | انتخاب | چرا |
|---|---|---|
| فرانت‌اند | **Next.js 15 (App Router) + TypeScript** | SSR + PWA راحت، اکوسیستم قوی |
| UI | **Tailwind CSS + shadcn/ui** | مینیمال، موبایل‌اول، کامپوننت‌های دسترس‌پذیر |
| بک‌اند / دیتابیس | **Supabase** (Postgres + Auth + RLS) | بدون سرور جدا؛ Auth ایمیلی آماده؛ Row Level Security نقش‌ها را در سطح دیتابیس اعمال می‌کند |
| ورود | Supabase Auth — **Magic Link ایمیلی** (بدون رمز) | برای موبایل ساده‌ترین UX |
| State / Data | TanStack Query + Supabase JS | کش، optimistic update برای تیک زدن |
| تاریخ | `date-fns` | سبک |
| دیپلوی | Vercel (فرانت) + Supabase Cloud | رایگان برای MVP |
| PWA | `next-pwa` یا manifest دستی | «Add to Home Screen» در موبایل |

> جایگزین: اگر می‌خواهید کاملاً بدون سرویس خارجی باشد → Next.js + Prisma + SQLite/Postgres + Auth.js. اما Supabase برای MVP سریع‌تر است.

## ۴. مدل داده (Postgres)

```sql
-- خانواده / گروه
households (
  id uuid pk,
  name text,
  created_at timestamptz
)

-- پروفایل کاربر (مرتبط با auth.users)
profiles (
  id uuid pk references auth.users,
  household_id uuid references households,
  display_name text,
  role text check (role in ('admin','member')),
  created_at timestamptz
)

-- کتگوری‌ها (قابل مدیریت توسط ادمین)
categories (
  id uuid pk,
  household_id uuid,
  name text,          -- مثلاً: خانه، خرید، کار، شخصی
  color text,         -- hex
  icon text           -- اسم آیکون lucide
)

-- تعریف تسک (الگو / template)
tasks (
  id uuid pk,
  household_id uuid,
  created_by uuid references profiles,
  assigned_to uuid references profiles,      -- کاربر مسئول
  title text not null,
  description text,
  category_id uuid references categories,
  priority text check (priority in ('low','medium','high')),
  source text check (source in ('admin','self')),   -- کلید مجوز حذف
  -- زمان‌بندی
  schedule_type text check (schedule_type in ('once','weekly')),
  due_date date,                 -- برای once
  weekdays int[],                -- برای weekly: 0=یکشنبه … 6=شنبه
  start_date date,               -- شروع تکرار
  end_date date,                 -- اختیاری
  time_of_day time,              -- اختیاری، فقط نمایشی
  is_active boolean default true,
  created_at timestamptz
)

-- وضعیت انجام برای هر روز (instance)
task_completions (
  id uuid pk,
  task_id uuid references tasks on delete cascade,
  date date not null,
  completed_by uuid references profiles,
  completed_at timestamptz,
  unique (task_id, date)
)
```

**منطق کلیدی:** تسک‌های تکراری در دیتابیس تکثیر نمی‌شوند. برای نمایش «تسک‌های امروز»، تسک‌های `weekly` که `weekdays` آن‌ها شامل روز جاری است + تسک‌های `once` با `due_date = امروز` را می‌خوانیم و با `task_completions` join می‌کنیم تا وضعیت تیک مشخص شود.

### قواعد RLS (Row Level Security)

- همه: فقط ردیف‌های `household_id` خودشان.
- `tasks` SELECT: ادمین همه؛ عضو فقط `assigned_to = خودش`.
- `tasks` INSERT: عضو فقط با `source='self'` و `assigned_to = خودش`.
- `tasks` UPDATE/DELETE: ادمین همه؛ عضو فقط `source='self' and created_by = خودش`.
- `task_completions` INSERT/DELETE: فقط کاربری که تسک به او assign شده یا ادمین.

## ۵. صفحات و UX

### موبایل (اولویت اصلی — ۹۰٪ استفاده)

| مسیر | توضیح |
|---|---|
| `/login` | فقط فیلد ایمیل → «لینک ورود فرستاده شد» |
| `/onboarding` | اسم نمایشی + ساخت household یا پیوستن با کد دعوت |
| `/` (امروز) | **صفحهٔ اصلی.** نوار افقی تاریخ (۷ روز، امروز در مرکز، سوایپ)، زیر آن چک‌لیست تسک‌های آن روز گروه‌بندی‌شده بر اساس اولویت یا کتگوری. تیک با یک لمس + بازخورد haptic/انیمیشن. تسک‌های انجام‌شده به پایین منتقل و کم‌رنگ می‌شوند. |
| `/` → دکمهٔ FAB `+` | Bottom sheet برای اضافه کردن تسک شخصی (عنوان، کتگوری، اولویت، یک‌بار/تکراری، روزها) |
| `/task/[id]` | جزئیات تسک (bottom sheet). اگر `source='admin'` → فقط خواندنی با برچسب «تعیین‌شده توسط ادمین». |
| `/admin` | فقط برای ادمین (پایین‌تر) |
| ناوبری | Bottom tab bar: امروز · هفته · داشبورد(ادمین) · پروفایل |

### داشبورد ادمین (`/admin`)

- انتخاب کاربر → دیدن تسک‌های او و درصد انجام امروز/هفته.
- لیست همهٔ تسک‌های فعال با فیلتر (کاربر، کتگوری، اولویت).
- فرم ایجاد/ویرایش تسک: عنوان، توضیح، کاربر، کتگوری، اولویت، نوع زمان‌بندی، **انتخاب‌گر روزهای هفته (چیپ‌های ش ی د س چ پ ج)**، تاریخ شروع/پایان، ساعت اختیاری.
- مدیریت کتگوری‌ها (اسم، رنگ).
- دعوت عضو جدید: تولید کد دعوت / لینک.

### اصول UI

- مینیمال: سفید/خاکستری روشن، یک رنگ accent، رنگ‌های کتگوری فقط به‌صورت نقطه یا نوار باریک.
- اولویت با نشانهٔ ظریف (High = نوار قرمز کنار کارت) نه با هیاهو.
- هدف لمسی حداقل ۴۴px، فونت خوانا ۱۶px+.
- **RTL کامل** (`dir="rtl"`)، فونت فارسی مثل Vazirmatn.
- Dark mode (اختیاری، فاز ۲).
- حالت خالی («امروز تسکی نداری 🎉») و اسکلتون لودینگ.

## ۶. مراحل ساخت (هر مرحله = یک session در Claude Code)

### مرحلهٔ ۰ — راه‌اندازی
1. `npx create-next-app@latest` با TypeScript, Tailwind, App Router.
2. نصب shadcn/ui، lucide-react، @supabase/ssr، @tanstack/react-query، date-fns.
3. پروژهٔ Supabase بساز، `.env.local` (URL + anon key).
4. تنظیم RTL و فونت Vazirmatn در `layout.tsx`.
5. `CLAUDE.md` بنویس (استک، قواعد کد، ارجاع به این پلان).

### مرحلهٔ ۱ — دیتابیس و Auth
1. مایگریشن SQL جدول‌ها (بخش ۴) در `supabase/migrations/`.
2. Trigger: بعد از ثبت‌نام در `auth.users` → ردیف `profiles` ساخته شود.
3. پالیسی‌های RLS.
4. صفحهٔ `/login` با Magic Link + middleware برای محافظت مسیرها.
5. `/onboarding`: ساخت household (کاربر اول = admin) یا پیوستن با کد دعوت.

### مرحلهٔ ۲ — نمای «امروز» (هستهٔ MVP)
1. تابع `getTasksForDate(userId, date)` (query یا RPC در Supabase).
2. کامپوننت نوار تاریخ افقی.
3. کامپوننت `TaskItem` با چک‌باکس و optimistic update.
4. گروه‌بندی و ترتیب (ناتمام‌ها بالا، اولویت بالا اول).
5. حالت خالی و لودینگ.

### مرحلهٔ ۳ — تسک شخصی
1. FAB + bottom sheet (shadcn Drawer).
2. فرم ایجاد تسک شخصی (`source='self'`).
3. ویرایش/حذف فقط برای تسک‌های خودش؛ برای admin-task فقط نمایش.

### مرحلهٔ ۴ — داشبورد ادمین
1. گارد نقش (فقط admin).
2. لیست تسک‌ها با فیلتر.
3. فرم ایجاد/ویرایش تسک با انتخاب‌گر روزهای هفته.
4. مدیریت کتگوری‌ها.
5. کارت پیشرفت هر کاربر (امروز / ۷ روز اخیر).
6. دعوت عضو.

### مرحلهٔ ۵ — PWA و پرداخت نهایی
1. manifest + آیکون‌ها + service worker (کش استاتیک).
2. تست روی گوشی واقعی (Safari iOS + Chrome Android).
3. دیپلوی Vercel، دامنه، Redirect URL در Supabase Auth.

### فاز ۲ (بعد از MVP — الان نساز)
- نوتیفیکیشن پوش / یادآوری.
- نمای هفتگی/تقویمی کامل.
- استریک و آمار.
- نظر/توضیح روی تسک انجام‌شده.
- چند household برای یک کاربر.

## ۷. ساختار پوشه‌ها

```
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx          # bottom nav
    (app)/page.tsx            # امروز
    (app)/task/[id]/page.tsx
    (app)/admin/page.tsx
    (app)/admin/tasks/new/page.tsx
    (app)/profile/page.tsx
    onboarding/page.tsx
  components/
    tasks/ (TaskItem, TaskList, DateStrip, TaskForm, WeekdayPicker)
    admin/
    ui/ (shadcn)
  lib/
    supabase/ (client.ts, server.ts, middleware.ts)
    queries/ (tasks.ts, categories.ts, profiles.ts)
    schedule.ts   # منطق «آیا تسک X در تاریخ Y فعال است؟»
    types.ts      # از supabase gen types
supabase/
  migrations/
```

## ۸. پرامپت شروع برای Claude Code

```
PLAN.md را بخوان. مرحلهٔ ۰ را اجرا کن: پروژهٔ Next.js با TypeScript، Tailwind،
shadcn/ui، Supabase و RTL/فونت Vazirmatn راه‌اندازی کن. بعد CLAUDE.md بنویس که
استک، قواعد کدنویسی (TypeScript strict، server components پیش‌فرض، موبایل‌اول)
و ارجاع به PLAN.md را داشته باشد. قبل از هر تغییر بزرگ ساختار را با من چک کن.
```

## ۹. معیار پذیرش MVP

- [ ] دو کاربر با ایمیل وارد می‌شوند و در یک household هستند.
- [ ] ادمین تسک تکراری برای روزهای مشخص (مثلاً ش‌و‌د‌و‌چ) به همسرش تعیین می‌کند.
- [ ] همسر در نمای «امروز» فقط تسک‌های همان روز را می‌بیند و تیک می‌زند.
- [ ] تیک برای هر روز جدا ذخیره می‌شود (تسک فردا دوباره بدون تیک ظاهر می‌شود).
- [ ] عضو تسک شخصی می‌سازد و حذف می‌کند؛ تسک ادمین را نمی‌تواند حذف کند (هم در UI هم در RLS).
- [ ] کتگوری و اولویت نمایش داده می‌شود.
- [ ] روی موبایل با یک دست راحت استفاده می‌شود؛ قابل Add to Home Screen.
