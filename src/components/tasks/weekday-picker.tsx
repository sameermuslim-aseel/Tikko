"use client";

/**
 * چیپ‌های روز هفته. ترتیب نمایش از شنبه شروع می‌شود (هفتهٔ ایرانی)،
 * ولی مقدارِ ذخیره‌شده قرارداد Postgres است: 0=یکشنبه … 6=شنبه.
 */
export const WEEKDAY_LABELS: Record<number, string> = {
  0: "ی",
  1: "د",
  2: "س",
  3: "چ",
  4: "پ",
  5: "ج",
  6: "ش",
};

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 6, label: "ش" },
  { value: 0, label: "ی" },
  { value: 1, label: "د" },
  { value: 2, label: "س" },
  { value: 3, label: "چ" },
  { value: 4, label: "پ" },
  { value: 5, label: "ج" },
];

export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (next: number[]) => void;
}) {
  function toggle(day: number) {
    onChange(
      value.includes(day)
        ? value.filter((d) => d !== day)
        : [...value, day].sort((a, b) => a - b),
    );
  }

  return (
    <div className="flex justify-between gap-1">
      {WEEKDAYS.map((day) => {
        const active = value.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            onClick={() => toggle(day.value)}
            aria-pressed={active}
            className={`size-11 rounded-full border text-sm transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input text-muted-foreground"
            }`}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
