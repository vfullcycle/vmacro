import { supabase } from "./supabase";

export type FeedItemType = "new_food" | "new_dish" | "request_answered";

export interface FeedItem {
  key: string;
  type: FeedItemType;
  title: string;
  detail: string | null;
  timestamp: string; // ISO
}

const PER_SOURCE_LIMIT = 20;

interface AdminFoodRow {
  id: string;
  name: string;
  created_at: string;
}

interface DishRow {
  id: string;
  name: string;
  created_at: string;
}

interface RequestRow {
  id: string;
  name: string;
  status: "fulfilled" | "declined";
  admin_note: string | null;
  updated_at: string;
}

// Three independent sources merged into one timeline — new admin food, new dishes from
// anyone (the only feed content that comes from a friend rather than admin/self — doubles
// as an early signal for whether BL-09 part 2's social features would get used at all),
// and the user's own answered requests (FR-FOOD-9). Admin foods go through a SECURITY
// DEFINER RPC (get_new_admin_foods) since profiles RLS only lets a user read their own
// row — a plain client-side join to profiles.is_admin would return nothing for anyone but
// admin themselves.
export async function fetchFeedItems(userId: string, sinceIso: string): Promise<FeedItem[]> {
  const [foods, dishes, requests] = await Promise.all([
    supabase.rpc("get_new_admin_foods", { since: sinceIso }),
    supabase.from("dishes").select("id, name, created_at").gt("created_at", sinceIso).order("created_at", { ascending: false }).limit(PER_SOURCE_LIMIT),
    supabase
      .from("food_requests")
      .select("id, name, status, admin_note, updated_at")
      .eq("requester_id", userId)
      .neq("status", "pending")
      .gt("updated_at", sinceIso)
      .order("updated_at", { ascending: false })
      .limit(PER_SOURCE_LIMIT),
  ]);

  const items: FeedItem[] = [
    ...((foods.data as AdminFoodRow[]) ?? []).map((f) => ({
      key: `food-${f.id}`,
      type: "new_food" as const,
      title: `อาหารใหม่: ${f.name}`,
      detail: null,
      timestamp: f.created_at,
    })),
    ...((dishes.data as DishRow[]) ?? []).map((d) => ({
      key: `dish-${d.id}`,
      type: "new_dish" as const,
      title: `จานใหม่: ${d.name}`,
      detail: null,
      timestamp: d.created_at,
    })),
    ...((requests.data as RequestRow[]) ?? []).map((r) => ({
      key: `request-${r.id}`,
      type: "request_answered" as const,
      title: `คำขอ "${r.name}" ${r.status === "fulfilled" ? "เพิ่มแล้ว" : "ไม่ดำเนินการ"}`,
      detail: r.admin_note,
      timestamp: r.updated_at,
    })),
  ];

  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// Cheap existence check for the tab-icon badge — same 3 sources, limit 1 each, no need to
// pull full rows just to answer "is there anything at all". get_new_admin_foods already
// caps at 20 server-side, so re-checking length here is fine without a separate RPC.
export async function hasUnseenFeed(userId: string, sinceIso: string): Promise<boolean> {
  const [foods, dishes, requests] = await Promise.all([
    supabase.rpc("get_new_admin_foods", { since: sinceIso }),
    supabase.from("dishes").select("id").gt("created_at", sinceIso).limit(1),
    supabase.from("food_requests").select("id").eq("requester_id", userId).neq("status", "pending").gt("updated_at", sinceIso).limit(1),
  ]);

  return (foods.data?.length ?? 0) > 0 || (dishes.data?.length ?? 0) > 0 || (requests.data?.length ?? 0) > 0;
}

export async function markFeedSeen(userId: string): Promise<void> {
  await supabase.from("profiles").update({ feed_last_seen_at: new Date().toISOString() }).eq("id", userId);
}
