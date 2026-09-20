"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  AssignIllustration,
  HouseholdIllustration,
  StreakIllustration,
  TodayIllustration,
} from "./illustrations";

const SLIDES = [
  {
    Illustration: HouseholdIllustration,
    title: "اول یک خانواده",
    body: "تیکو دور «خانواده» می‌چرخد. اگر اولین نفری، خانواده را خودت بساز و یک کد ۶ حرفی می‌گیری. اگر کسی قبلاً ساخته، همان کد را از او بگیر و با آن بپیوند.",
  },
  {
    Illustration: AssignIllustration,
    title: "ادمین و عضو",
    body: "کسی که خانواده را می‌سازد ادمین می‌شود: برای همه تسک تعیین می‌کند، کتگوری می‌سازد و پیشرفت همه را می‌بیند. عضو تسک‌های خودش را می‌بیند و تیک می‌زند — تسکی که ادمین داده را نمی‌تواند حذف کند.",
  },
  {
    Illustration: TodayIllustration,
    title: "هر روز، یک لیست ساده",
    body: "تسک‌های همان روز را می‌بینی و با یک لمس تیک می‌زنی. تیکِ امروز روی فردا اثر ندارد؛ تسک تکراری فردا دوباره بدون تیک می‌آید. تسک شخصی خودت را هم با دکمهٔ + اضافه کن.",
  },
  {
    Illustration: StreakIllustration,
    title: "پیوسته بمان",
    body: "روزی که همهٔ تسک‌های آن روز را تمام کنی، استریکت یک روز بیشتر می‌شود. روزِ بدون تسک آن را نمی‌شکند. یادآوری‌ها هم کمک می‌کنند چیزی از قلم نیفتد.",
  },
];

export function IntroCarousel({
  userId,
  hasHousehold,
}: {
  userId: string;
  hasHousehold: boolean;
}) {
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

    // هنوز خانواده‌ای ندارد → مرحلهٔ بعد ساخت یا پیوستن است
    router.push(hasHousehold ? "/" : "/onboarding");
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
              i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
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
