"use client";

import { useEffect } from "react";

/**
 * ثبت service worker فقط در production.
 * در dev ثبت نمی‌شود چون کش کردن، hot reload را گیج می‌کند.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // شکست ثبت نباید اپ را خراب کند
    });
  }, []);

  return null;
}
