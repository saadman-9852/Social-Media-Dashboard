import { useEffect, useState } from 'react';
import { X, Heart, MessageSquare, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

const ICONS = {
  like: { Icon: Heart, className: 'text-coral bg-coral/10' },
  comment: { Icon: MessageSquare, className: 'text-signal bg-signal/10' },
  follow: { Icon: UserPlus, className: 'text-sage bg-sage/10' },
};

export default function NotificationPanel({ onClose }) {
  const { notifications, markAllRead } = useSocket();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/notifications/recent');
        setHistory(data.notifications || []);
      } catch {
        // Backend not reachable in this environment; panel still shows live items.
      } finally {
        setLoading(false);
      }
    }
    load();
    api.put('/notifications/read-all').catch(() => {});
    markAllRead();
  }, [markAllRead]);

  // Merge live socket notifications on top, de-duped by id
  const combined = [...notifications, ...history].reduce((acc, n) => {
    const id = n.id || n._id;
    if (!acc.find((x) => (x.id || x._id) === id)) acc.push(n);
    return acc;
  }, []);

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]" />
      <div
        className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col animate-[slideIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-paperDim">
          <h2 className="font-display text-xl text-ink">Notifications</h2>
          <button onClick={onClose} className="text-slate-450 hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="px-6 py-8 text-sm text-slate-450 font-mono">Loading…</div>
          )}

          {!loading && combined.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-450 text-sm">Nothing yet. Likes, comments, and new followers will show up here.</p>
            </div>
          )}

          {combined.map((n) => {
            const config = ICONS[n.type] || ICONS.like;
            const { Icon, className } = config;
            return (
              <div
                key={n.id || n._id}
                className="flex items-start gap-3 px-6 py-4 border-b border-paperDim/60 hover:bg-paper transition-colors"
              >
                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${className}`}>
                  <Icon size={16} strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-ink leading-snug">
                    {n.message || `${n.sender?.displayName || 'Someone'} interacted with your content`}
                  </p>
                  <p className="text-xs font-mono text-slate-450 mt-1">
                    {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : 'just now'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
