import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { fetchFeedItems, markFeedSeen, type FeedItem } from "../lib/feed";
import { supabase } from "../lib/supabase";
import "./Friends.css";

const FEED_DISPLAY_LIMIT = 18;
const MARK_SEEN_DELAY_MS = 2500;

export default function Friends() {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedExpanded, setFeedExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch feed items, then mark them seen after a delay — not immediately on mount, so a
  // quick tab-switch away doesn't silently mark unread items as read (FR-FRIEND-1). The
  // timer is cleared on unmount, so leaving before it fires leaves feed_last_seen_at
  // untouched and the badge still shows next time.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("feed_last_seen_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const lastSeen = (data as { feed_last_seen_at: string } | null)?.feed_last_seen_at;
        if (!lastSeen || cancelled) return;
        fetchFeedItems(user.id, lastSeen).then((items) => {
          if (!cancelled) {
            setFeedItems(items);
            setLoading(false);
          }
        });
      });

    const timer = setTimeout(() => {
      if (!cancelled) markFeedSeen(user.id);
    }, MARK_SEEN_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user]);

  return (
    <section className="friends-page">
      <h1>Friends</h1>

      {loading ? (
        <p>กำลังโหลด...</p>
      ) : feedItems.length === 0 ? (
        <p className="friends-empty">ยังไม่มีอะไรใหม่</p>
      ) : (
        <>
          <ul className="friends-feed-list">
            {(feedExpanded ? feedItems : feedItems.slice(0, FEED_DISPLAY_LIMIT)).map((item) => (
              <li key={item.key} className="friends-feed-item">
                <span className="friends-feed-title">
                  {item.title}
                  {item.creatorName && <span className="friends-feed-creator"> — โดย {item.creatorName}</span>}
                </span>
                {item.detail && <span className="friends-feed-detail">{item.detail}</span>}
                <span className="friends-feed-time">{new Date(item.timestamp).toLocaleDateString("th-TH")}</span>
              </li>
            ))}
          </ul>
          {!feedExpanded && feedItems.length > FEED_DISPLAY_LIMIT && (
            <button type="button" className="friends-feed-view-all" onClick={() => setFeedExpanded(true)}>
              ดูทั้งหมด ({feedItems.length})
            </button>
          )}
        </>
      )}
    </section>
  );
}
