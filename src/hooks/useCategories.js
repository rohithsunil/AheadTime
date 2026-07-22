import { db } from '@/api/db';

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { DEFAULT_CATEGORIES } from "@/lib/categoryUtils";

// Fetches the current user's categories. Seeds defaults on first load.
export function useCategories() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["categories", "all"],
    queryFn: async () => {
      const cats = await db.entities.Category.list("sort_order", 100);
      if (cats.length === 0) {
        await db.entities.Category.bulkCreate(DEFAULT_CATEGORIES);
        return db.entities.Category.list("sort_order", 100);
      }
      return cats;
    },
    staleTime: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  return { ...query, invalidate };
}