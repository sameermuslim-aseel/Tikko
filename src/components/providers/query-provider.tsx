"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState تا هر رندر یک QueryClient تازه نسازد
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ریل‌تایم خودش کش را باطل می‌کند، پس لازم نیست زود کهنه شود
            staleTime: 5 * 60_000,

            // دادهٔ تب‌هایی که بازدید شده نیم‌ساعت در حافظه می‌ماند تا
            // برگشتن به آن‌ها فوری باشد، نه دوباره اسکلتون
            gcTime: 30 * 60_000,

            refetchOnWindowFocus: false,

            // وقتی کلید کوئری عوض می‌شود (مثلاً روز دیگر در نوار تاریخ)
            // دادهٔ قبلی سر جایش می‌ماند و روی آن تازه می‌شود
            placeholderData: <T,>(previous: T) => previous,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
