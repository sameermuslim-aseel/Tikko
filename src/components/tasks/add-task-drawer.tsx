"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { createSelfTask, tasksQueryKey } from "@/lib/queries/tasks";
import { categoriesQueryKey, fetchCategories } from "@/lib/queries/categories";
import type { Priority, ScheduleType } from "@/lib/types";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "کم" },
  { value: "medium", label: "متوسط" },
  { value: "high", label: "زیاد" },
];

export function AddTaskDrawer({
  householdId,
  userId,
  dateKey,
}: {
  householdId: string;
  userId: string;
  dateKey: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>("medium");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("once");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () =>
      createSelfTask({
        householdId,
        userId,
        title,
        categoryId,
        priority,
        scheduleType,
        weekdays,
        dateKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(dateKey) });
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
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (scheduleType === "weekly" && weekdays.length === 0) {
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
                placeholder="مثلاً: آب دادن گل‌ها"
                required
                autoFocus
              />
            </div>

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
                  انصراف
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
