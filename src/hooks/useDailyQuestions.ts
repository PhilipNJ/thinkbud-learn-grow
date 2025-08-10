import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { computeDailyMix, sampleArray, shuffle, getCache, setCache } from "@/lib/dailyMix";

export type Difficulty = "easy" | "moderate" | "difficult";
export type QuestionRow = Tables<"questions">;

export interface DailyBundle {
  date: string;
  questions: QuestionRow[];
  counts: Record<Difficulty, number>;
}

const DEFAULT_RATIO: Record<Difficulty, number> = { easy: 0.8, moderate: 0.2, difficult: 0 };

function cacheKey(userId: string, date: string) {
  return `daily-questions:${userId}:${date}:v1`;
}

export function useDailyQuestions(userId?: string | null) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { data, isLoading, isError } = useQuery<DailyBundle>({
    queryKey: ["daily-questions", userId, today],
    queryFn: async () => {
      if (!userId) throw new Error("No user id");

      // Local cache first
      const cached = getCache<DailyBundle>(cacheKey(userId, today));
      if (cached) return cached;

      // Load profile difficulty ratio
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("difficulty_ratio")
        .eq("id", userId)
        .maybeSingle();
      if (pErr) console.warn("Failed to load profile ratio, using default", pErr);
      const ratio = (profile?.difficulty_ratio as Record<Difficulty, number>) || DEFAULT_RATIO;

      const counts = computeDailyMix(10, ratio);

      // Fetch pools per difficulty in parallel
      const diffs = Object.entries(counts).filter(([, c]) => c > 0).map(([k]) => k as Difficulty);
      const poolResults = await Promise.all(
        diffs.map(async (d) => {
          const { data, error } = await supabase
            .from("questions")
            .select("id, subject, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer, reasoning")
            .eq("difficulty", d)
            .limit(50);
          if (error) throw error;
          return [d, data ?? []] as const;
        })
      );

      const pools = Object.fromEntries(poolResults) as Record<Difficulty, QuestionRow[]>;

      // Sample respecting counts; if deficit, fill from other pools
      let chosen: QuestionRow[] = [];
      const deficits: Partial<Record<Difficulty, number>> = {};
      for (const d of ["easy", "moderate", "difficult"] as Difficulty[]) {
        const need = counts[d];
        const pool = pools[d] ?? [];
        const pick = sampleArray(pool, need);
        chosen = chosen.concat(pick);
        if (pick.length < need) deficits[d] = need - pick.length;
      }

      const remainingPools = shuffle(["easy", "moderate", "difficult"]) as Difficulty[];
      for (const d of remainingPools) {
        if (!deficits || Object.keys(deficits).length === 0) break;
        const avail = (pools[d] ?? []).filter((q) => !chosen.find((c) => c.id === q.id));
        for (const key of Object.keys(deficits) as Difficulty[]) {
          while ((deficits[key] || 0) > 0 && avail.length > 0) {
            const next = avail.pop()!;
            chosen.push(next);
            deficits[key]! -= 1;
            if (deficits[key] === 0) delete deficits[key];
          }
        }
      }

      chosen = chosen.slice(0, 10);

      const bundle: DailyBundle = { date: today, counts, questions: chosen };

      // Persist cache
      setCache(cacheKey(userId, today), bundle);

      // Log activity (non-blocking)
      supabase
        .from("activity_log")
        .insert({ user_id: userId, event_type: "daily_questions_selected", details: { counts, ids: chosen.map((q) => q.id) } })
        .then(() => {}, () => {});

      return bundle;
    },
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return { data, isLoading, isError };
}
