import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { CheckSquare, Dumbbell, Wallet, BookOpen, Target, ChevronRight, Sparkles, Send, TrendingUp } from 'lucide-react';
import { analyzeFinances, generateSuggestions, computeProductivityScore, type Suggestion } from '../lib/aiEngine';
import { askNexaAI } from '../lib/aiClient';
import { dbHelpers } from '../lib/db';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const SCORE_LABEL = (s: number) => s >= 80 ? 'Excellent 🚀' : s >= 60 ? 'Good 👍' : s >= 40 ? 'Fair ✊' : 'Needs Work 💡';

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
  const [question, setQuestion] = useState('');
  const [aiText, setAiText] = useState('');
  const [aiModel, setAiModel] = useState('');
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

  const askAI = async (prompt = question) => {
    setAiLoading(true);
    setAiError('');
    try {
      const result = await askNexaAI(prompt, { finance, tasks, goals, workouts, courses, reminders, streak }, 'deep');
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

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><Sparkles size={20} /> AI Insights</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Personalized analysis for {user?.name?.split(' ')[0] ?? 'you'}</p>
      </div>

      <Card className="bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-500/20">
        <div className="flex items-center gap-2 mb-3"><Sparkles size={16} className="text-violet-400" /><h2 className="font-bold">Ask Nexa</h2></div>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">Nexa uses your summarized data to explain your spending, savings, goals, and productivity.</p>
        <div className="flex gap-2">
          <input value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !aiLoading) askAI(); }}
            placeholder="Where am I spending too much?"
            className="flex-1 min-w-0 bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--color-primary)]" />
          <button onClick={() => askAI()} disabled={aiLoading}
            className="w-11 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center disabled:opacity-50">
            {aiLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {['Analyze my spending', 'How is my savings?', 'What should I focus on?', 'Find unusual spending'].map(q => (
            <button key={q} onClick={() => { setQuestion(q); askAI(q); }} disabled={aiLoading}
              className="px-3 py-1.5 rounded-full bg-[var(--color-surface-2)] text-[10px] font-semibold whitespace-nowrap text-[var(--color-text-muted)] hover:text-white">{q}</button>
          ))}
        </div>
        {aiError && <p className="text-xs text-rose-400 mt-3">{aiError}</p>}
        {aiText && (
          <div className="mt-4 p-4 rounded-2xl bg-black/10 border border-white/5">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiText}</p>
            <p className="text-[9px] text-[var(--color-text-muted)] mt-3">Powered by {aiModel}</p>
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
      <div className="text-[9px] text-[var(--color-text-muted)] text-center">Basic calculations stay local. AI is only called when you ask Nexa for deeper analysis.</div>
    </div>
  );
}
