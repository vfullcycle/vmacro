import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AchievementCard from "../components/AchievementCard";
import DateNav from "../components/DateNav";
import DonutRing from "../components/DonutRing";
import MealTargetCard from "../components/MealTargetCard";
import ProgressBar from "../components/ProgressBar";
import WeightChart from "../components/WeightChart";
import { useAuth } from "../lib/auth-context";
import { checkBadgesOnDashboardOpen, computeTenureDays, fetchBadgeDisplayState, type BadgeDisplayState } from "../lib/badges";
import { addDays, todayLocalDate, type Meal } from "../lib/diary";
import { computeDefaultMealWindows, computeMealTargets, getMealTargetView, resolveMealWindows } from "../lib/mealTargets";
import { computeNutrientComposition, sumOtherNutrients } from "../lib/nutrientComposition";
import type { NutrientPanel } from "../lib/scaling";
import { supabase } from "../lib/supabase";
import { useTodayTarget } from "../lib/useTodayTarget";
import "./Dashboard.css";

const DAY_TYPE_LABELS = { rest: "Rest", light: "Light", hard: "Hard" };
const WEEK_DAYS = 7;

const PROTEIN_COLOR = "#6366f1";
const CARB_COLOR = "#f59e0b";
const FAT_COLOR = "#ef4444";
const OTHER_COLOR = "#9ca3af";
const OTHER_BREAKOUT_COLORS = ["#0ea5e9", "#10b981", "#f97316", "#a855f7", "#eab308", "#ec4899", "#14b8a6"];

interface EntryRow {
  meal: Meal;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrients: NutrientPanel | null;
}

interface WeightLogPoint {
  id: string;
  weight_kg: number;
  logged_at: string;
}

function KcalRing({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  return (
    <div className="dash-ring">
      <svg viewBox="0 0 120 120" className="dash-ring-svg">
        <circle cx="60" cy="60" r={radius} className="dash-ring-track" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="dash-ring-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="dash-ring-label">
        <span className="dash-ring-value">{Math.round(value)}</span>
        <span className="dash-ring-target">/ {Math.round(target)} kcal</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get("date") ?? todayLocalDate();

  const { dayType, target, profile } = useTodayTarget(date);

  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loggedDates, setLoggedDates] = useState<string[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLogPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<BadgeDisplayState[]>([]);

  function goToDate(d: string) {
    setSearchParams({ date: d });
  }

  // Dashboard is the badge safety net (FR-BADGE-1 AC 2) — re-checks every counter this
  // session can compute, including the two that only make sense here (food usage by
  // others, tenure) — then reload display state so newly-unlocked badges show immediately.
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .single()
      .then(async ({ data }) => {
        const createdAt = (data as { created_at: string } | null)?.created_at;
        if (!createdAt) return;
        await checkBadgesOnDashboardOpen(user.id, createdAt);
        setBadges(await fetchBadgeDisplayState(user.id, computeTenureDays(createdAt)));
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("diary_entries")
      .select("meal, kcal, protein_g, carbs_g, fat_g, nutrients")
      .eq("user_id", user.id)
      .eq("entry_date", date)
      .then(({ data }) => setEntries((data as EntryRow[]) ?? []));
  }, [user, date]);

  useEffect(() => {
    if (!user) return;
    const weekStart = addDays(date, -(WEEK_DAYS - 1));
    supabase
      .from("diary_entries")
      .select("entry_date")
      .eq("user_id", user.id)
      .gte("entry_date", weekStart)
      .lte("entry_date", date)
      .then(({ data }) => {
        const rows = (data as { entry_date: string }[]) ?? [];
        setLoggedDates([...new Set(rows.map((r) => r.entry_date))]);
      });
  }, [user, date]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("weight_logs")
      .select("id, weight_kg, logged_at")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true })
      .then(({ data }) => {
        setWeightLogs(data ?? []);
        setLoading(false);
      });
  }, [user]);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({
          kcal: acc.kcal + e.kcal,
          protein_g: acc.protein_g + e.protein_g,
          carbs_g: acc.carbs_g + e.carbs_g,
          fat_g: acc.fat_g + e.fat_g,
        }),
        { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      ),
    [entries],
  );

  const otherNutrients = useMemo(() => sumOtherNutrients(entries.map((e) => e.nutrients)), [entries]);
  const nutrientComposition = useMemo(() => computeNutrientComposition(entries, otherNutrients), [entries, otherNutrients]);

  // Only meaningful for today — see the identical guard in Diary.tsx (FR-CALC-5).
  const mealTargetView = useMemo(() => {
    if (date !== todayLocalDate() || !profile?.wake_time || !target) return null;
    const defaults = computeDefaultMealWindows(profile.wake_time, profile.sleep_hours_target);
    const windows = resolveMealWindows(defaults, profile.meal_time_overrides);
    const mealTargets = computeMealTargets(
      { kcal: target.kcal, protein_g: target.protein_g, carb_g: target.carb_g, fat_g: target.fat_g },
      { breakfast_pct: profile.breakfast_pct, lunch_pct: profile.lunch_pct, dinner_pct: profile.dinner_pct, snack_pct: profile.snack_pct },
    );
    return getMealTargetView(windows, new Date(), mealTargets, entries);
  }, [date, profile, target, entries]);

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const recentWeightLogs = useMemo(() => weightLogs.slice(-14), [weightLogs]);

  return (
    <section className="dashboard-page">
      <h1>Dashboard</h1>

      <DateNav date={date} onChange={goToDate} />

      <div className="dash-card">
        <div className="dash-today-header">
          <span className="dash-today-label">เป้าวันนี้</span>
          {dayType && <span className="dash-day-type-badge">{DAY_TYPE_LABELS[dayType]}</span>}
        </div>

        {target ? (
          <>
            <KcalRing value={totals.kcal} target={target.kcal} />
            <div className="dash-macros">
              <ProgressBar label="โปรตีน" value={totals.protein_g} target={target.protein_g} />
              <ProgressBar label="คาร์บ" value={totals.carbs_g} target={target.carb_g} />
              <ProgressBar label="ไขมัน" value={totals.fat_g} target={target.fat_g} />
            </div>
          </>
        ) : (
          <p className="dash-summary-missing">
            ยังตั้งค่า Settings → Profile ไม่ครบ — <Link to="/settings/profile">ตั้งค่าเพื่อดู target</Link>
          </p>
        )}

        <Link className="dash-diary-link" to={`/diary?date=${date}`}>
          ไปที่ Diary วันนี้
        </Link>
      </div>

      {mealTargetView && <MealTargetCard view={mealTargetView} />}

      <AchievementCard badges={badges} />

      <div className="dash-card">
        <h2>สัดส่วนสารอาหารที่กินวันนี้</h2>
        {nutrientComposition ? (
          <DonutRing
            segments={[
              {
                key: "protein",
                label: "โปรตีน",
                value: nutrientComposition.protein_g,
                valueLabel: `${Math.round(nutrientComposition.protein_g)} g`,
                color: PROTEIN_COLOR,
              },
              {
                key: "carb",
                label: "คาร์บ",
                value: nutrientComposition.carbs_g,
                valueLabel: `${Math.round(nutrientComposition.carbs_g)} g`,
                color: CARB_COLOR,
              },
              {
                key: "fat",
                label: "ไขมัน",
                value: nutrientComposition.fat_g,
                valueLabel: `${Math.round(nutrientComposition.fat_g)} g`,
                color: FAT_COLOR,
              },
              {
                key: "other",
                label: "อื่นๆ",
                value: nutrientComposition.other_g,
                valueLabel: `${nutrientComposition.other_g.toFixed(2)} g`,
                color: OTHER_COLOR,
              },
            ]}
          />
        ) : (
          <p className="dash-summary-missing">ยังไม่มีข้อมูลอาหารวันนี้</p>
        )}
      </div>

      {otherNutrients.length > 0 && (
        <div className="dash-card">
          <h2>องค์ประกอบของ "อื่นๆ"</h2>
          <DonutRing
            segments={otherNutrients.map((n, i) => ({
              key: n.key,
              label: n.label,
              value: n.grams,
              valueLabel: `${n.grams.toFixed(2)} g`,
              color: OTHER_BREAKOUT_COLORS[i % OTHER_BREAKOUT_COLORS.length],
            }))}
          />
        </div>
      )}

      <div className="dash-card">
        <h2>น้ำหนัก</h2>
        {loading ? (
          <p>กำลังโหลด...</p>
        ) : latestWeight ? (
          <>
            <p className="dash-weight-latest">
              {latestWeight.weight_kg} kg
              <span className="dash-weight-date"> · {new Date(latestWeight.logged_at).toLocaleDateString("th-TH")}</span>
            </p>
            <WeightChart data={recentWeightLogs} />
          </>
        ) : (
          <p className="dash-summary-missing">ยังไม่มีข้อมูลน้ำหนัก</p>
        )}
        <Link className="dash-diary-link" to="/weight-log">
          ดูทั้งหมด / บันทึกน้ำหนัก
        </Link>
      </div>

      <div className="dash-card">
        <h2>สรุปสัปดาห์</h2>
        <p className="dash-week-summary">
          บันทึกแล้ว {loggedDates.length}/{WEEK_DAYS} วัน
        </p>
      </div>
    </section>
  );
}
