"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addTaskItem,
  deleteTaskItem,
  fetchTaskItems,
  itemsQueryKey,
  setItemDone,
  type TaskItem,
} from "@/lib/queries/items";
import { formatNumber } from "@/lib/date";

/**
 * آیتم‌های یک تسک لیستی.
 * آیتم‌ها الگو هستند؛ تیکشان برای همان روز ثبت می‌شود، پس تسک «نماز»
 * هر روز از نو تیک می‌خورد.
 */
export function TaskItemsList({
  taskId,
  dateKey,
  userId,
  readOnly = false,
}: {
  taskId: string;
  dateKey: string;
  userId: string;
  readOnly?: boolean;
}) {
  const [newTitle, setNewTitle] = useState("");
  const queryClient = useQueryClient();
  const queryKey = itemsQueryKey(taskId, dateKey);

  const { data: items, isPending } = useQuery({
    queryKey,
    queryFn: () => fetchTaskItems(taskId, dateKey),
  });

  // تیک آیتم روی وضعیت خود تسک هم اثر دارد (تریگر دیتابیس)
  function refreshAll() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["week"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["overdue"] });
  }

  const toggle = useMutation({
    mutationFn: (item: TaskItem) =>
      setItemDone({
        itemId: item.id,
        dateKey,
        done: !item.is_done,
        userId,
      }),

    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TaskItem[]>(queryKey);

      queryClient.setQueryData<TaskItem[]>(queryKey, (old) =>
        (old ?? []).map((i) =>
          i.id === item.id ? { ...i, is_done: !i.is_done } : i,
        ),
      );

      return { previous };
    },

    onError: (_error, _item, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },

    onSettled: refreshAll,
  });

  const add = useMutation({
    mutationFn: () =>
      addTaskItem({
        taskId,
        title: newTitle,
        sortOrder: items?.length ?? 0,
      }),
    onSuccess: () => {
      setNewTitle("");
      refreshAll();
    },
  });

  const remove = useMutation({
    mutationFn: (itemId: string) => deleteTaskItem(itemId),
    onSuccess: refreshAll,
  });

  const done = items?.filter((i) => i.is_done).length ?? 0;
  const total = items?.length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          آیتم‌ها ({formatNumber(done)}/{formatNumber(total)})
        </span>

      </div>

      {isPending && <div className="h-10 animate-pulse rounded-lg bg-muted" />}

      {items?.length === 0 && (
        <p className="text-xs text-muted-foreground">
          هنوز آیتمی نیست. پایین اضافه کن.
        </p>
      )}

      <ul className="flex flex-col gap-1">
        {items?.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggle.mutate(item)}
              disabled={readOnly}
              aria-pressed={item.is_done}
              className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-right transition-opacity ${
                item.is_done ? "opacity-60" : ""
              }`}
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  item.is_done
                    ? "border-success bg-success text-success-foreground"
                    : "border-muted-foreground/40"
                }`}
              >
                {item.is_done && <Check className="size-3" strokeWidth={3} />}
              </span>

              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  item.is_done ? "line-through" : ""
                }`}
              >
                {item.title}
              </span>

              {item.is_done && item.done_by_name && (
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {item.done_by_name}
                </span>
              )}
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={() => remove.mutate(item.id)}
                aria-label={`حذف ${item.title}`}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {!readOnly && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim()) add.mutate();
          }}
          className="flex gap-2"
        >
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="آیتم جدید"
            className="h-11"
          />
          <Button
            type="submit"
            disabled={add.isPending || !newTitle.trim()}
            className="h-11 shrink-0"
            aria-label="افزودن آیتم"
          >
            <Plus className="size-4" />
          </Button>
        </form>
      )}

      {(toggle.error || add.error || remove.error) && (
        <p role="alert" className="text-sm text-destructive">
          {(toggle.error ?? add.error ?? remove.error)?.message}
        </p>
      )}
    </div>
  );
}
