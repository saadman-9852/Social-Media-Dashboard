import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../services/api';
import PostComposer from '../components/PostComposer.jsx';
import PostCard from '../components/PostCard.jsx';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFeed = useCallback(async (pageNum = 1) => {
    try {
      const { data } = await api.get('/posts/feed', { params: { page: pageNum, limit: 10 } });
      setPosts((prev) => (pageNum === 1 ? data.posts : [...prev, ...data.posts]));
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
      setError('');
    } catch (err) {
      setError('Could not load the feed. Make sure the backend and MongoDB are running.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(1);
  }, [loadFeed]);

  const handlePosted = (newPost) => setPosts((prev) => [newPost, ...prev]);

  const loadMore = () => {
    setLoadingMore(true);
    loadFeed(page + 1);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="font-display text-3xl text-ink mb-6">Your feed</h1>

      <div className="space-y-5">
        <PostComposer onPosted={handlePosted} />

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="animate-spin text-signal" />
          </div>
        )}

        {error && !loading && (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <p className="text-sm text-slate-450">{error}</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card p-10 text-center">
            <p className="font-display text-lg text-ink mb-1">No posts yet</p>
            <p className="text-sm text-slate-450">Follow people or share your first post to get started.</p>
          </div>
        )}

        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}

        {hasMore && (
          <div className="flex justify-center pt-2 pb-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-sm font-medium text-signal hover:text-signalDark flex items-center gap-2"
            >
              {loadingMore && <Loader2 size={14} className="animate-spin" />}
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
