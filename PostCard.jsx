import { useState } from 'react';
import { Heart, MessageCircle, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PostCard({ post, onUpdate }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.likes?.some((id) => id === user._id || id?._id === user._id));
  const [likeCount, setLikeCount] = useState(post.likeCount ?? post.likes?.length ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [liking, setLiking] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    // optimistic update
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const { data } = await api.post(`/posts/${post._id}/like`);
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      // revert on failure
      setLiked(!nextLiked);
      setLikeCount((c) => c - (nextLiked ? 1 : -1));
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/posts/${post._id}/comments`, { text: commentText });
      setComments(data.comments);
      setCommentText('');
      onUpdate?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <article className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="h-10 w-10 rounded-full bg-paperDim overflow-hidden shrink-0">
          {post.author?.avatarUrl ? (
            <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-450 font-display text-sm">
              {post.author?.displayName?.[0] || '?'}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink truncate">{post.author?.displayName}</p>
          <p className="text-xs font-mono text-slate-450">
            @{post.author?.username} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {post.caption && <p className="px-5 pt-3 text-[15px] text-ink leading-relaxed">{post.caption}</p>}

      {post.mediaUrl && (
        <div className="mt-3 bg-paperDim">
          {post.mediaType === 'video' ? (
            <video src={post.mediaUrl} controls className="w-full max-h-[520px] object-cover" />
          ) : (
            <img src={post.mediaUrl} alt="" className="w-full max-h-[520px] object-cover" />
          )}
        </div>
      )}

      <div className="flex items-center gap-1 px-3 py-2 mt-1">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            liked ? 'text-coral' : 'text-slate-450 hover:text-coral hover:bg-coral/5'
          }`}
        >
          <Heart size={17} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} />
          {likeCount > 0 && <span className="font-mono text-xs">{likeCount}</span>}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-450 hover:text-signal hover:bg-signal/5 transition-colors"
        >
          <MessageCircle size={17} strokeWidth={2.25} />
          {comments.length > 0 && <span className="font-mono text-xs">{comments.length}</span>}
        </button>
      </div>

      {showComments && (
        <div className="border-t border-paperDim px-5 py-4 space-y-3">
          {comments.map((c) => (
            <div key={c._id} className="flex gap-2.5 text-sm">
              <span className="font-medium text-ink shrink-0">{c.author?.displayName}</span>
              <span className="text-ink/80">{c.text}</span>
            </div>
          ))}

          <form onSubmit={handleComment} className="flex items-center gap-2 pt-1">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 px-3 py-2 rounded-lg border border-paperDim bg-paper focus:bg-white focus:border-signal outline-none text-sm transition-colors"
            />
            <button
              type="submit"
              disabled={submitting}
              className="h-8 w-8 rounded-lg bg-signal text-white flex items-center justify-center disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
