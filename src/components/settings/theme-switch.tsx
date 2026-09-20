"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "روشن", Icon: Sun },
  { value: "dark", label: "تاریک", Icon: Moon },
  { value: "system", label: "سیستم", Icon: Monitor },
] as const;

const subscribeNever = () => () => {};

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  /*
    تم انتخاب‌شده فقط در مرورگر معلوم است. اگر مستقیم موقع render
    خوانده شود، سرور و کلاینت فرق می‌کنند و hydration می‌شکند —
    همان اشکالی که در صفحهٔ نوتیفیکیشن پیش آمد.
  */
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const active = mounted ? (theme ?? "system") : null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="text-sm font-medium">تم اپ</h2>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-1">
        {OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active === value}
            className={`flex h-11 items-center justify-center gap-1.5 rounded-md text-sm transition-colors ${
              active === value
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        «سیستم» از تنظیم خود گوشی پیروی می‌کند و شب‌ها خودکار تاریک می‌شود.
      </p>
    </section>
  );
}
