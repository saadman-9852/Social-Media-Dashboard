import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Heart, MessageSquare, Users, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

const STAT_CONFIG = [
  { key: 'totalLikes', label: 'Total likes', icon: Heart, accent: 'text-coral bg-coral/10' },
  { key: 'totalComments', label: 'Comments', icon: MessageSquare, accent: 'text-signal bg-signal/10' },
  { key: 'followerCount', label: 'Followers', icon: Users, accent: 'text-sage bg-sage/10' },
  { key: 'totalViews', label: 'Total views', icon: Eye, accent: 'text-ink bg-ink/5' },
];

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [overviewRes, tsRes, topRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/engagement-over-time', { params: { days: 30 } }),
          api.get('/analytics/top-posts', { params: { limit: 5 } }),
        ]);
        setOverview(overviewRes.data);
        setTimeseries(
          tsRes.data.data.map((d) => ({
            date: format(new Date(d._id), 'MMM d'),
            engagement: d.likes + d.comments,
            posts: d.posts,
          }))
        );
        setTopPosts(topRes.data.posts);
      } catch (err) {
        setError('Could not load analytics. Make sure the backend and MongoDB are running.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={22} className="animate-spin text-signal" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-slate-450">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="font-display text-3xl text-ink">Analytics</h1>
        {overview?.engagementRate !== undefined && (
          <p className="text-sm text-slate-450 font-mono">
            Engagement rate: <span className="text-sage font-medium">{overview.engagementRate}%</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STAT_CONFIG.map(({ key, label, icon: Icon, accent }) => (
          <div key={key} className="bg-white rounded-2xl shadow-card p-5 animate-count">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-4 ${accent}`}>
              <Icon size={17} strokeWidth={2.25} />
            </div>
            <p className="font-display text-3xl text-ink tabular-nums">
              {(overview?.[key] ?? 0).toLocaleString()}
            </p>
            <p className="text-xs font-mono text-slate-450 mt-1">{label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
        <h2 className="font-display text-lg text-ink mb-4">Engagement, last 30 days</h2>
        {timeseries.length === 0 ? (
          <p className="text-sm text-slate-450 py-16 text-center">No activity yet in this window.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timeseries}>
              <defs>
                <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B5BFF" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#3B5BFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #F0EDE6', fontSize: 12 }}
                labelStyle={{ color: '#161A2B', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="engagement" stroke="#3B5BFF" strokeWidth={2} fill="url(#engagementFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6">
        <h2 className="font-display text-lg text-ink mb-4">Top posts</h2>
        {topPosts.length === 0 ? (
          <p className="text-sm text-slate-450 py-8 text-center">Posts you publish will be ranked here.</p>
        ) : (
          <div className="space-y-1">
            {topPosts.map((post, i) => (
              <div key={post._id} className="flex items-center gap-4 py-3 border-b border-paperDim last:border-0">
                <span className="font-mono text-sm text-slate-450 w-5">{i + 1}</span>
                {post.mediaUrl && (
                  <img src={post.mediaUrl} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                )}
                <p className="text-sm text-ink truncate flex-1">{post.caption || 'Untitled post'}</p>
                <div className="flex items-center gap-3 text-xs font-mono text-slate-450 shrink-0">
                  <span className="flex items-center gap-1"><Heart size={12} /> {post.likeCount}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={12} /> {post.commentCount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
