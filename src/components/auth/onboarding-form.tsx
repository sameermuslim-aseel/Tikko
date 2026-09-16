"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "create" | "join";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [displayName, setDisplayName] = useState(defaultName);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createClient();

      // نام نمایشی: تنها ستونی که کاربر اجازهٔ update دارد
      const { error: nameError } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");

      if (nameError) {
        setError(nameError.message);
        return;
      }

      const { error: rpcError } =
        mode === "create"
          ? await supabase.rpc("create_household", { p_name: householdName })
          : await supabase.rpc("join_household", { p_invite_code: inviteCode });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای غیرمنتظره");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">نام نمایشی</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="مثلاً: سمیر"
          required
        />
      </div>

      {/* انتخاب: ساخت خانواده یا پیوستن */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        {(
          [
            ["create", "خانوادهٔ جدید"],
            ["join", "پیوستن با کد"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={`h-10 rounded-md text-sm transition-colors ${
              mode === value
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "create" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="householdName">اسم خانواده</Label>
          <Input
            id="householdName"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="مثلاً: خانهٔ ما"
            required
          />
          <p className="text-xs text-muted-foreground">
            شما ادمین می‌شوید و می‌توانید برای بقیه تسک تعیین کنید.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="inviteCode">کد دعوت</Label>
          <Input
            id="inviteCode"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            dir="ltr"
            maxLength={6}
            required
          />
          <p className="text-xs text-muted-foreground">
            کد ۶ رقمی را از ادمین خانواده بگیرید.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-12 w-full text-base">
        {pending ? "..." : mode === "create" ? "ساخت خانواده" : "پیوستن"}
      </Button>
    </form>
  );
}
