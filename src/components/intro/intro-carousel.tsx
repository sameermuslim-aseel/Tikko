"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  AssignIllustration,
  StreakIllustration,
  TodayIllustration,
} from "./illustrations";

const SLIDES = [
  {
    Illustration: TodayIllustration,
    title: "هر روز، یک لیست ساده",
    body: "تسک‌های همان روز را می‌بینی. با یک لمس تیک می‌زنی و همان‌جا سبز می‌شود. تیکِ امروز روی فردا اثر ندارد — فردا دوباره از نو شروع می‌شود.",
  },
  {
    Illustration: AssignIllustration,
    title: "تسک‌ها را تعیین کن",
    body: "ادمین خانواده می‌تواند برای هر کس تسک بگذارد و روزهای هفته‌اش را انتخاب کند. تسک‌های شخصی خودت را هم می‌توانی با دکمهٔ + اضافه یا حذف کنی.",
  },
  {
    Illustration: StreakIllustration,
    title: "پیوسته بمان",
    body: "روزی که همهٔ تسک‌هایت را تمام کنی، استریکت یک روز بیشتر می‌شود. یادآوری‌ها هم کمک می‌کنند چیزی از قلم نیفتد.",
  },
];

export function IntroCarousel({ userId }: { userId: string }) {
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  async function finish() {
    setPending(true);

    // اگر ذخیره نشد هم کاربر را معطل نمی‌کنیم؛ بدترین حالت
    // این است که دفعهٔ بعد دوباره آموزش را ببیند
    await createClient()
      .from("profiles")
      .update({ intro_seen_at: new Date().toISOString() })
      .eq("id", userId);

    router.push("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col px-6 py-8">
      {/* رد کردن */}
      <div className="flex justify-start">
        {!isLast && (
          <button
            type="button"
            onClick={finish}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            رد کردن
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <slide.Illustration />

        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold">{slide.title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {slide.body}
          </p>
        </div>
      </div>

      {/* نقطه‌های صفحه */}
      <div className="mb-6 flex justify-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`صفحهٔ ${i + 1}`}
            aria-current={i === index}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-foreground" : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-3">
        {index > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIndex(index - 1)}
            className="h-12 flex-1"
          >
            قبلی
          </Button>
        )}

        <Button
          type="button"
          disabled={pending}
          onClick={() => (isLast ? finish() : setIndex(index + 1))}
          className="h-12 flex-1 text-base"
        >
          {pending ? "..." : isLast ? "شروع کنیم" : "بعدی"}
        </Button>
      </div>
    </main>
  );
}
