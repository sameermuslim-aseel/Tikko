"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Flame, LayoutDashboard } from "lucide-react";
import type { Role } from "@/lib/types";

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "امروز", Icon: CalendarCheck },
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
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
