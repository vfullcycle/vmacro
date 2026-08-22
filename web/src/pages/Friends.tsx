import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { fetchFeedItems, markFeedSeen, type FeedItem } from "../lib/feed";
import { supabase } from "../lib/supabase";
import { useIsAdmin } from "../lib/use-is-admin";
import "./Friends.css";

const FEED_DISPLAY_LIMIT = 18;
const MARK_SEEN_DELAY_MS = 2500;
const POST_BODY_MAX_LENGTH = 2000;

export default function Friends() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedExpanded, setFeedExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const [postDraft, setPostDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function reloadFeed() {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("feed_last_seen_at").eq("id", user.id).single();
    const lastSeen = (data as { feed_last_seen_at: string } | null)?.feed_last_seen_at;
    if (!lastSeen) return;
    const items = await fetchFeedItems(user.id, lastSeen);
    setFeedItems(items);
  }

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

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !postDraft.trim()) return;
    setPosting(true);
    setPostError(null);
    const { error } = await supabase.from("posts").insert({ author_id: user.id, body: postDraft.trim() });
    setPosting(false);
    if (error) {
      setPostError(error.message);
      return;
    }
    setPostDraft("");
    await reloadFeed();
  }

  function startEditPost(item: FeedItem) {
    if (!item.postId) return;
    setEditingPostId(item.postId);
    setEditBody(item.title);
  }

  function cancelEditPost() {
    setEditingPostId(null);
    setEditBody("");
  }

  async function saveEditPost(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPostId || !editBody.trim()) return;
    setEditSaving(true);
    const { error } = await supabase.from("posts").update({ body: editBody.trim() }).eq("id", editingPostId);
    setEditSaving(false);
    if (error) {
      setPostError(error.message);
      return;
    }
    cancelEditPost();
    await reloadFeed();
  }

  async function deletePost(postId: string) {
    if (!window.confirm("ลบโพสต์นี้?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      setPostError(error.message);
      return;
    }
    await reloadFeed();
  }

  const shownItems = feedExpanded ? feedItems : feedItems.slice(0, FEED_DISPLAY_LIMIT);

  return (
    <section className="friends-page">
      <h1>Friends</h1>

      <form className="friends-post-form" onSubmit={handlePost}>
        <textarea
          value={postDraft}
          onChange={(e) => setPostDraft(e.target.value.slice(0, POST_BODY_MAX_LENGTH))}
          placeholder="โพสต์อะไรถึงทุกคน..."
          rows={3}
        />
        <div className="friends-post-form-footer">
          <span className="friends-post-counter">
            {postDraft.length}/{POST_BODY_MAX_LENGTH}
          </span>
          <button type="submit" disabled={posting || !postDraft.trim()}>
            {posting ? "กำลังโพสต์..." : "โพสต์"}
          </button>
        </div>
        {postError && <p className="error">{postError}</p>}
      </form>

      {loading ? (
        <p>กำลังโหลด...</p>
      ) : feedItems.length === 0 ? (
        <p className="friends-empty">ยังไม่มีอะไรใหม่</p>
      ) : (
        <>
          <ul className="friends-feed-list">
            {shownItems.map((item) => {
              const isOwnPost = item.type === "post" && item.authorId === user?.id;
              const canDelete = item.type === "post" && (isOwnPost || isAdmin);

              if (item.type === "post" && editingPostId === item.postId) {
                return (
                  <li key={item.key} className="friends-feed-item">
                    <form onSubmit={saveEditPost} className="friends-post-edit-form">
                      <textarea value={editBody} onChange={(e) => setEditBody(e.target.value.slice(0, POST_BODY_MAX_LENGTH))} rows={3} />
                      <div className="friends-post-form-footer">
                        <span className="friends-post-counter">
                          {editBody.length}/{POST_BODY_MAX_LENGTH}
                        </span>
                        <div className="friends-post-edit-actions">
                          <button type="button" className="friends-btn-secondary" onClick={cancelEditPost}>
                            ยกเลิก
                          </button>
                          <button type="submit" disabled={editSaving || !editBody.trim()}>
                            {editSaving ? "..." : "บันทึก"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </li>
                );
              }

              return (
                <li key={item.key} className="friends-feed-item">
                  <span className={item.type === "post" ? "friends-feed-post-body" : "friends-feed-title"}>
                    {item.title}
                    {item.creatorName && <span className="friends-feed-creator"> — โดย {item.creatorName}</span>}
                  </span>
                  {item.detail && <span className="friends-feed-detail">{item.detail}</span>}
                  <span className="friends-feed-time">{new Date(item.timestamp).toLocaleDateString("th-TH")}</span>
                  {item.type === "post" && canDelete && (
                    <span className="friends-feed-post-actions">
                      {isOwnPost && (
                        <button type="button" className="friends-btn-secondary" onClick={() => startEditPost(item)}>
                          แก้ไข
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" className="friends-btn-danger" onClick={() => deletePost(item.postId as string)}>
                          ลบ
                        </button>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
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
