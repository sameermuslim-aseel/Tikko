import { StatsView } from "@/components/stats/stats-view";

/** آمار و استریک کاربر جاری (فاز ۲) */
export default function StatsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 pb-24">
      <header className="px-4">
        <h1 className="text-xl font-bold">آمار</h1>
        <p className="text-sm text-muted-foreground">
          پیوستگی و درصد انجام تسک‌های شما
        </p>
      </header>

      <StatsView />
    </div>
  );
}
