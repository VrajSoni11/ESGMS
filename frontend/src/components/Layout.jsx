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
    <div className="min-h-screen flex bg-canvas">
      <aside className="w-64 shrink-0 bg-forest-900 text-white flex flex-col fixed h-screen">
        <div className="px-6 py-6 flex items-center gap-2 border-b border-white/10">
          <span className="text-2xl">🌿</span>
          <div>
            <p className="font-display font-semibold leading-tight">EcoSphere</p>
            <p className="text-[10px] uppercase tracking-widest text-forest-300">ESG Platform</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-ring ${
                  isActive ? 'bg-forest-500 text-white' : 'text-forest-100/80 hover:bg-white/5'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <NavLink to="/notifications" className="flex items-center justify-between px-2 py-2 rounded-lg text-sm text-forest-100/80 hover:bg-white/5 focus-ring">
            <span className="flex items-center gap-2">🔔 Notifications</span>
            {unread > 0 && <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>}
          </NavLink>
        </div>
      </aside>

      <div className="flex-1 flex flex-col ml-64 min-h-screen">
        <header className="h-16 border-b border-line bg-panel/80 backdrop-blur flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="text-sm text-ink/50">
            Signed in as <span className="font-semibold text-ink">{user?.name}</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 focus-ring rounded-full"
            >
              <span className="w-9 h-9 rounded-full bg-forest-500 text-white flex items-center justify-center font-semibold text-sm">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="pill bg-forest-100 text-forest-700">{user?.role}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-panel rounded-xl shadow-card border border-line py-1 z-40">
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-forest-50 text-clay font-medium"
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
