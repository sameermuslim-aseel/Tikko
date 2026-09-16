"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  categoriesQueryKey,
  fetchCategories,
} from "@/lib/queries/categories";
import { createCategory, deleteCategory } from "@/lib/queries/admin";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export function CategoryManager({ householdId }: { householdId: string }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: fetchCategories,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: categoriesQueryKey });

  const add = useMutation({
    mutationFn: () => createCategory({ householdId, name, color }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: invalidate,
  });

  return (
    <section className="flex flex-col gap-3 px-4">
      <h2 className="text-sm font-medium text-muted-foreground">کتگوری‌ها</h2>

      <div className="flex flex-wrap gap-2">
        {categories?.map((c) => (
          <span
            key={c.id}
            className="flex h-10 items-center gap-2 rounded-full border px-3 text-sm"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: c.color ?? "#999" }}
            />
            {c.name}
            <button
              type="button"
              onClick={() => remove.mutate(c.id)}
              aria-label={`حذف ${c.name}`}
              className="text-muted-foreground"
            >
              <Trash2 className="size-3.5" />
            </button>
          </span>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) add.mutate();
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="کتگوری جدید"
            className="h-11"
          />
          <Button type="submit" disabled={add.isPending} className="h-11 shrink-0">
            افزودن
          </Button>
        </div>

        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`رنگ ${c}`}
              aria-pressed={color === c}
              className={`size-8 rounded-full border-2 transition-transform ${
                color === c ? "scale-110 border-foreground" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </form>

      {/* حذف کتگوری تسک‌ها را حذف نمی‌کند — category_id آن‌ها null می‌شود */}
      {(add.error || remove.error) && (
        <p role="alert" className="text-sm text-destructive">
          {(add.error ?? remove.error)?.message}
        </p>
      )}
    </section>
  );
}
