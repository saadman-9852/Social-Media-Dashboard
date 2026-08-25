import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Loader2, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const isOwnProfile = currentUser.username === username;

  useEffect(() => {
    setLoading(true);
    api
      .get(`/users/${username}`)
      .then(({ data }) => setProfile(data.user))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [username]);

  const isFollowing = profile?.followers?.some((f) => f._id === currentUser._id);

  const handleFollow = async () => {
    if (followLoading || !profile) return;
    setFollowLoading(true);
    try {
      const { data } = await api.post(`/users/${profile._id}/follow`);
      setProfile((p) => ({
        ...p,
        followers: data.following
          ? [...p.followers, { _id: currentUser._id }]
          : p.followers.filter((f) => f._id !== currentUser._id),
      }));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(data.user);
      setProfile(data.user);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={22} className="animate-spin text-signal" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <p className="font-display text-xl text-ink mb-1">Profile not found</p>
        <p className="text-sm text-slate-450">There's no account at @{username}.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="bg-white rounded-2xl shadow-card p-8">
        <div className="flex items-start gap-6">
          <div className="relative shrink-0">
            <div className="h-24 w-24 rounded-full bg-paperDim overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center font-display text-3xl text-slate-450">
                  {profile.displayName?.[0]}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-signal text-white flex items-center justify-center ring-2 ring-white"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl text-ink">{profile.displayName}</h1>
                <p className="text-sm font-mono text-slate-450">@{profile.username}</p>
              </div>

              {!isOwnProfile && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isFollowing
                        ? 'bg-paperDim text-ink hover:bg-coral/10 hover:text-coral'
                        : 'bg-signal text-white hover:bg-signalDark'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button className="h-9 w-9 rounded-lg bg-paperDim text-ink flex items-center justify-center hover:bg-signal/10 hover:text-signal transition-colors">
                    <MessageCircle size={16} />
                  </button>
                </div>
              )}
            </div>

            {profile.bio && <p className="text-sm text-ink/80 mt-3">{profile.bio}</p>}

            <div className="flex gap-5 mt-4 text-sm">
              <span><strong className="text-ink">{profile.followers?.length || 0}</strong> <span className="text-slate-450">followers</span></span>
              <span><strong className="text-ink">{profile.following?.length || 0}</strong> <span className="text-slate-450">following</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
