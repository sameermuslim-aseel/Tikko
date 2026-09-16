"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  hasActiveSubscription,
  iosNeedsHomeScreen,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import {
  saveNotificationSettings,
  toTimeInput,
  type NotificationSettings,
} from "@/lib/queries/settings";

/** این مقادیر تغییر نمی‌کنند، پس نیازی به subscribe واقعی نیست */
const subscribeNever = () => () => {};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-2 text-right"
    >
      <span className="text-sm">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${
            checked ? "right-0.5" : "right-[1.375rem]"
          }`}
        />
      </span>
    </button>
  );
}

export function NotificationSettingsForm({
  userId,
  initial,
}: {
  userId: string;
  initial: NotificationSettings;
}) {
  const [settings, setSettings] = useState<NotificationSettings>({
    ...initial,
    notify_morning_at: toTimeInput(initial.notify_morning_at),
    notify_evening_at: toTimeInput(initial.notify_evening_at),
  });

  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    hasActiveSubscription().then(setSubscribed);
  }, []);

  /*
    این دو مقدار فقط در مرورگر معنا دارند. اگر مستقیم موقع render خوانده
    شوند، سرور یک چیز و کلاینت چیز دیگری می‌سازد و hydration می‌شکند.
    useSyncExternalStore دقیقاً برای همین است: سرور snapshot خودش را
    می‌گیرد و کلاینت بعد از hydrate مقدار واقعی را.
  */
  const supported = useSyncExternalStore(
    subscribeNever,
    pushSupported,
    () => false,
  );

  const iosNeedsInstall = useSyncExternalStore(
    subscribeNever,
    iosNeedsHomeScreen,
    () => false,
  );

  async function handleSubscribe() {
    setBusy(true);
    setMessage(null);

    const error = await subscribeToPush(userId);
    setMessage(error);
    setSubscribed(error === null);
    setBusy(false);
  }

  async function handleUnsubscribe() {
    setBusy(true);
    setMessage(null);

    const error = await unsubscribeFromPush();
    setMessage(error);
    setSubscribed(false);
    setBusy(false);
  }

  async function handleSave() {
    setBusy(true);
    setMessage(null);
    setSaved(false);

    try {
      await saveNotificationSettings(userId, settings);
      setSaved(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-4">
      {/* وضعیت اشتراک این دستگاه */}
      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex items-center gap-2">
          {subscribed ? (
            <BellRing className="size-5 text-emerald-600" />
          ) : (
            <BellOff className="size-5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {subscribed ? "این دستگاه فعال است" : "این دستگاه فعال نیست"}
          </span>
        </div>

        {!supported && (
          <p className="text-xs text-muted-foreground">
            مرورگر شما از نوتیفیکیشن پشتیبانی نمی‌کند.
          </p>
        )}

        {iosNeedsInstall && (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            در آیفون اول باید اپ را از Safari با «Add to Home Screen» نصب کنید،
            بعد از داخل خود اپ نوتیفیکیشن را فعال کنید.
          </p>
        )}

        {supported && !iosNeedsInstall && (
          <Button
            type="button"
            variant={subscribed ? "outline" : "default"}
            disabled={busy}
            onClick={subscribed ? handleUnsubscribe : handleSubscribe}
            className="h-11"
          >
            {busy
              ? "..."
              : subscribed
                ? "غیرفعال کردن روی این دستگاه"
                : "فعال کردن نوتیفیکیشن"}
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          نوتیفیکیشن برای هر دستگاه جدا فعال می‌شود.
        </p>
      </section>

      {/* نوع یادآوری‌ها */}
      <section className="flex flex-col gap-2 rounded-xl border p-4">
        <h2 className="mb-1 text-sm font-medium">یادآوری‌ها</h2>

        <Toggle
          label="خلاصهٔ صبح"
          checked={settings.notify_morning}
          onChange={(v) => setSettings({ ...settings, notify_morning: v })}
        />
        {settings.notify_morning && (
          <div className="flex items-center justify-between gap-3 pb-2">
            <Label htmlFor="morning-at" className="text-xs text-muted-foreground">
              ساعت
            </Label>
            <Input
              id="morning-at"
              type="time"
              dir="ltr"
              value={settings.notify_morning_at}
              onChange={(e) =>
                setSettings({ ...settings, notify_morning_at: e.target.value })
              }
              className="h-10 w-32"
            />
          </div>
        )}

        <Toggle
          label="یادآوری شب اگر ناتمام ماند"
          checked={settings.notify_evening}
          onChange={(v) => setSettings({ ...settings, notify_evening: v })}
        />
        {settings.notify_evening && (
          <div className="flex items-center justify-between gap-3 pb-2">
            <Label htmlFor="evening-at" className="text-xs text-muted-foreground">
              ساعت
            </Label>
            <Input
              id="evening-at"
              type="time"
              dir="ltr"
              value={settings.notify_evening_at}
              onChange={(e) =>
                setSettings({ ...settings, notify_evening_at: e.target.value })
              }
              className="h-10 w-32"
            />
          </div>
        )}

        <Toggle
          label="وقتی ادمین تسک جدید تعیین کرد"
          checked={settings.notify_assigned}
          onChange={(v) => setSettings({ ...settings, notify_assigned: v })}
        />

        <Toggle
          label="سر ساعت هر تسک"
          checked={settings.notify_task_time}
          onChange={(v) => setSettings({ ...settings, notify_task_time: v })}
        />
        <p className="text-xs text-muted-foreground">
          فقط برای تسک‌هایی که ساعت مشخص دارند.
        </p>
      </section>

      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}

      <Button type="button" onClick={handleSave} disabled={busy} className="h-12">
        {busy ? "..." : saved ? "ذخیره شد" : "ذخیرهٔ تنظیمات"}
      </Button>
    </div>
  );
}
