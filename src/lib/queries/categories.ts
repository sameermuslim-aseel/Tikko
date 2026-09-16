import { createClient } from "@/lib/supabase/client";

export type Category = {
  id: string;
  name: string;
  color: string | null;
};

/** کتگوری‌های خانواده — RLS خودش به household جاری محدود می‌کند */
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await createClient()
    .from("categories")
    .select("id, name, color")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export const categoriesQueryKey = ["categories"] as const;
