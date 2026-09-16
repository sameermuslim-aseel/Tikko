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
