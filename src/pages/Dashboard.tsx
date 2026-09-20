import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { ProgressRing } from '../components/ui/ProgressRing';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { CheckCircle2, Circle, ArrowRight, Target, Wallet, BookOpen, Dumbbell, Flame, Bell, ChevronRight } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { generateSuggestions, computeProductivityScore, type Suggestion } from '../lib/aiEngine';
import { Link, useNavigate } from 'react-router-dom';

const shortcuts = [
  { label: 'Goals',    icon: Target,   path: '/goals',    color: 'from-indigo-500/20 to-purple-500/20', iconColor: 'text-indigo-400' },
  { label: 'Budget',   icon: Wallet,   path: '/budget',   color: 'from-emerald-500/20 to-teal-500/20', iconColor: 'text-emerald-400' },
  { label: 'Learning', icon: BookOpen, path: '/learning', color: 'from-amber-500/20 to-orange-500/20', iconColor: 'text-amber-400' },
  { label: 'Workouts', icon: Dumbbell, path: '/workouts', color: 'from-rose-500/20 to-pink-500/20',    iconColor: 'text-rose-400' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [productivityScore, setProductivityScore] = useState(0);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubTasks = dbHelpers.subscribeToTasks(setTasks);
    const unsubTxs = dbHelpers.subscribeToTransactions(setTransactions);
    const unsubGoals = dbHelpers.subscribeToGoals(setGoals);
    const unsubWorkouts = dbHelpers.subscribeToWorkouts(setWorkouts);
    const unsubCourses = dbHelpers.subscribeToCourses(setCourses);
    const unsubReminders = dbHelpers.subscribeToReminders(setReminders);
    return () => { unsubTasks(); unsubTxs(); unsubGoals(); unsubWorkouts(); unsubCourses(); unsubReminders(); };
  }, []);

  // Compute streak and suggestions when data changes
  useEffect(() => {
    dbHelpers.calculateStreak().then(setStreak).catch(() => {});
  }, [tasks]);

  useEffect(() => {
    const s = generateSuggestions({ tasks, goals, transactions, workouts, courses, reminders, streak });
    setSuggestions(s);
    setProductivityScore(computeProductivityScore({ tasks, goals, transactions, workouts, courses, reminders, streak }));
  }, [tasks, goals, transactions, workouts, courses, reminders, streak]);

  // Real financial data
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, c) => a + c.amount, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, c) => a + c.amount, 0);
  const balance = totalIncome - totalExpense;
  const todayTasks = tasks.filter(t => !t.completed).slice(0, 4);
  const mainGoal = goals[0];
  const completedTasks = tasks.filter(t => t.completed).length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const motivationalLabel = taskProgress === 100 ? '🎉 Done!' : taskProgress >= 60 ? 'Almost!' : taskProgress >= 30 ? 'Keep going!' : "Let's go!";

  // Build real cash-flow chart from actual transactions (last 7 days)
  const chartData = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { name: WEEKDAYS[d.getDay()], date: d.toISOString().split('T')[0], value: 0 };
    });
    for (const tx of transactions) {
      const txDate = tx.date?.split('T')[0];
      const day = days.find(d => d.date === txDate);
      if (day) {
        day.value += tx.type === 'income' ? tx.amount : -tx.amount;
      }
    }
    return days;
  })();

  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id)).slice(0, 5);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* Quick shortcuts */}
      <div className="grid grid-cols-4 gap-2.5">
        {shortcuts.map(({ label, icon: Icon, path, color, iconColor }) => (
          <Link key={label} to={path} className="flex flex-col items-center gap-2 p-3 rounded-2xl glass-panel hover:bg-white/5 transition-all press-effect group">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
              <Icon size={18} className={iconColor} />
            </div>
            <span className="text-[10px] font-semibold text-[var(--color-text-muted)] group-hover:text-white transition-colors">{label}</span>
          </Link>
        ))}
      </div>

      {/* AI Suggestions strip */}
      {visibleSuggestions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-1.5">
              ✨ AI Insights
            </span>
            <Link to="/insights" className="text-[10px] text-[var(--color-primary)] font-semibold">View all</Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {visibleSuggestions.map(s => (
              <div key={s.id} className="shrink-0 w-56 rounded-2xl glass-panel p-3.5 flex flex-col gap-2 border border-white/5">
                <div className="flex justify-between items-start">
                  <span className="text-lg">{s.icon}</span>
                  <button
                    onClick={() => setDismissedSuggestions(prev => new Set([...prev, s.id]))}
                    className="text-[var(--color-text-muted)] hover:text-white text-lg leading-none"
                  >×</button>
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight mb-0.5">{s.title}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">{s.body}</p>
                </div>
                {s.actionPath && (
                  <button
                    onClick={() => navigate(s.actionPath!)}
                    className="text-[10px] font-bold text-[var(--color-primary)] flex items-center gap-1 hover:text-[var(--color-primary-light)] transition-colors"
                  >
                    {s.actionLabel} <ChevronRight size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress + Stats row */}
      <div className="flex gap-3">
        <Card className="flex-1 flex flex-col items-center justify-center py-5">
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Today</p>
          <ProgressRing progress={taskProgress} size={110} strokeWidth={9} sublabel={motivationalLabel} />
        </Card>
        <div className="flex-1 flex flex-col gap-3">
          <Card className="flex-1 flex flex-col justify-center">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Spent</span>
            <span className="text-xl font-bold">${totalExpense.toFixed(0)}</span>
          </Card>
          <Card className="flex-1 flex flex-col justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30">
            <span className="text-[10px] text-indigo-300 uppercase tracking-wider flex items-center gap-1"><Flame size={10} /> Streak</span>
            <span className="text-xl font-bold text-white">🔥 {streak} {streak === 1 ? 'Day' : 'Days'}</span>
          </Card>
        </div>
      </div>

      {/* Productivity Score */}
      <Card className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mb-1">Productivity Score</p>
            <p className="text-2xl font-black">{productivityScore}<span className="text-sm text-[var(--color-text-muted)] font-normal">/100</span></p>
          </div>
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-surface-2)" strokeWidth="6" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="url(#scoreGrad)" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - productivityScore / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </Card>

      {/* Financial Chart */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Cash Flow</CardTitle>
              <div className="text-xs text-[var(--color-text-muted)] mt-0.5">Last 7 days</div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${balance.toFixed(0)}</div>
              <div className="text-xs text-[var(--color-text-muted)]">Balance</div>
            </div>
          </div>
        </div>
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
          <Link to="/tasks" className="text-xs text-[var(--color-primary)] flex items-center gap-1 font-medium hover:text-[var(--color-primary-light)] transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </CardHeader>
        <div className="flex flex-col gap-3">
          {todayTasks.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-[var(--color-text-muted)]">
              <CheckCircle2 size={28} className="mb-2 opacity-30" />
              <span className="text-sm">All done! Add a new task to keep going.</span>
            </div>
          ) : (
            todayTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-1">
                <button onClick={() => dbHelpers.toggleTaskStatus(task.id, task.completed)} className="shrink-0">
                  {task.completed
                    ? <CheckCircle2 className="text-[var(--color-primary)]" size={20} />
                    : <Circle className="text-[var(--color-text-muted)] hover:text-white transition-colors" size={20} />
                  }
                </button>
                <span className={`text-sm truncate ${task.completed ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-main)]'}`}>
                  {task.title}
                </span>
                {task.priority && <span className="text-[10px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Priority</span>}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Main Goal */}
      {mainGoal && (
        <Card>
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Main Goal</h2>
              <div className="text-base font-semibold">{mainGoal.title}</div>
            </div>
            <div className="text-lg font-bold text-[var(--color-primary)]">{mainGoal.progress}%</div>
          </div>
          <div className="w-full bg-[var(--color-surface)] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${mainGoal.progress}%` }}
            />
          </div>
        </Card>
      )}

      {/* Upcoming Reminders */}
      {reminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Reminders</CardTitle>
            <Link to="/reminders" className="text-xs text-[var(--color-primary)] flex items-center gap-1 font-medium">
              View all <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <div className="flex flex-col gap-2.5">
            {reminders.slice(0, 3).map(r => (
              <div key={r.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Bell size={14} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    {new Date(r.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {r.dueTime && ` at ${r.dueTime}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Savings card — real data */}
      {totalIncome > 0 && (
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 mb-6">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-1">Net Balance</h2>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${balance.toFixed(2)}</div>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 font-bold text-sm">
                {totalIncome > 0 ? `${Math.round((1 - totalExpense / totalIncome) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
          <p className="text-xs text-emerald-300/50">Savings rate from all your tracked transactions.</p>
        </Card>
      )}
    </div>
  );
}
