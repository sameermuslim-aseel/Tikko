"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * آیتم‌های تسک لیستی، قبل از ساخته شدنِ خود تسک.
 * هنوز در دیتابیس نیستند — فقط در حافظه‌اند تا با ذخیرهٔ تسک ساخته شوند.
 * بعد از ساخت، آیتم‌ها از خود تسک هم قابل اضافه کردن‌اند.
 */
export function PendingItems({
  items,
  onChange,
}: {
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const title = draft.trim();
    if (!title) return;

    onChange([...items, title]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="pending-item">آیتم‌ها</Label>

      <div className="flex gap-2">
        <Input
          id="pending-item"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Enter نباید کل فرم را ثبت کند؛ فقط آیتم را اضافه می‌کند
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="مثلاً: صبح"
          className="h-11"
        />
        <Button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="h-11 shrink-0"
          aria-label="افزودن آیتم"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                aria-label={`حذف ${item}`}
                className="text-muted-foreground"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        هر آیتم هر روز جداگانه تیک می‌خورد. بعداً هم می‌توانی آیتم اضافه کنی.
      </p>
    </div>
  );
}
