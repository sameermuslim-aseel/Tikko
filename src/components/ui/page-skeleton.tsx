/**
 * اسکلتون مشترک صفحه‌ها.
 *
 * بدون loading.tsx، ناوبری تا وقتی کار سرور تمام نشود هیچ چیزی نشان
 * نمی‌دهد و کاربر فکر می‌کند اپ هنگ کرده. این اسکلتون بلافاصله
 * می‌آید تا معلوم باشد صفحه در حال آمدن است.
 */
export function PageSkeleton({
  title,
  rows = 4,
}: {
  title: string;
  rows?: number;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <header className="px-4">
        <h1 className="text-xl font-bold">{title}</h1>
      </header>

      <div className="flex flex-col gap-2 px-4">
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-muted"
            // ردیف‌های پایین‌تر کم‌رنگ‌تر، تا شبیه دیوار خاکستری نباشد
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
