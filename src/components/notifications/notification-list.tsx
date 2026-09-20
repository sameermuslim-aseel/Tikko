"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, ClipboardList, Moon, Sunrise, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchNotifications,
  markAllRead,
  notificationsQueryKey,
  type NotificationKind,
} from "@/lib/queries/notifications";
import { formatDateTime } from "@/lib/date";

const KIND_META: Record<
  NotificationKind,
  { label: string; Icon: typeof Sunrise }
> = {
  morning: { label: "خلاصهٔ صبح", Icon: Sunrise },
  evening: { label: "یادآوری شب", Icon: Moon },
  task: { label: "سر ساعت تسک", Icon: Clock },
  assigned: { label: "تسک جدید", Icon: ClipboardList },
};

export function NotificationList() {
  const queryClient = useQueryClient();

  const { data: rows, isPending, error } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: fetchNotifications,
  });

  const unreadIds = (rows ?? []).filter((r) => !r.read_at).map((r) => r.id);

  const markRead = useMutation({
    mutationFn: () => markAllRead(unreadIds),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 px-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="px-4 text-sm text-destructive">
        خطا در خواندن نوتیفیکیشن‌ها: {error.message}
      </p>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
        <BellOff className="size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">هنوز نوتیفیکیشنی نیست</p>
        <p className="text-xs text-muted-foreground/70">
          یادآوری‌ها که فرستاده شوند، اینجا می‌مانند.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4">
      {unreadIds.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => markRead.mutate()}
          disabled={markRead.isPending}
          className="self-start text-xs"
        >
          همه را خوانده‌شده علامت بزن ({unreadIds.length})
        </Button>
      )}

      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const meta = KIND_META[row.kind];
          const Icon = meta?.Icon ?? ClipboardList;
          const unread = !row.read_at;

          return (
            <li
              key={row.id}
              className={`flex gap-3 rounded-xl border p-3 ${
                unread ? "border-success/40 bg-success/5" : ""
              }`}
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                  unread ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="size-4" />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {row.title ?? meta?.label ?? "تیکو"}
                </span>

                {row.body && (
                  <span className="text-sm text-muted-foreground">{row.body}</span>
                )}

                <span className="text-xs text-muted-foreground/70">
                  {meta?.label} · {formatDateTime(row.sent_at)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
