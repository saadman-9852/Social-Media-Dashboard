import { useState, useRef } from 'react';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PostComposer({ onPosted }) {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim() && !file) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('caption', caption);
      if (file) formData.append('media', file);

      const { data } = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onPosted?.(data.post);
      setCaption('');
      clearFile();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-5">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-paperDim overflow-hidden shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-450 font-display text-sm">
              {user.displayName?.[0]}
            </div>
          )}
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What's happening?"
          rows={2}
          className="flex-1 resize-none outline-none text-[15px] placeholder:text-slate-450/70 text-ink"
        />
      </div>

      {preview && (
        <div className="relative mt-3 rounded-xl overflow-hidden bg-paperDim">
          <img src={preview} alt="" className="w-full max-h-72 object-cover" />
          <button
            type="button"
            onClick={clearFile}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-ink/70 text-white flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-paperDim">
        <label className="flex items-center gap-1.5 text-slate-450 hover:text-signal cursor-pointer transition-colors text-sm">
          <ImageIcon size={18} strokeWidth={2} />
          <span>Media</span>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
        </label>

        <button
          type="submit"
          disabled={submitting || (!caption.trim() && !file)}
          className="bg-signal hover:bg-signalDark text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Post
        </button>
      </div>
    </form>
  );
}
