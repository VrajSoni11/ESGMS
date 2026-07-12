import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/environmental', label: 'Environmental', icon: '🌍', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/social', label: 'Social', icon: '🤝', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/governance', label: 'Governance', icon: '⚖️', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/gamification', label: 'Gamification', icon: '🏆', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/reports', label: 'Reports', icon: '📊', roles: ['ADMIN', 'MANAGER'] },
  { to: '/masterdata', label: 'Master Data', icon: '🗂️', roles: ['ADMIN'] },
  { to: '/users', label: 'Users', icon: '👥', roles: ['ADMIN', 'MANAGER'] },
  { to: '/settings', label: 'Settings', icon: '⚙️', roles: ['ADMIN'] }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUnread = () => {
      api.get('/notifications/unread-count').then((res) => setUnread(res.data.count)).catch(() => {});
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, []);

  const items = NAV.filter((n) => n.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-graphite-900">
      <div className="pointer-events-none fixed inset-0 bg-mesh" />

      <aside className="w-64 shrink-0 glass-strong border-r border-mint-400/10 flex flex-col fixed h-screen z-20 rounded-none">
        <div className="px-6 py-6 flex items-center gap-2.5 border-b border-mint-400/10">
          <span className="w-9 h-9 rounded-xl bg-mint-400/15 border border-mint-400/25 flex items-center justify-center text-lg">🌿</span>
          <div>
            <p className="font-display font-semibold leading-tight text-ink">EcoSphere</p>
            <p className="text-[10px] uppercase tracking-widest text-mint-400/60">ESG Platform</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all focus-ring ${
                  isActive
                    ? 'bg-mint-400/15 text-mint-400 border border-mint-400/20 shadow-[0_0_20px_-6px_rgba(184,247,228,0.5)]'
                    : 'text-ink/60 hover:bg-white/[0.04] hover:text-ink border border-transparent'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-mint-400/10">
          <NavLink to="/notifications" className="flex items-center justify-between px-2 py-2 rounded-xl text-sm text-ink/60 hover:bg-white/[0.04] hover:text-ink focus-ring transition-colors">
            <span className="flex items-center gap-2">🔔 Notifications</span>
            {unread > 0 && <span className="bg-amber-400 text-graphite-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>}
          </NavLink>
        </div>
      </aside>

      <div className="flex-1 flex flex-col ml-64 min-h-screen relative z-10">
        <header className="h-16 border-b border-mint-400/10 bg-graphite-800/40 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="text-sm text-ink/50">
            Signed in as <span className="font-semibold text-ink">{user?.name}</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 focus-ring rounded-full"
            >
              <span className="w-9 h-9 rounded-full bg-mint-400 text-graphite-900 flex items-center justify-center font-semibold text-sm">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="pill bg-mint-400/15 text-mint-400 border border-mint-400/20">{user?.role}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 glass-strong rounded-xl py-1 z-40">
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-clay/10 text-clay font-medium transition-colors"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}