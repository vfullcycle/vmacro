import { useEffect, useState } from "react";
import Linkified from "../components/Linkified";
import { useAuth } from "../lib/auth-context";
import { fetchActivityFeed, fetchPosts, markFeedSeen, type FeedItem } from "../lib/feed";
import { supabase } from "../lib/supabase";
import { useIsAdmin } from "../lib/use-is-admin";
import "./Friends.css";

const POSTS_DISPLAY_LIMIT = 10;
const ACTIVITY_DISPLAY_LIMIT = 18;
const MARK_SEEN_DELAY_MS = 2500;
const POST_BODY_MAX_LENGTH = 2000;

export default function Friends() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [postsExpanded, setPostsExpanded] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);

  const [activityItems, setActivityItems] = useState<FeedItem[]>([]);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [activityLoading, setActivityLoading] = useState(true);

  const [postDraft, setPostDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function reloadPosts() {
    setPosts(await fetchPosts());
  }

  // Posts: persistent list, independent of the "seen" cursor — always shows everything
  // (own load-more), unlike the activity feed below (FR-FRIEND-2 amendment, 2026-08-22).
  useEffect(() => {
    fetchPosts().then((items) => {
      setPosts(items);
      setPostsLoading(false);
    });
  }, []);

  // Activity feed: "what's new since I last looked" — food/dish/requests only. Marked
  // seen after a delay, not immediately on mount, so a quick tab-switch away doesn't
  // silently mark unread items as read (FR-FRIEND-1). Timer clears on unmount, so leaving
  // before it fires keeps feed_last_seen_at untouched and the badge still shows next time.
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
        fetchActivityFeed(user.id, lastSeen).then((items) => {
          if (!cancelled) {
            setActivityItems(items);
            setActivityLoading(false);
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
    await reloadPosts();
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
    await reloadPosts();
  }

  async function deletePost(postId: string) {
    if (!window.confirm("ลบโพสต์นี้?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      setPostError(error.message);
      return;
    }
    await reloadPosts();
  }

  const shownPosts = postsExpanded ? posts : posts.slice(0, POSTS_DISPLAY_LIMIT);
  const shownActivity = activityExpanded ? activityItems : activityItems.slice(0, ACTIVITY_DISPLAY_LIMIT);

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

      <h2 className="friends-section-title">โพสต์</h2>
      {postsLoading ? (
        <p>กำลังโหลด...</p>
      ) : posts.length === 0 ? (
        <p className="friends-empty">ยังไม่มีใครโพสต์</p>
      ) : (
        <>
          <ul className="friends-feed-list">
            {shownPosts.map((item) => {
              const isOwnPost = item.authorId === user?.id;
              const canDelete = isOwnPost || isAdmin;

              if (editingPostId === item.postId) {
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
                  <span className="friends-feed-post-body">
                    <Linkified text={item.title} />
                    {item.creatorName && <span className="friends-feed-creator"> — โดย {item.creatorName}</span>}
                  </span>
                  <span className="friends-feed-time">{new Date(item.timestamp).toLocaleDateString("th-TH")}</span>
                  {canDelete && (
                    <span className="friends-feed-post-actions">
                      {isOwnPost && (
                        <button type="button" className="friends-btn-secondary" onClick={() => startEditPost(item)}>
                          แก้ไข
                        </button>
                      )}
                      <button type="button" className="friends-btn-danger" onClick={() => deletePost(item.postId as string)}>
                        ลบ
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {!postsExpanded && posts.length > POSTS_DISPLAY_LIMIT && (
            <button type="button" className="friends-feed-view-all" onClick={() => setPostsExpanded(true)}>
              ดูทั้งหมด ({posts.length})
            </button>
          )}
        </>
      )}

      <h2 className="friends-section-title friends-section-title-activity">ความเคลื่อนไหว</h2>
      {activityLoading ? (
        <p>กำลังโหลด...</p>
      ) : activityItems.length === 0 ? (
        <p className="friends-empty">ยังไม่มีอะไรใหม่</p>
      ) : (
        <>
          <ul className="friends-feed-list">
            {shownActivity.map((item) => (
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
          {!activityExpanded && activityItems.length > ACTIVITY_DISPLAY_LIMIT && (
            <button type="button" className="friends-feed-view-all" onClick={() => setActivityExpanded(true)}>
              ดูทั้งหมด ({activityItems.length})
            </button>
          )}
        </>
      )}
    </section>
  );
}
