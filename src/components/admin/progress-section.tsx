"use client";

import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import {
  adminKeys,
  fetchMemberProgress,
  fetchMembers,
  type MemberProgress,
} from "@/lib/queries/admin";
import { toDateKey } from "@/lib/date";

function percent(p: MemberProgress | undefined): number {
  if (!p || p.total === 0) return 0;
  return Math.round((p.completed / p.total) * 100);
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-foreground transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function ProgressSection() {
  const today = toDateKey(new Date());
  const weekAgo = toDateKey(addDays(new Date(), -6));

  const { data: members } = useQuery({
    queryKey: adminKeys.members,
    queryFn: fetchMembers,
  });

  const { data: todayProgress, error: todayError } = useQuery({
    queryKey: adminKeys.progress(today, today),
    queryFn: () => fetchMemberProgress(today, today),
  });

  const { data: weekProgress, error: weekError } = useQuery({
    queryKey: adminKeys.progress(weekAgo, today),
    queryFn: () => fetchMemberProgress(weekAgo, today),
  });

  if (!members?.length) return null;

  // بدون این، خطای کوئری به‌صورت «۰ از ۰» دیده می‌شد
  // که با «تسکی نداری» اشتباه گرفته می‌شود.
  const error = todayError ?? weekError;

  return (
    <section className="flex flex-col gap-3 px-4">
      <h2 className="text-sm font-medium text-muted-foreground">پیشرفت</h2>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          خطا در خواندن پیشرفت: {error.message}
        </p>
      )}

      {members.map((member) => {
        const todayStats = todayProgress?.find((p) => p.user_id === member.id);
        const weekStats = weekProgress?.find((p) => p.user_id === member.id);

        return (
          <div key={member.id} className="flex flex-col gap-2 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{member.display_name}</span>
              <span className="text-xs text-muted-foreground">
                {member.role === "admin" ? "ادمین" : "عضو"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>امروز</span>
                <span>
                  {todayStats?.completed ?? 0} از {todayStats?.total ?? 0}
                </span>
              </div>
              <ProgressBar value={percent(todayStats)} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>۷ روز اخیر</span>
                <span>
                  {weekStats?.completed ?? 0} از {weekStats?.total ?? 0}
                </span>
              </div>
              <ProgressBar value={percent(weekStats)} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
