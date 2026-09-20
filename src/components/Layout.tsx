import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Target, CheckSquare, Wallet, Plus, LogOut, Menu, X,
  BookOpen, Dumbbell, Settings as SettingsIcon, ChevronRight, Sparkles,
  Bell, Brain,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import QuickAddModal from './QuickAddModal';
import { dbHelpers } from '../lib/db';
import { generateSuggestions } from '../lib/aiEngine';

const navItems = [
  { name: 'Home',   path: '/',       icon: Home },
  { name: 'Goals',  path: '/goals',  icon: Target },
  { name: 'Tasks',  path: '/tasks',  icon: CheckSquare },
  { name: 'Budget', path: '/budget', icon: Wallet },
];

const drawerItems = [
  { name: 'Learning',  path: '/learning',  icon: BookOpen,     color: 'from-amber-500/20 to-orange-500/20',  iconColor: 'text-amber-400' },
  { name: 'Workouts',  path: '/workouts',  icon: Dumbbell,     color: 'from-green-500/20 to-emerald-500/20', iconColor: 'text-green-400' },
  { name: 'Reminders', path: '/reminders', icon: Bell,         color: 'from-violet-500/20 to-purple-500/20', iconColor: 'text-violet-400' },
  { name: 'AI Insights', path: '/insights', icon: Brain,       color: 'from-indigo-500/20 to-blue-500/20',   iconColor: 'text-indigo-400' },
  { name: 'Settings', path: '/settings',  icon: SettingsIcon, color: 'from-blue-500/20 to-cyan-500/20',     iconColor: 'text-blue-400' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  // Close drawer on route change
  useEffect(() => { setIsDrawerOpen(false); }, [location.pathname]);

  // Count high-priority AI suggestions + active reminders for notification badge
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    const state: any = { tasks: [], goals: [], transactions: [], workouts: [], courses: [], reminders: [], streak: 0 };
    const update = () => {
      const suggestions = generateSuggestions(state);
      const high = suggestions.filter(s => s.priority === 'high').length;
      const rems = state.reminders.length;
      setNotifCount(high + rems);
    };
    try {
      unsubs = [
        dbHelpers.subscribeToTasks(d => { state.tasks = d; update(); }),
        dbHelpers.subscribeToGoals(d => { state.goals = d; update(); }),
        dbHelpers.subscribeToTransactions(d => { state.transactions = d; update(); }),
        dbHelpers.subscribeToWorkouts(d => { state.workouts = d; update(); }),
        dbHelpers.subscribeToCourses(d => { state.courses = d; update(); }),
        dbHelpers.subscribeToReminders(d => { state.reminders = d; update(); }),
      ];
    } catch {}
    return () => unsubs.forEach(u => u());
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-background)] relative overflow-hidden">

      {/* ─── Top Header ──────────────────────────────────────── */}
      <header className="px-5 py-3 flex justify-between items-center glass-panel sticky top-0 z-30 shrink-0">
        {/* Logo + Greeting */}
        <div className="flex flex-col">
          <div className="flex items-center mb-1">
            <img src="/logo.svg" alt="Nexa" className="h-4" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-main)] leading-none">
            {getGreeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{formatDate()}</p>
        </div>

        {/* Notification bell + Avatar + Hamburger */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <button
            onClick={() => navigate('/reminders')}
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all"
            aria-label="Reminders"
          >
            <Bell size={19} />
            {notifCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center leading-none">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* Avatar */}
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-9 h-9 rounded-full object-cover shadow-lg shadow-indigo-500/30"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/30 select-none">
              {initials}
            </div>
          )}

          {/* Hamburger */}
          <button
            id="drawer-toggle"
            onClick={() => setIsDrawerOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* ─── Slide-in Drawer ─────────────────────────────────── */}
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="fixed right-0 top-0 h-full w-72 bg-[var(--color-surface)] border-l border-[var(--color-border)] z-50 flex flex-col animate-slide-in-right shadow-[0_0_60px_rgba(0,0,0,0.8)]">
            {/* Drawer header */}
            <div className="px-5 py-5 flex justify-between items-center border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--color-primary)]" />
                <span className="font-bold gradient-text">More</span>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Drawer items */}
            <div className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 px-1">Sections</p>
              {drawerItems.map((item, i) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-200 group animate-fade-in delay-${i === 0 ? '75' : i === 1 ? '150' : '225'} ${
                      isActive
                        ? 'bg-[var(--color-primary)] shadow-lg shadow-indigo-500/30'
                        : 'hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                        <item.icon size={18} className={isActive ? 'text-white' : item.iconColor} />
                      </div>
                      <span className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-[var(--color-text-main)]'}`}>
                        {item.name}
                      </span>
                      <ChevronRight size={14} className={`ml-auto ${isActive ? 'text-white/70' : 'text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100'} transition-opacity`} />
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Logout */}
            <div className="p-5 border-t border-[var(--color-border)]">
              <button
                onClick={handleLogout}
                className="flex items-center gap-4 p-3.5 w-full rounded-2xl text-rose-400 hover:bg-rose-500/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                  <LogOut size={18} className="text-rose-400" />
                </div>
                <span className="font-semibold text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 py-5 pb-32 scrollbar-hide">
        <Outlet />
      </main>

      {/* ─── Quick Add FAB ────────────────────────────────────── */}
      <button
        id="quick-add-btn"
        onClick={() => setIsQuickAddOpen(true)}
        className="fixed bottom-[88px] right-5 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 animate-pulse-glow press-effect z-20"
        aria-label="Quick add"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <QuickAddModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />

      {/* ─── Bottom Navigation ───────────────────────────────── */}
      <nav className="fixed bottom-0 w-full glass-panel px-6 pt-3 pb-5 flex justify-between items-center z-10 rounded-t-3xl">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 transition-all duration-200 relative group ${
                isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`absolute -top-1 w-10 h-10 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-500/15' : 'bg-transparent'}`} />
                <item.icon size={22} className="relative z-10" />
                <span className={`text-[9px] font-semibold relative z-10 transition-all ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'}`}>
                  {item.name}
                </span>
                {isActive && <div className="w-1 h-1 rounded-full bg-[var(--color-primary)] absolute -bottom-1" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
