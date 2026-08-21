import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-context";
import { computeDayTypePreview } from "./preview";
import { supabase } from "./supabase";
import type { DayType } from "./tdee";

export interface ProfileForTarget {
  sex: "male" | "female" | null;
  birth_date: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  body_fat_pct: number | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "extra_active" | null;
  goal: "lose" | "maintain" | "gain" | null;
  formula_choice: "mifflin" | "katch_mcardle" | "harris_benedict";
  default_protein_g_per_kg: number | null;
  default_fat_pct: number | null;
  health_shortcut_name: string | null;
  default_day_type: DayType | null;
  day_type_allowance_rest_kcal: number | null;
  day_type_allowance_light_kcal: number | null;
  day_type_allowance_hard_kcal: number | null;
  carb_floor_g: number | null;
  carb_floor_pct: number | null;
  fat_floor_g_per_kg: number | null;
  fat_floor_pct: number | null;
  // Per-meal targets (FR-CALC-5) — wake_time null means the feature is off for this
  // profile, callers must check it before using the rest of these fields.
  wake_time: string | null;
  sleep_hours_target: number;
  meal_time_overrides: Partial<import("./mealTargets").MealWindows>;
  breakfast_pct: number;
  lunch_pct: number;
  dinner_pct: number;
  snack_pct: number;
}

export interface DayTypeTarget {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  hit_floor: boolean;
}

const PROFILE_SELECT =
  "sex, birth_date, height_cm, current_weight_kg, body_fat_pct, activity_level, goal, formula_choice, default_protein_g_per_kg, default_fat_pct, health_shortcut_name, default_day_type, day_type_allowance_rest_kcal, day_type_allowance_light_kcal, day_type_allowance_hard_kcal, carb_floor_g, carb_floor_pct, fat_floor_g_per_kg, fat_floor_pct, wake_time, sleep_hours_target, meal_time_overrides, breakfast_pct, lunch_pct, dinner_pct, snack_pct";

// Shared by Diary and Dashboard (FR-DASH-1) so both pages always show the same target
// for the same day — never duplicate this profile + day-type + computeDayTypePreview
// pipeline in a page component again, call this hook instead.
export function useTodayTarget(date: string) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileForTarget | null>(null);
  const [dayType, setDayType] = useState<DayType | null>(null);
  const [dayTypeSaving, setDayTypeSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const row = data as ProfileForTarget | null;
        setProfile(row ? { ...row, wake_time: row.wake_time ? row.wake_time.slice(0, 5) : null } : null);
      });
  }, [user]);

  // Day-type is per (user, date) — separate from the profile fetch above so switching
  // dates doesn't need to re-fetch the whole profile (D-019, FR-CALC-4).
  useEffect(() => {
    if (!user) return;
    setDayType(null); // brief loading gap while this date's row is fetched
    supabase
      .from("diary_days")
      .select("day_type")
      .eq("user_id", user.id)
      .eq("entry_date", date)
      .maybeSingle()
      .then(({ data }) => {
        setDayType((data as { day_type: DayType } | null)?.day_type ?? profile?.default_day_type ?? "rest");
      });
  }, [user, date, profile?.default_day_type]);

  async function selectDayType(newType: DayType) {
    if (!user || dayType === newType) return;
    setDayTypeSaving(true);
    setDayType(newType);
    const { error: upsertError } = await supabase
      .from("diary_days")
      .upsert({ user_id: user.id, entry_date: date, day_type: newType }, { onConflict: "user_id,entry_date" });
    setDayTypeSaving(false);
    if (upsertError) setError(upsertError.message);
  }

  const target: DayTypeTarget | null = useMemo(() => {
    const p = profile;
    if (!p || !dayType || !p.sex || !p.birth_date || !p.height_cm || !p.current_weight_kg || !p.activity_level || !p.goal) {
      return null;
    }
    const preview = computeDayTypePreview({
      formula: p.formula_choice,
      sex: p.sex,
      birth_date: p.birth_date,
      height_cm: p.height_cm,
      weight_kg: p.current_weight_kg,
      body_fat_pct: p.body_fat_pct,
      activity_level: p.activity_level,
      goal: p.goal,
      protein_g_per_kg: p.default_protein_g_per_kg,
      fat_pct: p.default_fat_pct,
      day_type: dayType,
      day_type_allowance_kcal: {
        rest: p.day_type_allowance_rest_kcal ?? undefined,
        light: p.day_type_allowance_light_kcal ?? undefined,
        hard: p.day_type_allowance_hard_kcal ?? undefined,
      },
      carb_floor_g: p.carb_floor_g,
      carb_floor_pct: p.carb_floor_pct,
      fat_floor_g_per_kg: p.fat_floor_g_per_kg,
      fat_floor_pct: p.fat_floor_pct,
    });
    return {
      kcal: preview.dayTypeMacros.total_kcal,
      protein_g: preview.dayTypeMacros.protein_g,
      carb_g: preview.dayTypeMacros.carb_g,
      fat_g: preview.dayTypeMacros.fat_g,
      hit_floor: preview.dayTypeMacros.hit_floor,
    };
  }, [profile, dayType]);

  return { profile, dayType, dayTypeSaving, selectDayType, target, error };
}
