"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup";

/** پیام‌های خطای Supabase انگلیسی‌اند؛ رایج‌ها را فارسی می‌کنیم. */
function persianError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "ایمیل یا رمز عبور اشتباه است.";
  if (m.includes("user already registered")) return "این ایمیل قبلاً ثبت شده است. وارد شوید.";
  if (m.includes("password should be at least")) return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  if (m.includes("unable to validate email")) return "ایمیل معتبر نیست.";
  if (m.includes("email not confirmed")) return "ایمیل تأیید نشده است.";
  // سرویس ایمیل داخلی Supabase فقط ۲ ایمیل در ساعت می‌فرستد.
  // اگر «Confirm email» در داشبورد روشن باشد، ثبت‌نام به همین خطا می‌خورد.
  if (m.includes("rate limit"))
    return "محدودیت ارسال ایمیل پر شده است. در داشبورد Supabase گزینهٔ Confirm email را خاموش کنید.";
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createClient();

      const { error: authError } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { data: { display_name: displayName } },
            });

      if (authError) {
        setError(persianError(authError.message));
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
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-bold">تیکو</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "وارد حساب خود شوید" : "حساب جدید بسازید"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">نام نمایشی</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثلاً: سمیر"
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              dir="ltr"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              dir="ltr"
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="h-12 w-full text-base">
            {pending ? "..." : mode === "signin" ? "ورود" : "ثبت‌نام"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="mt-6 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "حساب ندارید؟ ثبت‌نام کنید" : "حساب دارید؟ وارد شوید"}
        </button>
      </div>
    </main>
  );
}
