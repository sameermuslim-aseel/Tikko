"use client";

import { useState } from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeekdayPicker } from "./weekday-picker";
import { createSelfTask } from "@/lib/queries/tasks";
import { parseQuickTask } from "@/lib/quick-parse";
import { addDays } from "date-fns";
import { toDateKey } from "@/lib/date";
import { categoriesQueryKey, fetchCategories } from "@/lib/queries/categories";
import type { AssignmentType, Priority, ScheduleType } from "@/lib/types";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "کم" },
  { value: "medium", label: "متوسط" },
  { value: "high", label: "زیاد" },
];

export function AddTaskDrawer({
  householdId,
  userId,
  dateKey,
  openOnMount = false,
}: {
  householdId: string;
  userId: string;
  dateKey: string;
  /** میان‌بر آیکون اپ: /?new=1 */
  openOnMount?: boolean;
}) {
  const [open, setOpen] = useState(openOnMount);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>("medium");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("once");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("one");
  // پیش‌فرض: فقط یک فیلد متن. زیر ۵ ثانیه (PLAN-PHASE2 بخش ۲.۵)
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => {
      if (showDetails) {
        return createSelfTask({
          householdId,
          userId,
          title,
          categoryId,
          priority,
          scheduleType,
          weekdays,
          dateKey,
          assignmentType,
        });
      }

      // حالت سریع: بقیه پیش‌فرض، فقط دو قاعدهٔ «!» و «فردا»
      const quick = parseQuickTask(title);
      const targetDate =
        quick.dayOffset === 1
          ? toDateKey(addDays(new Date(`${dateKey}T00:00:00`), 1))
          : dateKey;

      return createSelfTask({
        householdId,
        userId,
        title: quick.title,
        categoryId: null,
        priority: quick.priority,
        scheduleType: "once",
        weekdays: [],
        dateKey: targetDate,
        assignmentType: "one",
      });
    },
    onSuccess: () => {
      // ممکن است تسک برای فردا ساخته شده باشد، پس همهٔ روزها تازه شوند
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["week"] });
      reset();
      setOpen(false);
    },
    onError: (err) => setError(err.message),
  });

  function reset() {
    setTitle("");
    setCategoryId(null);
    setPriority("medium");
    setScheduleType("once");
    setWeekdays([]);
    setAssignmentType("one");
    setShowDetails(false);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!showDetails && parseQuickTask(title).title === "") {
      setError("عنوان تسک را بنویس.");
      return;
    }

    if (showDetails && scheduleType === "weekly" && weekdays.length === 0) {
      setError("حداقل یک روز هفته را انتخاب کنید.");
      return;
    }

    create.mutate();
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      {/*
        لایهٔ fixed تمام‌عرض، ولی ستون داخلی هم‌عرض اپ است تا دکمه روی
        دسکتاپ داخل قاب موبایل بماند نه گوشهٔ پنجره.
      */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)]">
        <div className="relative mx-auto w-full max-w-md">
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="تسک جدید"
              // bottom-20 تا بالای نوار ناوبری پایین بماند و پشت آن نرود
              className="pointer-events-auto absolute bottom-20 left-6 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg"
            >
              <Plus className="size-6" />
            </button>
          </DrawerTrigger>
        </div>
      </div>

      <DrawerContent>
        {/*
          min-h-0 + overflow-y-auto لازم است وگرنه وقتی فرم از ارتفاع drawer
          بلندتر شود (انتخاب «هفتگی» یا باز شدن کیبورد موبایل)، دکمهٔ ذخیره
          بریده می‌شود و راهی برای رسیدن به آن نیست.
        */}
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
          <DrawerHeader className="shrink-0">
            <DrawerTitle>تسک شخصی جدید</DrawerTitle>
          </DrawerHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            {/* فقط فیلدها اسکرول می‌شوند؛ دکمهٔ ذخیره همیشه دیده می‌شود */}
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">عنوان</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: نان بگیر فردا"
                required
                autoFocus
              />

              {/*
                مثال واقعی بهتر از توضیح قاعده است — کاربر باید ببیند
                چه می‌نویسد و چه اتفاقی می‌افتد.
              */}
              {!showDetails && (
                <div className="flex flex-col gap-1 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <span>می‌توانی سریع‌تر بنویسی:</span>
                  <span>
                    <span className="text-foreground">نان بگیر فردا</span> ←
                    تسک برای فردا ثبت می‌شود
                  </span>
                  <span>
                    <span className="text-foreground">نان بگیر!</span> ← با
                    اولویت زیاد ثبت می‌شود
                  </span>
                </div>
              )}
            </div>

            {/*
              این دکمه تنها راه رسیدن به کتگوری، تکرار و تسک مشترک است؛
              اگر کم‌رنگ باشد کاربر فکر می‌کند اپ این امکانات را ندارد.
            */}
            {!showDetails && (
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="flex h-12 w-full items-center justify-between rounded-lg border border-input px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4" />
                  جزئیات بیشتر
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  اولویت، کتگوری، تکرار
                </span>
              </button>
            )}

            {showDetails && (
            <>
            <div className="flex flex-col gap-2">
              <Label>اولویت</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    aria-pressed={priority === p.value}
                    className={`h-11 rounded-lg border text-sm transition-colors ${
                      priority === p.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-input text-muted-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {categories && categories.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>کتگوری</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setCategoryId(categoryId === c.id ? null : c.id)
                      }
                      aria-pressed={categoryId === c.id}
                      className={`flex h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                        categoryId === c.id
                          ? "border-foreground"
                          : "border-input text-muted-foreground"
                      }`}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: c.color ?? "#999" }}
                      />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>برای کی</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                {(
                  [
                    ["one", "خودم"],
                    ["shared", "مشترک"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAssignmentType(value)}
                    className={`h-10 rounded-md text-sm transition-colors ${
                      assignmentType === value
                        ? "bg-background font-medium shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {assignmentType === "shared" && (
                <p className="text-xs text-muted-foreground">
                  در لیست همه دیده می‌شود؛ هر کی زودتر انجام داد، برای همه
                  انجام‌شده حساب می‌شود.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>تکرار</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                {(
                  [
                    ["once", "فقط این روز"],
                    ["weekly", "هفتگی"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScheduleType(value)}
                    className={`h-10 rounded-md text-sm transition-colors ${
                      scheduleType === value
                        ? "bg-background font-medium shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {scheduleType === "weekly" && (
              <WeekdayPicker value={weekdays} onChange={setWeekdays} />
            )}
            </>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            </div>

            <DrawerFooter className="shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
              <Button
                type="submit"
                disabled={create.isPending}
                className="h-12 text-base"
              >
                {create.isPending ? "..." : "ذخیره"}
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost" type="button">
                  لغو
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
