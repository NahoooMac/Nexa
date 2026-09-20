import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Target, Flag, Calendar, BarChart2, Plus, Trash2, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { dbHelpers } from '../lib/db';

type Goal = {
  id: string;
  title: string;
  progress: number;
  milestones: number;
  completedMilestones: number;
  color: string;
  status?: string;
  description?: string;
  targetDate?: string;
  milestoneItems?: Array<{ id: string; title: string; completed: boolean }>;
};
type FilterTab = 'big_goals' | 'milestones' | 'projects' | 'progress';

const tabs = [
  { id: 'big_goals',  label: 'Big Goals',  icon: Target },
  { id: 'milestones', label: 'Milestones', icon: Flag },
  { id: 'projects',   label: 'Projects',   icon: Calendar },
  { id: 'progress',   label: 'Progress',   icon: BarChart2 },
];

const COLORS = [
  'bg-indigo-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-amber-500',  'bg-rose-500',   'bg-blue-500',
];

// Add Goal Modal
function AddGoalModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: any) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [milestones, setMilestones] = useState(5);
  const [color, setColor] = useState(COLORS[0]);
  const [targetDate, setTargetDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try { await onAdd({ title, milestones, color, targetDate: targetDate || undefined }); onClose(); }
    catch { alert('Failed to add goal'); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--color-surface)] rounded-t-3xl w-full max-w-md mx-auto p-6 animate-slide-up shadow-2xl">
        <h2 className="text-xl font-black mb-5">Set a New Goal</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Goal Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Learn a new language..." className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Milestones ({milestones})</label>
            <input type="range" min={2} max={10} value={milestones} onChange={e => setMilestones(Number(e.target.value))} className="w-full accent-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Target Date (optional)</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full ${c} ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--color-surface)]' : ''} transition-all`} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--color-surface-2)] text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-60">
              {isLoading ? 'Saving...' : 'Set Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('big_goals');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsub = dbHelpers.subscribeToGoals((fetched) => { setGoals(fetched as Goal[]); setIsLoading(false); });
      return () => unsub();
    } catch { setIsLoading(false); }
  }, []);

  const handleAddGoal = async (data: any) => {
    await dbHelpers.addGoal(data);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    await dbHelpers.deleteGoal(id);
  };

  const handleToggleMilestone = async (goal: Goal, milestoneId: string) => {
    const items = (goal.milestoneItems ?? []).map(m =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    const completedCount = items.filter(m => m.completed).length;
    await dbHelpers.updateGoalProgress(goal.id, completedCount, items.length, items);
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black">Goals</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">{goals.length} goal{goals.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 press-effect"
        >
          <Plus size={14} /> New Goal
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FilterTab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-500/30'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── BIG GOALS TAB ── */}
      {activeTab === 'big_goals' && (
        <div className="flex flex-col gap-3">
          {isLoading ? (
            [1,2,3].map(i => <div key={i} className="h-28 rounded-2xl skeleton" />)
          ) : goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-4"><Target size={36} className="text-indigo-400" /></div>
              <p className="font-semibold mb-1">No goals yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Set your first goal and start tracking progress</p>
            </div>
          ) : (
            goals.map(goal => (
              <Card key={goal.id} className="flex flex-col gap-4 group">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${goal.color}`}>
                      <Target size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold leading-tight">{goal.title}</h3>
                      <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                        <Flag size={11} /> {goal.completedMilestones}/{goal.milestones} Milestones
                        {goal.targetDate && <span className="ml-1">· Due {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-muted)] hover:text-rose-400 p-1">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-[var(--color-text-muted)]">Progress</span>
                    <span className="text-[var(--color-primary)]">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-[var(--color-surface)] h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
              </Card>
            ))
          )}
          <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all mt-1 press-effect">
            <Plus size={18} /><span className="font-semibold text-sm">Set a new goal</span>
          </button>
        </div>
      )}

      {/* ── MILESTONES TAB ── */}
      {activeTab === 'milestones' && (
        <div className="flex flex-col gap-4">
          {goals.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
              <Flag size={36} className="mb-3 opacity-30" />
              <p>Add goals to see their milestones here.</p>
            </div>
          ) : (
            goals.map(goal => (
              <Card key={goal.id} className="flex flex-col gap-3">
                <button
                  className="flex items-center justify-between"
                  onClick={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${goal.color}`}>
                      <Target size={15} className="text-white" />
                    </div>
                    <span className="font-bold text-sm">{goal.title}</span>
                  </div>
                  <ChevronRight size={16} className={`text-[var(--color-text-muted)] transition-transform ${expandedGoalId === goal.id ? 'rotate-90' : ''}`} />
                </button>
                {expandedGoalId === goal.id && (
                  <div className="flex flex-col gap-2 mt-1 animate-fade-in">
                    {(goal.milestoneItems ?? []).map(m => (
                      <button
                        key={m.id}
                        onClick={() => handleToggleMilestone(goal, m.id)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
                      >
                        {m.completed
                          ? <CheckCircle2 size={18} className="text-[var(--color-primary)] shrink-0" />
                          : <Circle size={18} className="text-[var(--color-text-muted)] shrink-0" />
                        }
                        <span className={`text-sm ${m.completed ? 'line-through text-[var(--color-text-muted)]' : ''}`}>{m.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── PROJECTS TAB ── */}
      {activeTab === 'projects' && (
        <div className="flex flex-col gap-4">
          {['in_progress', 'completed'].map(status => {
            const filtered = goals.filter(g => (status === 'completed' ? g.progress >= 100 : g.progress < 100));
            if (filtered.length === 0) return null;
            return (
              <div key={status}>
                <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">
                  {status === 'completed' ? '✅ Completed' : '🚀 In Progress'}
                </h2>
                <div className="flex flex-col gap-2.5">
                  {filtered.map(goal => (
                    <Card key={goal.id} className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${goal.color}`}>
                        <Target size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{goal.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-[var(--color-surface)] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full" style={{ width: `${goal.progress}%` }} />
                          </div>
                          <span className="text-[10px] text-[var(--color-primary)] font-semibold shrink-0">{goal.progress}%</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
          {goals.length === 0 && (
            <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
              <Calendar size={36} className="mb-3 opacity-30" />
              <p>No goals to show as projects yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── PROGRESS TAB ── */}
      {activeTab === 'progress' && (
        <div className="flex flex-col gap-4">
          {goals.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
              <BarChart2 size={36} className="mb-3 opacity-30" />
              <p>Add goals to see progress charts.</p>
            </div>
          ) : (
            <>
              <Card>
                <h2 className="text-sm font-bold mb-4">Goal Progress Overview</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={goals.map(g => ({ name: g.title.length > 12 ? g.title.slice(0, 12) + '…' : g.title, progress: g.progress }))} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                      <Bar dataKey="progress" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                  <p className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">Total Goals</p>
                  <p className="text-2xl font-black">{goals.length}</p>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                  <p className="text-[10px] text-emerald-300 uppercase tracking-wider mb-1">Completed</p>
                  <p className="text-2xl font-black">{goals.filter(g => g.progress >= 100).length}</p>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {showAddModal && (
        <AddGoalModal onClose={() => setShowAddModal(false)} onAdd={handleAddGoal} />
      )}
    </div>
  );
}
