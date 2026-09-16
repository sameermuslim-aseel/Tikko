import { NotificationList } from "@/components/notifications/notification-list";

/** لیست نوتیفیکیشن‌های فرستاده‌شده برای کاربر جاری */
export default function NotificationsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 pb-24">
      <header className="px-4">
        <h1 className="text-xl font-bold">نوتیفیکیشن‌ها</h1>
        <p className="text-sm text-muted-foreground">
          یادآوری‌هایی که برایت فرستاده شده
        </p>
      </header>

      <NotificationList />
    </div>
  );
}
