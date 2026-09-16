// Service worker محافظه‌کارانه برای Tikko.
//
// فقط دارایی‌های ثابت Next (/_next/static/*) کش می‌شوند — این‌ها hash دارند
// و هرگز تغییر محتوا نمی‌دهند، پس cache-first امن است.
//
// عمداً کش نمی‌شوند:
//   - صفحات HTML  → وگرنه کاربر خروج‌کرده صفحهٔ کش‌شدهٔ کاربر قبلی را می‌بیند
//   - درخواست‌های Supabase → داده‌های زنده و توکن‌های auth
//   - هر چیزی غیر از GET

const STATIC_CACHE = "tikko-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// ---------------------------------------------------------------
// نوتیفیکیشن پوش
// ---------------------------------------------------------------
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "تیکو";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      dir: "rtl",
      lang: "fa-AF",
      tag: payload.tag || "tikko",
      data: { url: payload.url || "/" },
      renotify: Boolean(payload.tag),
    }),
  );
});

// کلیک روی نوتیفیکیشن: اگر اپ باز است همان را بیاور بالا، وگرنه باز کن
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // دامنه‌های دیگر (Supabase, fonts) دست‌نخورده می‌مانند
  if (url.origin !== self.location.origin) return;

  // فقط دارایی‌های hash‌دار
  if (!url.pathname.startsWith("/_next/static/")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })(),
  );
});
