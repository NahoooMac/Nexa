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

  // Compute Momentum
  const momentumScore = Math.min(100, Math.round(
    (taskProgress * 0.7) + (streak * 3) + (productivityScore * 0.1)
  ));

  // Determine top 3 priority actions for today
  // 1. Any task marked as priority
  // 2. Any task due today
  // 3. Fallback to any incomplete task
  const priorityActions = tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      if (a.dueDate === new Date().toISOString().split('T')[0]) return -1;
      return 0;
    })
    .slice(0, 3);

  // Today's Spending
  const todaysExpense = transactions
    .filter(t => t.type === 'expense' && t.date?.startsWith(new Date().toISOString().split('T')[0]))
    .reduce((a, c) => a + c.amount, 0);

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-8">
      
      {/* Header */}
      <div className="flex flex-col items-center py-4">
        <h1 className="text-3xl font-black mb-1">Today</h1>
        <p className="text-sm text-[var(--color-text-muted)] text-center max-w-xs">
          What should you do today to move your life forward?
        </p>
      </div>

      {/* Action Command Center */}
      <Card className="border-[var(--color-primary)]/40 shadow-[0_0_20px_rgba(99,102,241,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target size={18} className="text-indigo-400" /> 
            Today's Focus
          </CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-2">
          {priorityActions.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-[var(--color-text-muted)]">
              <CheckCircle2 size={32} className="mb-2 opacity-30 text-emerald-400" />
              <span className="text-sm font-medium">You're all caught up today.</span>
              <span className="text-xs mt-1">Enjoy your time or plan for tomorrow.</span>
            </div>
          ) : (
            priorityActions.map((task, index) => {
              // Find the linked goal if referenceId exists
              const linkedGoal = task.referenceId ? goals.find(g => g.id === task.referenceId) : null;
              
              return (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                  <span className="text-xs font-bold text-indigo-400/50 w-4 text-center">{index + 1}</span>
                  <button onClick={() => dbHelpers.toggleTaskStatus(task.id, task.completed)} className="shrink-0 transition-transform active:scale-90">
                    <Circle className="text-[var(--color-text-muted)] group-hover:text-white transition-colors" size={22} />
                  </button>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate text-white">{task.title}</span>
                    {linkedGoal && (
                      <span className="text-[10px] text-indigo-300 font-medium flex items-center gap-1 mt-0.5">
                        <ArrowRight size={10} /> {linkedGoal.title}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/focus/${task.id}`)}
                    className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 hover:scale-110 transition-all"
                  >
                    <Flame size={14} fill="currentColor" />
                  </button>
                </div>
              );
            })
          )}
        </div>
        
        {priorityActions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              You're <span className="text-white font-bold">{taskProgress}%</span> on track today
            </span>
            <div className="w-32 bg-[var(--color-surface-hover)] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Momentum & Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 flex flex-col justify-center items-center py-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Flame size={48} className="text-indigo-400" />
          </div>
          <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1 z-10">Momentum</span>
          <span className="text-4xl font-black text-white z-10 flex items-center gap-1">
            🔥 {momentumScore}
          </span>
          <span className="text-[10px] text-indigo-300/70 mt-2 z-10 text-center px-2">
            Based on {streak}-day streak and {taskProgress}% task completion.
          </span>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="flex-1 flex flex-col justify-center items-center py-4 bg-gradient-to-br from-rose-500/10 to-pink-500/10 border-rose-500/20">
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Wallet size={10} /> Today's Spend
            </span>
            <span className="text-xl font-bold text-rose-100">${todaysExpense.toFixed(0)}</span>
          </Card>
          
          <Card className="flex-1 flex flex-col justify-center items-center py-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1 mb-1">
              <CheckCircle2 size={10} /> Completed
            </span>
            <span className="text-xl font-bold text-emerald-100">{completedTasks} Actions</span>
          </Card>
        </div>
      </div>

      {/* My 3 Goals limit logic applied to UI */}
      {goals.length > 3 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="mt-0.5">
            <Target size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-100">You have {goals.length} active goals.</p>
            <p className="text-xs text-amber-200/70 mt-1">
              Your attention is being divided. Consider focusing on your top 3 to maintain high momentum.
            </p>
            <Link to="/goals" className="inline-block mt-2 text-[10px] font-bold text-amber-400 uppercase tracking-wider hover:text-amber-300">
              Manage Goals <ArrowRight size={10} className="inline mb-0.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Goal Progress Overview */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Goal Health
              <Link to="/goals" className="text-[10px] font-medium text-[var(--color-primary)]">Manage</Link>
            </CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-3">
            {goals.slice(0, 3).map((goal, i) => {
              const healthScore = goal.progress;
              const isHealthy = healthScore >= 50;
              const isWarning = healthScore >= 20 && healthScore < 50;
              
              return (
                <div key={goal.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono">{i + 1 < 10 ? `0${i+1}` : i+1}</span>
                      {goal.title}
                    </span>
                    <span className={`font-bold ${isHealthy ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400'}`}>
                      {isHealthy ? '🟢 On track' : isWarning ? '🟡 Needs attention' : '🔴 Falling behind'}
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-surface-hover)] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isHealthy ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.max(5, healthScore)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* AI Intelligence Block */}
      {visibleSuggestions.length > 0 && (
        <div className="rounded-3xl p-5 bg-gradient-to-br from-[var(--color-surface-2)] to-black/40 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <img src="/favicon.png" className="w-4 h-4 object-contain" alt="sparkle" />
            <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Nexa Intelligence</span>
          </div>
          
          <div className="space-y-4">
            {visibleSuggestions.slice(0, 2).map(s => (
              <div key={s.id}>
                <p className="text-sm font-semibold text-white mb-1">{s.title}</p>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Prompts: Weekly Review & Daily Shutdown */}
      <div className="flex flex-col gap-3 mt-4">
        {new Date().getDay() === 0 && (
          <button onClick={() => navigate('/insights')} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-4 flex items-center justify-between text-left hover:scale-[1.02] transition-all shadow-lg shadow-indigo-500/20">
            <div>
              <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest mb-1">Sunday Routine</p>
              <p className="text-sm font-bold text-white">Start Weekly Review</p>
            </div>
            <ArrowRight className="text-white" size={18} />
          </button>
        )}
        
        <button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl p-4 flex items-center justify-between text-left transition-all group">
          <div>
            <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1 group-hover:text-white transition-colors">End of Day</p>
            <p className="text-sm font-bold text-white">Daily Shutdown</p>
          </div>
          <CheckCircle2 className="text-[var(--color-text-muted)] group-hover:text-white transition-colors" size={18} />
        </button>
      </div>

    </div>
  );
}
