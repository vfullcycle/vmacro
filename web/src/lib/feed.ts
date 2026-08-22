import { supabase } from "./supabase";

export type FeedItemType = "new_food" | "new_dish" | "request_answered" | "post" | "activity";

export interface FeedItem {
  key: string;
  type: FeedItemType;
  title: string;
  detail: string | null;
  creatorName: string | null;
  timestamp: string; // ISO
  postId?: string;
  authorId?: string;
}

const PER_SOURCE_LIMIT = 20;
const POSTS_FETCH_LIMIT = 50;

interface FoodOrDishRow {
  id: string;
  name: string;
  creator_id: string;
  created_at: string;
}

interface RequestRow {
  id: string;
  name: string;
  status: "fulfilled" | "declined";
  admin_note: string | null;
  updated_at: string;
}

interface PostRow {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface ActivityEventRow {
  id: string;
  user_id: string;
  event_type: "all_meals_logged" | "streak_milestone" | "protein_goal_hit" | "food_verified";
  occurred_on: string;
  milestone_days: number | null;
  food_name: string | null;
  created_at: string;
}

// Tone is deliberately flat/factual, no exclamation marks — seeing these daily would turn
// into unwanted noise otherwise (FR-FRIEND-3, adjusted after review).
function activityEventTitle(row: ActivityEventRow, name: string): string {
  switch (row.event_type) {
    case "all_meals_logged":
      return `${name} บันทึกครบทุกมื้อวันนี้`;
    case "streak_milestone":
      return `${name} บันทึกต่อเนื่องครบ ${row.milestone_days} วัน`;
    case "protein_goal_hit":
      return `${name} ถึงเป้าโปรตีนของวันแล้ว`;
    case "food_verified":
      return `อาหารของ ${name} ได้รับการยืนยัน: ${row.food_name}`;
  }
}

async function getDisplayNameMap(ids: string[]): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  if (ids.length === 0) return nameMap;
  const { data } = await supabase.rpc("get_display_names", { profile_ids: ids });
  for (const n of (data as { id: string; display_name: string }[]) ?? []) nameMap.set(n.id, n.display_name);
  return nameMap;
}

// Posts are persistent content, not "what's new since last visit" — a post from last week
// should still be there when someone scrolls down, unlike a food/dish/request notice which
// is only interesting while it's fresh. Kept as its own always-available list (own
// load-more) instead of being mixed into the capped "ความเคลื่อนไหว" section below, where a
// burst of bulk-imported foods was pushing posts off the bottom entirely (found during
// FR-FRIEND-2 dogfood, 2026-08-22).
export async function fetchPosts(limit = POSTS_FETCH_LIMIT): Promise<FeedItem[]> {
  const { data } = await supabase.from("posts").select("id, author_id, body, created_at").order("created_at", { ascending: false }).limit(limit);
  const rows = (data as PostRow[]) ?? [];
  const nameMap = await getDisplayNameMap([...new Set(rows.map((r) => r.author_id))]);

  return rows.map((p) => ({
    key: `post-${p.id}`,
    type: "post" as const,
    title: p.body,
    detail: null,
    creatorName: nameMap.get(p.author_id) ?? null,
    timestamp: p.created_at,
    postId: p.id,
    authorId: p.author_id,
  }));
}

// "What's new since I last looked" — food/dish/requests only (posts moved out, see
// fetchPosts above). Food and dishes are a single "who created what" query each
// (custom_foods/dishes are already public-read per FR-FOOD-2/3) — no need to split
// "admin's food" from "everyone else's food", since every item shows its creator's name
// directly (FR-FRIEND-1).
export async function fetchActivityFeed(userId: string, sinceIso: string): Promise<FeedItem[]> {
  const [foods, dishes, requests, activity] = await Promise.all([
    supabase
      .from("custom_foods")
      .select("id, name, creator_id, created_at")
      .gt("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT),
    supabase.from("dishes").select("id, name, creator_id, created_at").gt("created_at", sinceIso).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT),
    supabase
      .from("food_requests")
      .select("id, name, status, admin_note, updated_at")
      .eq("requester_id", userId)
      .neq("status", "pending")
      .gt("updated_at", sinceIso)
      .order("updated_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT),
    // RLS (activity_events_select) already filters out events from users who've turned
    // share_activity off — no extra filtering needed here.
    supabase
      .from("activity_events")
      .select("id, user_id, event_type, occurred_on, milestone_days, food_name, created_at")
      .gt("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT),
  ]);

  const foodRows = (foods.data as FoodOrDishRow[]) ?? [];
  const dishRows = (dishes.data as FoodOrDishRow[]) ?? [];
  const requestRows = (requests.data as RequestRow[]) ?? [];
  const activityRows = (activity.data as ActivityEventRow[]) ?? [];

  const nameMap = await getDisplayNameMap([
    ...new Set([...foodRows.map((r) => r.creator_id), ...dishRows.map((r) => r.creator_id), ...activityRows.map((r) => r.user_id)]),
  ]);

  const items: FeedItem[] = [
    ...foodRows.map((f) => ({
      key: `food-${f.id}`,
      type: "new_food" as const,
      title: `อาหารใหม่: ${f.name}`,
      detail: null,
      creatorName: nameMap.get(f.creator_id) ?? null,
      timestamp: f.created_at,
    })),
    ...dishRows.map((d) => ({
      key: `dish-${d.id}`,
      type: "new_dish" as const,
      title: `จานใหม่: ${d.name}`,
      detail: null,
      creatorName: nameMap.get(d.creator_id) ?? null,
      timestamp: d.created_at,
    })),
    ...requestRows.map((r) => ({
      key: `request-${r.id}`,
      type: "request_answered" as const,
      title: `คำขอ "${r.name}" ${r.status === "fulfilled" ? "เพิ่มแล้ว" : "ไม่ดำเนินการ"}`,
      detail: r.admin_note,
      creatorName: null,
      timestamp: r.updated_at,
    })),
    ...activityRows.map((a) => ({
      key: `activity-${a.id}`,
      type: "activity" as const,
      title: activityEventTitle(a, nameMap.get(a.user_id) ?? "เพื่อน"),
      detail: null,
      creatorName: null,
      timestamp: a.created_at,
    })),
  ];

  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// Cheap existence check for the tab-icon badge — still all 5 sources including posts and
// activity events, independent of how the page displays them.
export async function hasUnseenFeed(userId: string, sinceIso: string): Promise<boolean> {
  const [foods, dishes, requests, posts, activity] = await Promise.all([
    supabase.from("custom_foods").select("id").gt("created_at", sinceIso).limit(1),
    supabase.from("dishes").select("id").gt("created_at", sinceIso).limit(1),
    supabase.from("food_requests").select("id").eq("requester_id", userId).neq("status", "pending").gt("updated_at", sinceIso).limit(1),
    supabase.from("posts").select("id").gt("created_at", sinceIso).limit(1),
    supabase.from("activity_events").select("id").gt("created_at", sinceIso).limit(1),
  ]);

  return (
    (foods.data?.length ?? 0) > 0 ||
    (dishes.data?.length ?? 0) > 0 ||
    (requests.data?.length ?? 0) > 0 ||
    (posts.data?.length ?? 0) > 0 ||
    (activity.data?.length ?? 0) > 0
  );
}

export async function markFeedSeen(userId: string): Promise<void> {
  await supabase.from("profiles").update({ feed_last_seen_at: new Date().toISOString() }).eq("id", userId);
}
