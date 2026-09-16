"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteTask,
  saveCompletionNote,
  tasksQueryKey,
} from "@/lib/queries/tasks";
import type { Role, TaskForDate } from "@/lib/types";

const PRIORITY_LABEL: Record<string, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

/**
 * ویرایشگر یادداشت. با key به ازای هر (تسک، روز) دوباره mount می‌شود،
 * برای همین مقدار اولیه را از props می‌گیرد و به useEffect نیازی نیست.
 */
function NoteEditor({
  taskId,
  dateKey,
  initialNote,
}: {
  taskId: string;
  dateKey: string;
  initialNote: string;
}) {
  const [note, setNote] = useState(initialNote);
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () => saveCompletionNote({ taskId, dateKey, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(dateKey) });
      queryClient.invalidateQueries({ queryKey: ["week"] });
    },
  });

  const unchanged = note.trim() === initialNote.trim();

  return (
    <>
      <Textarea
        id="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="مثلاً: نصفش را فردا تمام می‌کنم"
        rows={3}
      />

      <Button
        type="button"
        variant="secondary"
        disabled={save.isPending || unchanged}
        onClick={() => save.mutate()}
        className="h-11"
      >
        {save.isPending ? "..." : unchanged && save.isSuccess ? "ذخیره شد" : "ذخیرهٔ یادداشت"}
      </Button>

      {save.error && (
        <p role="alert" className="text-sm text-destructive">
          {save.error.message}
        </p>
      )}
    </>
  );
}

export function TaskDetailDrawer({
  task,
  dateKey,
  role,
  onClose,
}: {
  task: TaskForDate | null;
  dateKey: string;
  role: Role;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(dateKey) });
      onClose();
    },
  });

  // همان قاعدهٔ RLS: ادمین همه را حذف می‌کند، عضو فقط تسک‌های self خودش.
  // UI نباید سخت‌گیرتر از دیتابیس باشد.
  const canDelete = role === "admin" || task?.source === "self";

  return (
    <Drawer open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <div className="mx-auto min-h-0 w-full max-w-md flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader>
            <DrawerTitle>{task?.title}</DrawerTitle>
            <DrawerDescription>
              {task?.source === "admin"
                ? role === "admin"
                  ? "تعیین‌شده توسط ادمین"
                  : "تعیین‌شده توسط ادمین — قابل حذف نیست"
                : "تسک شخصی"}
            </DrawerDescription>
          </DrawerHeader>

          <dl className="flex flex-col gap-3 px-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">اولویت</dt>
              <dd>{task ? PRIORITY_LABEL[task.priority] : ""}</dd>
            </div>

            {task?.category_name && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">کتگوری</dt>
                <dd className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: task.category_color ?? "#999" }}
                  />
                  {task.category_name}
                </dd>
              </div>
            )}

            {task?.time_of_day && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ساعت</dt>
                <dd dir="ltr">{task.time_of_day.slice(0, 5)}</dd>
              </div>
            )}

            {task?.description && (
              <p className="text-muted-foreground">{task.description}</p>
            )}
          </dl>

          {/* یادداشت فقط وقتی معنا دارد که تسک انجام شده باشد */}
          <div className="mt-4 flex flex-col gap-2 px-4">
            <label htmlFor="note" className="text-sm font-medium">
              یادداشت
            </label>

            {task?.is_completed ? (
              <NoteEditor
                key={`${task.id}-${dateKey}`}
                taskId={task.id}
                dateKey={dateKey}
                initialNote={task.note ?? ""}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                بعد از تیک زدن تسک می‌توانی یادداشت بگذاری.
              </p>
            )}
          </div>

          {remove.error && (
            <p role="alert" className="px-4 pt-3 text-sm text-destructive">
              {remove.error.message}
            </p>
          )}

          <DrawerFooter>
            {canDelete && task && (
              <Button
                type="button"
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(task.id)}
                className="h-12 text-base"
              >
                {remove.isPending ? "..." : "حذف تسک"}
              </Button>
            )}
            <Button variant="ghost" type="button" onClick={onClose}>
              بستن
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
