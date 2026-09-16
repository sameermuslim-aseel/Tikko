import { createClient } from "@/lib/supabase/client";

/** کلید عمومی VAPID از base64url به ArrayBuffer — چیزی که PushManager می‌خواهد */
function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);

  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);

  return buffer;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** آیفونی که اپ را هنوز به هوم‌اسکرین اضافه نکرده — پوش کار نمی‌کند */
export function iosNeedsHomeScreen(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !isStandalone();
}

/** روی iOS فقط وقتی اپ به هوم‌اسکرین اضافه شده باشد پوش کار می‌کند */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari iOS
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * اجازه گرفتن و ثبت اشتراک پوش.
 * خروجی: پیام خطا به دری، یا null اگر موفق بود.
 */
export async function subscribeToPush(userId: string): Promise<string | null> {
  if (!pushSupported()) {
    return "مرورگر شما از نوتیفیکیشن پشتیبانی نمی‌کند.";
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return "کلید VAPID تنظیم نشده است.";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return "اجازهٔ نوتیفیکیشن داده نشد.";
  }

  const registration = await navigator.serviceWorker.ready;

  // اگر اشتراک قبلی هست همان استفاده شود
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapidKey),
    }));

  const json = subscription.toJSON();

  const { error } = await createClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? arrayBufferToBase64(subscription.getKey("p256dh")),
        auth: json.keys?.auth ?? arrayBufferToBase64(subscription.getKey("auth")),
        user_agent: navigator.userAgent.slice(0, 200),
      },
      { onConflict: "endpoint" },
    );

  if (error) return error.message;
  return null;
}

/** لغو اشتراک این دستگاه */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!pushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const { error } = await createClient()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  return error ? error.message : null;
}

export async function hasActiveSubscription(): Promise<boolean> {
  if (!pushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  return (await registration.pushManager.getSubscription()) !== null;
}
