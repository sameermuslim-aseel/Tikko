"use client";

import { ThemeProvider as NextThemes } from "next-themes";

/**
 * تم روشن/تاریک.
 *
 * next-themes قبل از رندر شدن صفحه کلاس را روی <html> می‌گذارد، پس
 * هنگام باز شدن اپ یک لحظه سفید نمی‌زند — چیزی که با useEffect
 * ساده قابل حل نبود.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      // بدون این، موقع عوض کردن تم همهٔ transition ها با هم اجرا می‌شوند
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
