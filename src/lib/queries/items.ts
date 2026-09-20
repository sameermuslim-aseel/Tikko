import { createClient } from "@/lib/supabase/client";

export type TaskItem = {
  id: string;
  title: string;
  quantity: string | null;
  sort_order: number;
  is_done: boolean;
  done_by_name: string | null;
};

/** آیتم‌های یک تسک لیستی با وضعیت تیک همان روز */
export async function fetchTaskItems(
  taskId: string,
  dateKey: string,
): Promise<TaskItem[]> {
  const { data, error } = await createClient().rpc("get_task_items", {
    p_task_id: taskId,
    p_date: dateKey,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as TaskItem[];
}

export async function addTaskItem(params: {
  taskId: string;
  title: string;
  sortOrder: number;
}): Promise<void> {
  const { error } = await createClient().from("task_items").insert({
    task_id: params.taskId,
    title: params.title.trim(),
    sort_order: params.sortOrder,
  });

  if (error) throw new Error(error.message);
}

/** آیتم‌های یک تسک تازه‌ساخته، همه با هم */
export async function addTaskItems(
  taskId: string,
  titles: string[],
): Promise<void> {
  const rows = titles
    .map((title, index) => ({
      task_id: taskId,
      title: title.trim(),
      sort_order: index,
    }))
    .filter((row) => row.title !== "");

  if (rows.length === 0) return;

  const { error } = await createClient().from("task_items").insert(rows);
  if (error) throw new Error(error.message);
}

export async function deleteTaskItem(itemId: string): Promise<void> {
  const { error } = await createClient()
    .from("task_items")
    .delete()
    .eq("id", itemId);

  if (error) throw new Error(error.message);
}

/**
 * تیک آیتم برای یک روز مشخص.
 * تریگر دیتابیس خودش تصمیم می‌گیرد که آیا کل تسک آن روز کامل شده یا نه.
 */
export async function setItemDone(params: {
  itemId: string;
  dateKey: string;
  done: boolean;
  userId: string;
}): Promise<void> {
  const supabase = createClient();

  if (!params.done) {
    const { error } = await supabase
      .from("task_item_completions")
      .delete()
      .eq("item_id", params.itemId)
      .eq("date", params.dateKey);

    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("task_item_completions").insert({
    item_id: params.itemId,
    date: params.dateKey,
    completed_by: params.userId,
  });

  if (error) throw new Error(error.message);
}

export const itemsQueryKey = (taskId: string, dateKey: string) =>
  ["items", taskId, dateKey] as const;
