import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, BarChart3, User, LogOut, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import NotificationPanel from './NotificationPanel.jsx';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'Feed', icon: Home, end: true },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const { connected, unreadCount } = useSocket();
  const [panelOpen, setPanelOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Icon rail */}
      <aside className="w-20 shrink-0 bg-ink flex flex-col items-center py-6 gap-8">
        <div className="h-10 w-10 rounded-xl bg-signal flex items-center justify-center">
          <Radio size={20} className="text-white" strokeWidth={2.25} />
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                `group relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                  isActive ? 'bg-signal text-white' : 'text-white/50 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} />
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setPanelOpen((v) => !v)}
          title="Notifications"
          className="relative flex h-12 w-12 items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <span className={`absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full ${connected ? 'bg-sage' : 'bg-white/20'}`} />
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-coral text-white text-[10px] font-mono font-medium flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate(`/profile/${user.username}`)}
          title="Your profile"
          className="h-10 w-10 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-white/70 hover:ring-2 hover:ring-signal transition-all"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
          ) : (
            <User size={18} />
          )}
        </button>

        <button
          onClick={logout}
          title="Log out"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white/40 hover:text-coral hover:bg-white/10 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </aside>

      <main className="flex-1 relative">
        <Outlet />
      </main>

      {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}
    </div>
  );
}

function BellIcon() {
  // lucide-react Bell, imported separately to keep the badge dot positioning simple above
  return <BellSvg />;
}

function BellSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
