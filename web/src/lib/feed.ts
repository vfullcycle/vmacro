import { supabase } from "./supabase";

export type FeedItemType = "new_food" | "new_dish" | "request_answered";

export interface FeedItem {
  key: string;
  type: FeedItemType;
  title: string;
  detail: string | null;
  creatorName: string | null;
  timestamp: string; // ISO
}

const PER_SOURCE_LIMIT = 20;

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

// Three sources merged into one timeline. Food and dishes are a single "who created what"
// query each (custom_foods/dishes are already public-read per FR-FOOD-2/3) — no need to
// split "admin's food" from "everyone else's food" the way FR-DASH-2 originally did, since
// every item now shows its creator's name directly (FR-FRIEND-1). Dishes in particular are
// the only feed content that comes from a friend rather than admin/self — an early signal
// for whether BL-09 part 2's social features would get used at all.
export async function fetchFeedItems(userId: string, sinceIso: string): Promise<FeedItem[]> {
  const [foods, dishes, requests] = await Promise.all([
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
  ]);

  const foodRows = (foods.data as FoodOrDishRow[]) ?? [];
  const dishRows = (dishes.data as FoodOrDishRow[]) ?? [];
  const requestRows = (requests.data as RequestRow[]) ?? [];

  const creatorIds = [...new Set([...foodRows.map((r) => r.creator_id), ...dishRows.map((r) => r.creator_id)])];
  const nameMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: names } = await supabase.rpc("get_display_names", { profile_ids: creatorIds });
    for (const n of (names as { id: string; display_name: string }[]) ?? []) nameMap.set(n.id, n.display_name);
  }

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
  ];

  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// Cheap existence check for the tab-icon badge — same 3 sources, limit 1 each.
export async function hasUnseenFeed(userId: string, sinceIso: string): Promise<boolean> {
  const [foods, dishes, requests] = await Promise.all([
    supabase.from("custom_foods").select("id").gt("created_at", sinceIso).limit(1),
    supabase.from("dishes").select("id").gt("created_at", sinceIso).limit(1),
    supabase.from("food_requests").select("id").eq("requester_id", userId).neq("status", "pending").gt("updated_at", sinceIso).limit(1),
  ]);

  return (foods.data?.length ?? 0) > 0 || (dishes.data?.length ?? 0) > 0 || (requests.data?.length ?? 0) > 0;
}

export async function markFeedSeen(userId: string): Promise<void> {
  await supabase.from("profiles").update({ feed_last_seen_at: new Date().toISOString() }).eq("id", userId);
}
