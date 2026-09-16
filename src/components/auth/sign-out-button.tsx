"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      aria-label="خروج"
      title="خروج"
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
    >
      <LogOut className="size-5" />
    </button>
  );
}
