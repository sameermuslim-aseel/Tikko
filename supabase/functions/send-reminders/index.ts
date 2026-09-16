// یادآوری‌های تیکو — هر چند دقیقه توسط pg_cron صدا زده می‌شود.
//
// سه نوع پیام:
//   morning  — خلاصهٔ تسک‌های امروز
//   evening  — اگر هنوز تسک ناتمام مانده
//   task     — سر ساعت خود تسک
//
// جدول notification_log جلوی ارسال تکراری را می‌گیرد، چون cron
// چند بار در ساعت اجرا می‌شود.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "jsr:@supabase/supabase-js@2";

const KABUL_OFFSET_MINUTES = 4 * 60 + 30; // UTC+4:30، بدون ساعت تابستانی

type Profile = {
  id: string;
  display_name: string | null;
  notify_morning: boolean;
  notify_morning_at: string;
  notify_evening: boolean;
  notify_evening_at: string;
  notify_task_time: boolean;
};

type Subscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type Task = {
  id: string;
  title: string;
  time_of_day: string | null;
  is_completed: boolean;
};

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m);
}

Deno.serve(async (request) => {
  // فقط cron اجازهٔ صدا زدن دارد
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && request.headers.get("x-cron-secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@tikko.app";

  if (!vapidPublic || !vapidPrivate) {
    return new Response("VAPID keys missing", { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // «حالا» به وقت کابل
  const kabulNow = new Date(Date.now() + KABUL_OFFSET_MINUTES * 60_000);
  const today = kabulNow.toISOString().slice(0, 10);
  const nowMinutes = kabulNow.getUTCHours() * 60 + kabulNow.getUTCMinutes();

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, display_name, notify_morning, notify_morning_at, notify_evening, notify_evening_at, notify_task_time",
    );

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");

  const { data: sentToday } = await supabase
    .from("notification_log")
    .select("user_id, kind, ref_id")
    .eq("date", today);

  const alreadySent = new Set(
    (sentToday ?? []).map((row) => `${row.user_id}|${row.kind}|${row.ref_id ?? ""}`),
  );

  const subsByUser = new Map<string, Subscription[]>();
  for (const sub of (subscriptions ?? []) as Subscription[]) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  let sentCount = 0;

  async function send(
    userId: string,
    kind: "morning" | "evening" | "task",
    refId: string | null,
    title: string,
    body: string,
  ) {
    const subs = subsByUser.get(userId) ?? [];
    if (subs.length === 0) return;

    const payload = JSON.stringify({
      title,
      body,
      url: "/",
      tag: `${kind}-${refId ?? today}`,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sentCount++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410 یعنی اشتراک منقضی شده — پاکش کن
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("push failed", sub.endpoint, status, String(error));
        }
      }
    }

    await supabase.from("notification_log").insert({
      user_id: userId,
      kind,
      ref_id: refId,
      date: today,
    });
  }

  for (const profile of (profiles ?? []) as Profile[]) {
    if (!subsByUser.has(profile.id)) continue;

    const { data: tasks } = await supabase.rpc("get_tasks_for_date", {
      p_date: today,
      p_user: profile.id,
    });

    const todayTasks = (tasks ?? []) as Task[];
    if (todayTasks.length === 0) continue;

    const remaining = todayTasks.filter((t) => !t.is_completed);

    // ۱) خلاصهٔ صبح
    if (
      profile.notify_morning &&
      nowMinutes >= timeToMinutes(profile.notify_morning_at) &&
      !alreadySent.has(`${profile.id}|morning|`)
    ) {
      await send(
        profile.id,
        "morning",
        null,
        "صبح بخیر 🌅",
        `امروز ${todayTasks.length} تسک داری.`,
      );
    }

    // ۲) یادآوری شب، فقط اگر چیزی ناتمام مانده
    if (
      profile.notify_evening &&
      nowMinutes >= timeToMinutes(profile.notify_evening_at) &&
      remaining.length > 0 &&
      !alreadySent.has(`${profile.id}|evening|`)
    ) {
      await send(
        profile.id,
        "evening",
        null,
        "هنوز وقت هست ⏳",
        `${remaining.length} تسک از امروز باقی مانده.`,
      );
    }

    // ۳) سر ساعت هر تسک
    if (profile.notify_task_time) {
      for (const task of remaining) {
        if (!task.time_of_day) continue;
        if (nowMinutes < timeToMinutes(task.time_of_day)) continue;
        if (alreadySent.has(`${profile.id}|task|${task.id}`)) continue;

        await send(profile.id, "task", task.id, "تیکو", task.title);
      }
    }
  }

  return Response.json({ ok: true, sent: sentCount, at: kabulNow.toISOString() });
});
