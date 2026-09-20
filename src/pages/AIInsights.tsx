import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Sparkles, CheckSquare, Dumbbell, Wallet, BookOpen, Target, ChevronRight } from 'lucide-react';
import { generateSuggestions, computeProductivityScore, type Suggestion } from '../lib/aiEngine';
import { dbHelpers } from '../lib/db';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const SCORE_LABEL = (s: number) =>
  s >= 80 ? 'Excellent 🚀' : s >= 60 ? 'Good 👍' : s >= 40 ? 'Fair ✊' : 'Needs Work 💡';

const SCORE_COLOR = (s: number) =>
  s >= 80 ? 'from-emerald-500 to-teal-500' : s >= 60 ? 'from-indigo-500 to-purple-500' : s >= 40 ? 'from-amber-500 to-orange-500' : 'from-rose-500 to-pink-500';

export default function AIInsights() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const unsubs = [
      dbHelpers.subscribeToTasks(setTasks),
      dbHelpers.subscribeToGoals(setGoals),
      dbHelpers.subscribeToTransactions(setTransactions),
      dbHelpers.subscribeToWorkouts(setWorkouts),
      dbHelpers.subscribeToCourses(setCourses),
      dbHelpers.subscribeToReminders(setReminders),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  useEffect(() => {
    dbHelpers.calculateStreak().then(setStreak).catch(() => {});
  }, [tasks]);

  useEffect(() => {
    const input = { tasks, goals, transactions, workouts, courses, reminders, streak };
    setSuggestions(generateSuggestions(input));
    setScore(computeProductivityScore(input));
  }, [tasks, goals, transactions, workouts, courses, reminders, streak]);

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, c) => a + c.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, c) => a + c.amount, 0);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
  const activeCourses = courses.filter(c => !c.completed && c.progress < 100).length;

  const priorityMap: Record<string, string> = { high: 'text-rose-400 bg-rose-500/10', medium: 'text-amber-400 bg-amber-500/10', low: 'text-emerald-400 bg-emerald-500/10' };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Sparkles size={20} className="text-[var(--color-primary)]" /> AI Insights
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
          Personalized analysis for {user?.name?.split(' ')[0] ?? 'you'}
        </p>
      </div>

      {/* Productivity Score */}
      <div className={`rounded-3xl p-6 bg-gradient-to-br ${SCORE_COLOR(score).replace('from-', 'from-').replace('to-', 'to-')}`} style={{ background: `linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))`, border: '1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Productivity Score</p>
            <p className="text-5xl font-black">{score}</p>
            <p className="text-sm font-semibold text-[var(--color-text-muted)] mt-1">{SCORE_LABEL(score)}</p>
          </div>
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="none"
                stroke="url(#scoreGrad2)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="scoreGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Weekly Summary */}
      <div>
        <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">Weekly Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <CheckSquare size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xl font-black">{completedTasks}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Tasks Done</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <Dumbbell size={18} className="text-rose-400" />
            </div>
            <div>
              <p className="text-xl font-black">{workouts.length}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Workouts</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Wallet size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-black">{savingsRate}%</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Savings Rate</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-black">{activeCourses}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Active Courses</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Streak */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-orange-300 uppercase tracking-widest mb-1">Current Streak</p>
            <p className="text-3xl font-black">🔥 {streak} {streak === 1 ? 'day' : 'days'}</p>
            <p className="text-xs text-orange-300/60 mt-1">
              {streak >= 7 ? 'Outstanding consistency!' : streak >= 3 ? 'Great momentum!' : streak > 0 ? 'Keep it going!' : 'Start your streak today!'}
            </p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
            <span className="text-3xl">🔥</span>
          </div>
        </div>
      </Card>

      {/* All Suggestions */}
      <div>
        <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">
          ✨ All Suggestions ({suggestions.length})
        </h2>
        <div className="flex flex-col gap-2.5">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
              <Sparkles size={36} className="mb-3 opacity-30" />
              <p className="font-semibold">You're doing great!</p>
              <p className="text-xs mt-1 text-[var(--color-text-subtle)]">No action items right now.</p>
            </div>
          ) : (
            suggestions.map(s => (
              <Card key={s.id} className="flex items-start gap-3 group">
                <span className="text-2xl mt-0.5 shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm">{s.title}</p>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${priorityMap[s.priority]}`}>
                      {s.priority}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{s.body}</p>
                </div>
                {s.actionPath && (
                  <button
                    onClick={() => navigate(s.actionPath!)}
                    className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Goals Progress Summary */}
      {goals.length > 0 && (
        <div>
          <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">Goals Overview</h2>
          <div className="flex flex-col gap-2">
            {goals.slice(0, 3).map(g => (
              <Card key={g.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${g.color} flex items-center justify-center shrink-0`}>
                  <Target size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{g.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-[var(--color-surface)] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-700" style={{ width: `${g.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-[var(--color-primary)] font-bold shrink-0">{g.progress}%</span>
                  </div>
                </div>
              </Card>
            ))}
            {goals.length > 3 && (
              <button onClick={() => navigate('/goals')} className="text-xs text-[var(--color-primary)] font-semibold text-center py-2">
                View all {goals.length} goals →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
