import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

// Vazirmatn فونت اصلی است و مستقیماً به --font-sans وصل می‌شود
const vazirmatn = Vazirmatn({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "تیکو",
  description: "تسک‌های روزانهٔ خانواده، در یک نگاه",
  applicationName: "Tikko",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // iOS از manifest برای حالت standalone استفاده نمی‌کند و متاتگ خودش را می‌خواهد
  appleWebApp: {
    capable: true,
    title: "تیکو",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#9A6735",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa-AF"
      dir="rtl"
      className={cn("h-full antialiased", vazirmatn.variable, "font-sans")}
    >
      {/*
        افزونه‌های مرورگر (مثل ColorZilla با cz-shortcut-listen) قبل از hydrate
        شدن React روی <body> اتریبیوت اضافه می‌کنند و باعث hydration mismatch
        می‌شوند. این prop فقط همین یک المان را نادیده می‌گیرد، نه فرزندانش.
      */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
