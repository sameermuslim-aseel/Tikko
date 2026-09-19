import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";

/** هفتهٔ ایرانی از شنبه شروع می‌شود (date-fns: 6 = شنبه) */
const WEEK_STARTS_ON = 6 as const;

export function weekStart(date: Date): Date {
  return startOfWeek(startOfDay(date), { weekStartsOn: WEEK_STARTS_ON });
}

/** ۷ روز یک هفته، از شنبه تا جمعه */
export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * کلید تاریخ برای دیتابیس: همیشه yyyy-MM-dd در وقت محلی.
 * از toISOString استفاده نمی‌کنیم چون به UTC تبدیل می‌کند و
 * شب‌ها تاریخ را یک روز جابه‌جا می‌کند.
 */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * نمایش تاریخ شمسی به دری افغانستان.
 *
 * مهم: locale باید fa-AF باشد نه fa-IR — نام ماه‌ها فرق می‌کند:
 *   fa-AF → ۲۵ سنبلهٔ ۱۴۰۵   (دری، افغانستان)
 *   fa-IR → ۲۵ شهریور ۱۴۰۵   (فارسی، ایران)
 * سال و ارقام یکی است، فقط نام ماه‌ها متفاوت‌اند.
 */
const FA_LOCALE = "fa-AF";

const dayNumberFormatter = new Intl.DateTimeFormat(FA_LOCALE, { day: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat(FA_LOCALE, { weekday: "narrow" });
const weekdayLongFormatter = new Intl.DateTimeFormat(FA_LOCALE, { weekday: "long" });
const dayMonthFormatter = new Intl.DateTimeFormat(FA_LOCALE, {
  day: "numeric",
  month: "long",
});

const dateTimeFormatter = new Intl.DateTimeFormat(FA_LOCALE, {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** «۲۵ سنبله، ۰۸:۰۰» — برای لیست نوتیفیکیشن‌ها */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateTimeFormatter.format(date);
}

/**
 * «دیروز» یا «۳ روز پیش» — برای لیست عقب‌افتاده‌ها خواناتر از تاریخ خام است
 */
export function relativeDayLabel(day: string, today = new Date()): string {
  const target = new Date(`${day}T00:00:00`);
  const diff = differenceInCalendarDays(startOfDay(today), target);

  if (diff <= 0) return "امروز";
  if (diff === 1) return "دیروز";
  if (diff === 2) return "پریروز";
  return `${numberFormatter.format(diff)} روز پیش`;
}

export function formatWeekdayLong(date: Date): string {
  return weekdayLongFormatter.format(date);
}

/** «۲۵ شهریور» — برای عنوان بازهٔ هفته */
export function formatDayMonth(date: Date): string {
  return dayMonthFormatter.format(date);
}
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

export { addWeeks, isSameDay, startOfDay };
