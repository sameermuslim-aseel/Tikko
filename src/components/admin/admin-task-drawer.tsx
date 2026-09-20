"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
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
import { WeekdayPicker } from "@/components/tasks/weekday-picker";
import { adminKeys, createAdminTask, fetchMembers } from "@/lib/queries/admin";
import { categoriesQueryKey, fetchCategories } from "@/lib/queries/categories";
import { toDateKey } from "@/lib/date";
import type {
  AssignmentType,
  Priority,
  ScheduleType,
  TaskType,
} from "@/lib/types";

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "کم" },
  { value: "medium", label: "متوسط" },
  { value: "high", label: "زیاد" },
];

export function AdminTaskDrawer({
  householdId,
  userId,
}: {
  householdId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>("medium");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("weekly");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("one");
  const [taskType, setTaskType] = useState<TaskType>("simple");
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: members } = useQuery({
    queryKey: adminKeys.members,
    queryFn: fetchMembers,
    enabled: open,
  });

  const { data: categories } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () =>
      createAdminTask({
        householdId,
        createdBy: userId,
        assignedTo,
        title,
        categoryId,
        priority,
        scheduleType,
        weekdays,
        dateKey: toDateKey(new Date()),
        assignmentType,
        taskType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.tasks });
      queryClient.invalidateQueries({ queryKey: ["admin", "progress"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      reset();
      setOpen(false);
    },
    onError: (err) => setError(err.message),
  });

  // آخرین @ که هنوز تمام نشده — مثل «بردن زباله @حس»
  const mentionMatch = title.match(/@([^\s@]*)$/);
  const mention = mentionMatch ? mentionMatch[1] : null;

  const mentionOptions =
    mention === null
      ? []
      : [
          ...(members ?? []).map((m) => ({
            id: m.id,
            label: m.display_name ?? "بی‌نام",
          })),
          { id: "shared", label: "مشترک — هر کی زودتر" },
        ].filter((option) =>
          mention === "" ? true : option.label.includes(mention),
        );

  function applyMention(option: { id: string; label: string }) {
    if (option.id === "shared") {
      setAssignmentType("shared");
      setAssignedTo(null);
    } else {
      setAssignmentType("one");
      setAssignedTo(option.id);
    }

    // خود @ و متنی که تایپ شده از عنوان پاک می‌شود
    setTitle(title.replace(/@[^\s@]*$/, "").trimEnd());
  }

  function reset() {
    setTitle("");
    setAssignedTo(null);
    setCategoryId(null);
    setPriority("medium");
    setScheduleType("weekly");
    setWeekdays([]);
    setAssignmentType("one");
    setTaskType("simple");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (assignmentType === "one" && !assignedTo) {
      setError("یک نفر را انتخاب کنید یا تسک را مشترک بگذارید.");
      return;
    }
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
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)]">
        <div className="relative mx-auto w-full max-w-md">
          <DrawerTrigger asChild>
            <button
              type="button"
              aria-label="تسک جدید"
              className="pointer-events-auto absolute bottom-20 left-6 flex size-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg"
            >
              <Plus className="size-6" />
            </button>
          </DrawerTrigger>
        </div>
      </div>

      <DrawerContent>
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
          <DrawerHeader className="shrink-0">
            <DrawerTitle>تعیین تسک</DrawerTitle>
          </DrawerHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            {/* فقط فیلدها اسکرول می‌شوند؛ دکمهٔ ثبت همیشه دیده می‌شود */}
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-title">عنوان</Label>
              <Input
                id="admin-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: بردن زباله @حسنا"
                required
                autoFocus
                autoComplete="off"
              />

              {/*
                نوشتن @ فهرست اعضا را باز می‌کند تا بدون رفتن به چیپ‌های
                پایین، همان‌جا مسئول تسک انتخاب شود.
              */}
              {mention !== null && (
                <ul className="flex flex-col overflow-hidden rounded-lg border">
                  {mentionOptions.length === 0 && (
                    <li className="px-4 py-2 text-xs text-muted-foreground">
                      کسی با این نام نیست
                    </li>
                  )}

                  {mentionOptions.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => applyMention(option)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm hover:bg-muted"
                      >
                        {option.id === "shared" ? (
                          <Users className="size-4 text-muted-foreground" />
                        ) : (
                          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">
                            {[...(option.label ?? "")][0]}
                          </span>
                        )}
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* mention ممکن است رشتهٔ خالی باشد (تازه @ زده) — آن هم یعنی باز است */}
              {mention === null && (
                <p className="text-xs text-muted-foreground">
                  با نوشتن <span className="text-foreground">@</span> می‌توانی
                  مسئول تسک را انتخاب کنی.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>برای چه کسی</Label>
              <div className="flex flex-wrap gap-2">
                {members?.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setAssignedTo(m.id);
                      setAssignmentType("one");
                    }}
                    aria-pressed={assignmentType === "one" && assignedTo === m.id}
                    className={`h-11 rounded-full border px-4 text-sm transition-colors ${
                      assignmentType === "one" && assignedTo === m.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-input text-muted-foreground"
                    }`}
                  >
                    {m.display_name}
                  </button>
                ))}

                {/* کار خانه همیشه مال یک نفر مشخص نیست */}
                <button
                  type="button"
                  onClick={() => {
                    setAssignmentType("shared");
                    setAssignedTo(null);
                  }}
                  aria-pressed={assignmentType === "shared"}
                  className={`h-11 rounded-full border px-4 text-sm transition-colors ${
                    assignmentType === "shared"
                      ? "border-foreground bg-foreground text-background"
                      : "border-input text-muted-foreground"
                  }`}
                >
                  مشترک
                </button>
              </div>

              {assignmentType === "shared" && (
                <p className="text-xs text-muted-foreground">
                  در لیست همه دیده می‌شود؛ هر کی زودتر انجام داد، برای همه
                  انجام‌شده حساب می‌شود.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>نوع تسک</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                {(
                  [
                    ["simple", "ساده"],
                    ["list", "لیستی"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTaskType(value)}
                    className={`h-10 rounded-md text-sm transition-colors ${
                      taskType === value
                        ? "bg-background font-medium shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {taskType === "list" && (
                <p className="text-xs text-muted-foreground">
                  بعد از ساخت، از همین داشبورد آیتم‌هایش را اضافه کن.
                </p>
              )}
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
                    ["weekly", "هفتگی"],
                    ["once", "فقط امروز"],
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
                {create.isPending ? "..." : "تعیین تسک"}
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
