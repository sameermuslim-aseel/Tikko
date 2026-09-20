import type { Priority } from "@/lib/types";

export type QuickTask = {
  title: string;
  priority: Priority;
  /** ۰ = همین روز، ۱ = فردا */
  dayOffset: 0 | 1;
};

/**
 * پارس سادهٔ متن تسک — عمداً فقط دو قاعده (PLAN-PHASE2.md بخش ۲.۵):
 *   «!» در آخر  → اولویت زیاد
 *   «فردا» در آخر → روز بعد
 *
 * بیشتر از این نباید اضافه شود؛ وگرنه کاربر باید حدس بزند اپ چه
 * چیزی را می‌فهمد و چه چیزی را نه.
 */
export function parseQuickTask(raw: string): QuickTask {
  let text = raw.trim();
  let priority: Priority = "medium";
  let dayOffset: 0 | 1 = 0;

  // «!» ممکن است چند تا باشد یا بعد از «فردا» بیاید
  while (text.endsWith("!") || text.endsWith("！")) {
    priority = "high";
    text = text.slice(0, -1).trim();
  }

  for (const word of ["فردا", "فردآ"]) {
    if (text.endsWith(word)) {
      dayOffset = 1;
      text = text.slice(0, -word.length).trim();
      break;
    }
  }

  // «فردا شیر بخر!» هم باید کار کند
  while (text.endsWith("!") || text.endsWith("！")) {
    priority = "high";
    text = text.slice(0, -1).trim();
  }

  return { title: text, priority, dayOffset };
}
