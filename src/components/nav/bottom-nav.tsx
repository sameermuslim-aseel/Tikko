"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarDays, Flame, LayoutDashboard } from "lucide-react";
import type { Role } from "@/lib/types";

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "امروز", Icon: CalendarCheck },
    { href: "/week", label: "هفته", Icon: CalendarDays },
    { href: "/stats", label: "آمار", Icon: Flame },
    ...(role === "admin"
      ? [{ href: "/admin", label: "داشبورد", Icon: LayoutDashboard }]
      : []),
  ];

  return (
    <nav className="sticky bottom-0 z-20 flex border-t bg-background">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
              active ? "font-medium text-primary" : "text-muted-foreground"
            }`}
          >
            {/*
              lucide آیکون «پُر» ندارد، همه outline هستند.
              برای حالت انتخاب‌شده داخل آیکون را با همان رنگ و شفافیت کم
              پر می‌کنیم تا توپر دیده شود ولی خطوطش هم پیدا بماند.
            */}
            <Icon
              className="size-5"
              fill={active ? "currentColor" : "none"}
              fillOpacity={active ? 0.2 : 0}
              strokeWidth={active ? 2.25 : 2}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
