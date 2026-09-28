import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { CheckSquare, Dumbbell, Wallet, BookOpen, Target, ChevronRight, Sparkles, TrendingUp, FileText, CalendarDays } from 'lucide-react';
import { analyzeFinances, generateSuggestions, computeProductivityScore, type Suggestion } from '../lib/aiEngine';
import { askNexaAI } from '../lib/aiClient';
import { dbHelpers } from '../lib/db';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const SCORE_LABEL = (s: number) => s >= 80 ? 'Excellent 🚀' : s >= 60 ? 'Good 👍' : s >= 40 ? 'Fair ✊' : 'Needs Work 💡';

type AIAction = 'spending' | 'savings' | 'productivity' | 'unusual' | 'weekly' | 'monthly';

function getPeriodTransactions(transactions: any[], days: number) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days + 1);
  return transactions.filter(t => {
    const raw = t.date || t.createdAt;
    if (!raw) return false;
    const date = new Date(raw);
    return !Number.isNaN(date.getTime()) && date >= cutoff;
  });
}

function buildActionPrompt(action: AIAction, finance: ReturnType<typeof analyzeFinances>) {
  const prompts: Record<AIAction, string> = {
    spending: 'Analyze my spending. Tell me the biggest spending areas, important changes, unusual patterns, and 2 practical actions I can take.',
    savings: 'Review my savings. Explain my current savings rate, net savings, monthly trend, and what I should focus on to improve savings.',
    productivity: 'Review my productivity using the supplied tasks, goals, workouts, learning, reminders, and streak. Give me the most useful observations and 2 practical actions.',
    unusual: 'Find unusual or potentially important spending from the supplied financial data. Explain what stands out and what I should check.',
    weekly: 'Create my weekly Nexa report. Summarize the last 7 days of money and productivity data, highlight important changes, and give me 3 priorities for the next week.',
    monthly: 'Create my monthly Nexa report. Summarize the supplied month, including income, expenses, savings, categories, changes, unusual spending, productivity, goals, learning, workouts, and streak. End with 3 practical priorities for next month.',
  };
  return prompts[action];
}

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
  const [aiText, setAiText] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiTitle, setAiTitle] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

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

  useEffect(() => { dbHelpers.calculateStreak().then(setStreak).catch(() => {}); }, [tasks]);

  const input = { tasks, goals, transactions, workouts, courses, reminders, streak };
  const finance = analyzeFinances(transactions);
  const completedTasks = tasks.filter(t => t.completed).length;
  const activeCourses = courses.filter(c => !c.completed && c.progress < 100).length;

  useEffect(() => {
    setSuggestions(generateSuggestions(input));
    setScore(computeProductivityScore(input));
  }, [tasks, goals, transactions, workouts, courses, reminders, streak]);

  const runAI = async (action: AIAction) => {
    setAiLoading(true);
    setAiError('');
    setAiText('');
    setAiTitle(action === 'weekly' ? 'Weekly Report' : action === 'monthly' ? 'Monthly Report' : 'Nexa Analysis');

    try {
      const isWeekly = action === 'weekly';
      const isMonthly = action === 'monthly';
      const periodTransactions = isWeekly
        ? getPeriodTransactions(transactions, 7)
        : isMonthly
          ? getPeriodTransactions(transactions, 30)
          : transactions;

      const periodFinance = analyzeFinances(periodTransactions);
      const result = await askNexaAI(buildActionPrompt(action, periodFinance), {
        finance: periodFinance,
        tasks: isWeekly || isMonthly ? tasks : tasks,
        goals,
        workouts,
        courses,
        reminders,
        streak,
      }, action === 'productivity' || isWeekly || isMonthly ? 'deep' : 'quick');

      setAiText(result.text);
      setAiModel(result.model);
    } catch (error: any) {
      setAiError(error?.message || 'Nexa AI is unavailable right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const topCategory = finance.expenseByCategory[0];
  const biggestChange = finance.categoryChanges[0];

  const actionButton = (action: AIAction, label: string, icon: React.ReactNode, description: string) => (
    <button
      onClick={() => runAI(action)}
      disabled={aiLoading}
      className="text-left p-4 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all disabled:opacity-50 disabled:cursor-wait"
    >
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-[var(--color-surface-hover)] flex items-center justify-center text-[var(--color-primary)]">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{label}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{description}</p>
        </div>
        <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
      </div>
    </button>
  );

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><Sparkles size={20} /> AI Insights</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Personalized intelligence for {user?.name?.split(' ')[0] ?? 'you'}</p>
      </div>

      <Card className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-500/20">
        <div className="flex items-center gap-2 mb-1"><Sparkles size={16} className="text-violet-400" /><h2 className="font-bold">Nexa Intelligence</h2></div>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">AI only runs when you press a button. Your normal Nexa calculations stay local and cost nothing.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {actionButton('spending', 'Analyze Spending', <TrendingUp size={17} />, 'See where your money is going')}
          {actionButton('savings', 'Review Savings', <Wallet size={17} />, 'Understand savings and trends')}
          {actionButton('productivity', 'Analyze Productivity', <Sparkles size={17} />, 'Review your progress and focus')}
          {actionButton('unusual', 'Find Unusual Spending', <FileText size={17} />, 'Spot expenses worth checking')}
        </div>

        <div className="border-t border-[var(--color-border)] mt-4 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Reports</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {actionButton('weekly', 'Generate Weekly Report', <CalendarDays size={17} />, 'Last 7 days + next-week priorities')}
            {actionButton('monthly', 'Generate Monthly Report', <FileText size={17} />, 'Last 30 days + next-month priorities')}
          </div>
        </div>

        {aiLoading && (
          <div className="mt-4 p-4 rounded-2xl bg-black/10 border border-white/5 flex items-center gap-3">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[var(--color-text-muted)]">Nexa is analyzing your data...</p>
          </div>
        )}

        {aiError && <p className="text-xs text-rose-400 mt-3">{aiError}</p>}

        {aiText && !aiLoading && (
          <div className="mt-4 p-4 rounded-2xl bg-black/10 border border-white/5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-bold text-sm">{aiTitle}</h3>
              <span className="text-[9px] text-[var(--color-text-muted)]">{aiModel}</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiText}</p>
          </div>
        )}
      </Card>

      <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Savings</p><p className="text-3xl font-black text-emerald-400">{finance.netSavings.toFixed(0)}</p><p className="text-xs text-[var(--color-text-muted)]">{finance.savingsRate.toFixed(0)}% savings rate</p></div>
          <Wallet className="text-emerald-400" />
        </div>
      </Card>

      {topCategory && (
        <Card>
          <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-rose-400" /><h2 className="font-bold">Spending Snapshot</h2></div>
          <p className="text-sm">Your largest tracked category is <strong>{topCategory.category}</strong> at <strong>{topCategory.amount.toFixed(0)}</strong> ({topCategory.percentage.toFixed(0)}% of expenses).</p>
          {biggestChange && biggestChange.previous > 0 && <p className="text-xs text-[var(--color-text-muted)] mt-2">{biggestChange.category} changed {biggestChange.changePercent > 0 ? 'up' : 'down'} {Math.abs(biggestChange.changePercent).toFixed(0)}% compared with last month.</p>}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3"><CheckSquare size={18} className="text-indigo-400" /><div><p className="text-xl font-black">{completedTasks}</p><p className="text-[10px] text-[var(--color-text-muted)]">Tasks Done</p></div></Card>
        <Card className="flex items-center gap-3"><Dumbbell size={18} className="text-rose-400" /><div><p className="text-xl font-black">{workouts.length}</p><p className="text-[10px] text-[var(--color-text-muted)]">Workouts</p></div></Card>
        <Card className="flex items-center gap-3"><Wallet size={18} className="text-emerald-400" /><div><p className="text-xl font-black">{finance.savingsRate.toFixed(0)}%</p><p className="text-[10px] text-[var(--color-text-muted)]">Savings Rate</p></div></Card>
        <Card className="flex items-center gap-3"><BookOpen size={18} className="text-amber-400" /><div><p className="text-xl font-black">{activeCourses}</p><p className="text-[10px] text-[var(--color-text-muted)]">Active Courses</p></div></Card>
      </div>

      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Productivity Score</p><p className="text-4xl font-black">{score}<span className="text-sm text-[var(--color-text-muted)]">/100</span></p><p className="text-xs text-[var(--color-text-muted)]">{SCORE_LABEL(score)}</p></div>
          <div className="text-4xl">⚡</div>
        </div>
      </Card>

      <div>
        <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">Smart Suggestions</h2>
        <div className="flex flex-col gap-2.5">
          {suggestions.map(s => (
            <Card key={s.id} className="flex items-start gap-3 group">
              <span className="text-2xl shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-bold text-sm">{s.title}</p><span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-white/5">{s.priority}</span></div><p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-1">{s.body}</p></div>
              {s.actionPath && <button onClick={() => navigate(s.actionPath!)} className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-[var(--color-primary)] opacity-0 group-hover:opacity-100"><ChevronRight size={16} /></button>}
            </Card>
          ))}
        </div>
      </div>

      {goals.length > 0 && <div><h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">Goals Overview</h2><div className="flex flex-col gap-2">{goals.slice(0,3).map(g => <Card key={g.id} className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg ${g.color} flex items-center justify-center shrink-0`}><Target size={14} className="text-white" /></div><div className="flex-1"><p className="text-sm font-semibold truncate">{g.title}</p><div className="flex items-center gap-2 mt-1"><div className="flex-1 bg-[var(--color-surface)] h-1.5 rounded-full overflow-hidden"><div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" style={{width:`${g.progress}%`}} /></div><span className="text-[10px] text-[var(--color-primary)] font-bold">{g.progress}%</span></div></div></Card>)}</div></div>}

      <div className="text-[9px] text-[var(--color-text-muted)] text-center">AI is never called automatically. Reports and analyses are generated only when you press a button.</div>
    </div>
  );
}
