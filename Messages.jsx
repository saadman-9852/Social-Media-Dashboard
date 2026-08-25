import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Messages() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const activeConversation = conversations.find((c) => c._id === activeId);
  const otherParticipant = activeConversation?.participants.find((p) => p._id !== user._id);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/messages/conversations');
        setConversations(data.conversations);
        if (data.conversations.length > 0) setActiveId(data.conversations[0]._id);
      } catch {
        // backend unreachable in this environment
      } finally {
        setLoadingConvos(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMessages(true);
    api
      .get(`/messages/conversations/${activeId}/messages`)
      .then(({ data }) => setMessages(data.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));

    socket?.emit('conversation:join', activeId);
    return () => socket?.emit('conversation:leave', activeId);
  }, [activeId, socket]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (message) => {
      if (message.conversation === activeId) {
        setMessages((prev) => [...prev, message]);
      }
      setConversations((prev) =>
        prev.map((c) => (c._id === message.conversation ? { ...c, lastMessage: message, lastMessageAt: message.createdAt } : c))
      );
    };

    const onTypingStart = ({ userId, conversationId }) => {
      if (conversationId !== activeId) return;
      setTypingUsers((prev) => new Set(prev).add(userId));
    };

    const onTypingStop = ({ userId, conversationId }) => {
      if (conversationId !== activeId) return;
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('message:new', onNewMessage);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
    };
  }, [socket, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleTyping = useCallback(() => {
    if (!socket || !activeId) return;
    socket.emit('typing:start', { conversationId: activeId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeId });
    }, 1500);
  }, [socket, activeId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !socket || !activeId) return;

    socket.emit('message:send', { conversationId: activeId, text: text.trim() }, (res) => {
      if (!res?.success) console.error('Failed to send message:', res?.error);
    });
    setText('');
    socket.emit('typing:stop', { conversationId: activeId });
  };

  return (
    <div className="h-screen flex">
      {/* Conversation list */}
      <div className="w-80 shrink-0 border-r border-paperDim bg-white flex flex-col">
        <div className="px-6 py-6 border-b border-paperDim">
          <h1 className="font-display text-2xl text-ink">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvos && (
            <div className="flex justify-center py-10">
              <Loader2 size={18} className="animate-spin text-signal" />
            </div>
          )}

          {!loadingConvos && conversations.length === 0 && (
            <div className="px-6 py-10 text-center">
              <MessageCircle size={28} className="mx-auto text-slate-450/50 mb-3" />
              <p className="text-sm text-slate-450">No conversations yet. Start one from someone's profile.</p>
            </div>
          )}

          {conversations.map((c) => {
            const other = c.participants.find((p) => p._id !== user._id);
            const isOnline = onlineUsers.has(other?._id);
            return (
              <button
                key={c._id}
                onClick={() => setActiveId(c._id)}
                className={`w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors ${
                  activeId === c._id ? 'bg-signal/5' : 'hover:bg-paper'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="h-11 w-11 rounded-full bg-paperDim overflow-hidden">
                    {other?.avatarUrl ? (
                      <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-450 font-display text-sm">
                        {other?.displayName?.[0]}
                      </div>
                    )}
                  </div>
                  {isOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-sage ring-2 ring-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{other?.displayName}</p>
                  <p className="text-xs text-slate-450 truncate">{c.lastMessage?.text || 'Say hello 👋'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active conversation */}
      <div className="flex-1 flex flex-col bg-paper">
        {!activeConversation ? (
          <div className="flex-1 flex items-center justify-center text-slate-450 text-sm">
            Select a conversation to start chatting.
          </div>
        ) : (
          <>
            <div className="px-6 py-4 bg-white border-b border-paperDim flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-paperDim overflow-hidden">
                {otherParticipant?.avatarUrl && (
                  <img src={otherParticipant.avatarUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{otherParticipant?.displayName}</p>
                <p className="text-xs font-mono text-slate-450">
                  {onlineUsers.has(otherParticipant?._id) ? 'Online' : '@' + otherParticipant?.username}
                </p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
              {loadingMessages && (
                <div className="flex justify-center py-10">
                  <Loader2 size={18} className="animate-spin text-signal" />
                </div>
              )}

              {messages.map((m) => {
                const mine = (m.sender?._id || m.sender) === user._id;
                return (
                  <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                        mine ? 'bg-signal text-white rounded-br-md' : 'bg-white text-ink rounded-bl-md shadow-card'
                      }`}
                    >
                      <p>{m.text}</p>
                      <p className={`text-[10px] font-mono mt-1 ${mine ? 'text-white/60' : 'text-slate-450'}`}>
                        {format(new Date(m.createdAt), 'p')}
                      </p>
                    </div>
                  </div>
                );
              })}

              {typingUsers.size > 0 && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-md shadow-card px-4 py-2.5 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-slate-450/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} className="px-6 py-4 bg-white border-t border-paperDim flex items-center gap-3">
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  handleTyping();
                }}
                placeholder="Write a message…"
                className="flex-1 px-4 py-2.5 rounded-full border border-paperDim bg-paper focus:bg-white focus:border-signal outline-none text-sm transition-colors"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="h-10 w-10 rounded-full bg-signal hover:bg-signalDark text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
