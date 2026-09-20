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
  notify_assigned: boolean;
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

/** خطا را به‌صورت متن قابل خواندن برمی‌گرداند تا در SQL دیده شود */
function fail(message: string): Response {
  console.error(message);
  return new Response(message, {
    status: 500,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** طول واقعی یک کلید base64url پس از رمزگشایی */
function decodedLength(value: string): number {
  try {
    const normalized = value.trim().replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded).length;
  } catch {
    return -1;
  }
}

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m);
}

Deno.serve(async (request) => {
  try {
    return await handle(request);
  } catch (error) {
    // بدون این، هر خطای پیش‌بینی‌نشده فقط «Internal Server Error» می‌شود
    return fail(`خطای پیش‌بینی‌نشده: ${error instanceof Error ? error.message : String(error)}`);
  }
});

async function handle(request: Request): Promise<Response> {
  // فقط cron اجازهٔ صدا زدن دارد
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && request.headers.get("x-cron-secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@tikko.app";

  if (!vapidPublic || !vapidPrivate) {
    return fail("VAPID keys missing");
  }

  /*
    کلیدها را قبل از دادن به web-push بررسی می‌کنیم.
    پیام خطای خود کتابخانه فقط در لاگ می‌نشیند و در جدول
    net._http_response به «Internal Server Error» تبدیل می‌شود —
    یعنی برای عیب‌یابی از SQL هیچ سرنخی نمی‌ماند.

    فقط طول را گزارش می‌دهیم، نه خود مقدار را.
  */
  const pubBytes = decodedLength(vapidPublic);
  const privBytes = decodedLength(vapidPrivate);

  if (pubBytes !== 65) {
    return fail(
      `VAPID_PUBLIC_KEY باید ۶۵ بایت باشد ولی ${pubBytes} بایت است ` +
        `(طول رشته: ${vapidPublic.length}). مقدار درست حدود ۸۷ کاراکتر است.`,
    );
  }

  if (privBytes !== 32) {
    return fail(
      `VAPID_PRIVATE_KEY باید ۳۲ بایت باشد ولی ${privBytes} بایت است ` +
        `(طول رشته: ${vapidPrivate.length}). مقدار درست حدود ۴۳ کاراکتر است.`,
    );
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
      "id, display_name, notify_morning, notify_morning_at, notify_evening, notify_evening_at, notify_task_time, notify_assigned",
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
  // خطاهای ارسال در پاسخ برمی‌گردند، وگرنه فقط در لاگ می‌مانند و
  // از SQL دیده نمی‌شوند — در حالی که پیام در اپ ثبت شده و به نظر
  // می‌رسد همه‌چیز درست کار کرده
  const pushErrors: string[] = [];

  async function send(
    userId: string,
    kind: "morning" | "evening" | "task" | "assigned",
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
          pushErrors.push(`${status} — اشتراک منقضی بود و پاک شد`);
        } else {
          const body = (error as { body?: string }).body;
          pushErrors.push(`${status ?? "?"} — ${body ?? String(error)}`);
        }
      }
    }

    // متن هم ذخیره می‌شود تا در صفحهٔ نوتیفیکیشن‌های اپ دیده شود
    await supabase.from("notification_log").insert({
      user_id: userId,
      kind,
      ref_id: refId,
      date: today,
      title,
      body,
    });
  }

  const profileById = new Map(
    ((profiles ?? []) as Profile[]).map((p) => [p.id, p]),
  );

  // ---------------------------------------------------------------
  // تسک‌های تازه‌ای که ادمین برای کس دیگری تعیین کرده
  // گزارش این نوع بدون فیلتر تاریخ خوانده می‌شود: تسکی که دیشب
  // ساخته شده نباید امروز دوباره اطلاع داده شود.
  // ---------------------------------------------------------------
  const { data: recentTasks } = await supabase
    .from("tasks")
    .select("id, title, assigned_to, created_by")
    .eq("source", "admin")
    .eq("is_active", true)
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());

  const { data: assignedLog } = await supabase
    .from("notification_log")
    .select("ref_id")
    .eq("kind", "assigned");

  const assignedSent = new Set((assignedLog ?? []).map((row) => row.ref_id));

  for (const task of recentTasks ?? []) {
    // تسکی که ادمین برای خودش ساخته خبر ندارد
    if (task.assigned_to === task.created_by) continue;
    if (assignedSent.has(task.id)) continue;

    const target = profileById.get(task.assigned_to);
    if (!target?.notify_assigned) continue;

    const assigner = profileById.get(task.created_by);

    await send(
      task.assigned_to,
      "assigned",
      task.id,
      "تسک جدید 📌",
      assigner?.display_name
        ? `${assigner.display_name} برایت تعیین کرد: ${task.title}`
        : task.title,
    );
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

  return Response.json({
    ok: true,
    sent: sentCount,
    subscriptions: (subscriptions ?? []).length,
    errors: pushErrors,
    at: kabulNow.toISOString(),
  });
}
