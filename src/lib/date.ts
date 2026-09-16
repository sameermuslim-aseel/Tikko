import { addDays, format, isSameDay, startOfDay } from "date-fns";

/**
 * کلید تاریخ برای دیتابیس: همیشه yyyy-MM-dd در وقت محلی.
 * از toISOString استفاده نمی‌کنیم چون به UTC تبدیل می‌کند و
 * شب‌ها تاریخ را یک روز جابه‌جا می‌کند.
 */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * نمایش تاریخ شمسی. Intl با locale fa-IR به‌صورت پیش‌فرض
 * تقویم هجری شمسی و ارقام فارسی می‌دهد — بدون کتابخانهٔ اضافه.
 * برای نمایش میلادی، locale را به "fa-IR-u-ca-gregory" تغییر دهید.
 */
const FA_LOCALE = "fa-IR";

const dayNumberFormatter = new Intl.DateTimeFormat(FA_LOCALE, { day: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat(FA_LOCALE, { weekday: "narrow" });
const fullDateFormatter = new Intl.DateTimeFormat(FA_LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat(FA_LOCALE);

/** عدد با ارقام فارسی — تا با تاریخ‌های شمسی هم‌خوان باشد */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDayNumber(date: Date): string {
  return dayNumberFormatter.format(date);
}

export function formatWeekday(date: Date): string {
  return weekdayFormatter.format(date);
}

export function formatFullDate(date: Date): string {
  return fullDateFormatter.format(date);
}

/** ۷ روز با امروز در مرکز (PLAN بخش ۵) */
export function weekAround(center: Date, radius = 3): Date[] {
  const start = addDays(startOfDay(center), -radius);
  return Array.from({ length: radius * 2 + 1 }, (_, i) => addDays(start, i));
}

export { isSameDay, startOfDay };
