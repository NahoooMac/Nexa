import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import {
  Target, Flag, Calendar, BarChart2, Plus, Trash2, ChevronRight,
  CheckCircle2, Circle, Wallet, MapPin, GripVertical, Edit3,
  Plane, BookOpen, Dumbbell, Star, ShoppingCart, TrendingUp, X,
  ExternalLink, AlertCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { dbHelpers, type GoalData, type MilestoneItem, type GoalCategory } from '../lib/db';

// ─── types ────────────────────────────────────────────────────────────────────
type GoalDoc = GoalData & {
  id: string;
  progress: number;
  completedMilestones: number;
  milestones: number;
  status: string;
  createdAt: string;
};

type FilterTab = 'big_goals' | 'milestones' | 'projects' | 'progress';

// ─── constants ────────────────────────────────────────────────────────────────
const COLORS = [
  { cls: 'bg-indigo-500', hex: '#6366f1' },
  { cls: 'bg-purple-500', hex: '#a855f7' },
  { cls: 'bg-emerald-500', hex: '#10b981' },
  { cls: 'bg-amber-500', hex: '#f59e0b' },
  { cls: 'bg-rose-500', hex: '#f43f5e' },
  { cls: 'bg-blue-500', hex: '#3b82f6' },
  { cls: 'bg-teal-500', hex: '#14b8a6' },
  { cls: 'bg-orange-500', hex: '#f97316' },
];

const CATEGORIES: { id: GoalCategory; label: string; icon: typeof Target; color: string }[] = [
  { id: 'savings',  label: 'Savings',          icon: Wallet,      color: 'text-emerald-400' },
  { id: 'purchase', label: 'Purchase',          icon: ShoppingCart,color: 'text-amber-400' },
  { id: 'travel',   label: 'Travel',            icon: Plane,       color: 'text-blue-400' },
  { id: 'education',label: 'Education',         icon: BookOpen,    color: 'text-purple-400' },
  { id: 'fitness',  label: 'Fitness',           icon: Dumbbell,    color: 'text-rose-400' },
  { id: 'personal', label: 'Personal',          icon: Star,        color: 'text-yellow-400' },
  { id: 'other',    label: 'Other',             icon: Target,      color: 'text-slate-400' },
];

const tabs = [
  { id: 'big_goals',  label: 'Goals',     icon: Target },
  { id: 'milestones', label: 'Milestones',icon: Flag },
  { id: 'projects',   label: 'Projects',  icon: Calendar },
  { id: 'progress',   label: 'Progress',  icon: BarChart2 },
];

function getCategoryInfo(id: GoalCategory) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

function isValidUrl(str: string) {
  try { new URL(str); return true; } catch { return false; }
}

function isSafeMapUrl(url: string) {
  try {
    const u = new URL(url);
    const allowed = ['maps.google.com', 'www.google.com', 'goo.gl', 'maps.apple.com', 'openstreetmap.org', 'www.openstreetmap.org'];
    return allowed.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch { return false; }
}

// ─── MilestoneEditor ──────────────────────────────────────────────────────────
function MilestoneEditor({
  items,
  onChange,
}: {
  items: MilestoneItem[];
  onChange: (items: MilestoneItem[]) => void;
}) {
  const addItem = () => {
    onChange([
      ...items,
      { id: `m${Date.now()}`, title: '', completed: false },
    ]);
  };

  const update = (id: string, patch: Partial<MilestoneItem>) => {
    onChange(items.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const remove = (id: string) => {
    onChange(items.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      {items.map((m, idx) => (
        <div key={m.id} className="flex items-start gap-2 p-3 bg-[var(--color-surface-2)] rounded-xl border border-[var(--color-border)]">
          <GripVertical size={14} className="text-[var(--color-text-muted)] mt-2.5 shrink-0 cursor-grab" />
          <div className="flex-1 flex flex-col gap-1.5">
            <input
              value={m.title}
              onChange={e => update(m.id, { title: e.target.value })}
              placeholder={`Milestone ${idx + 1}`}
              className="w-full bg-transparent text-sm text-white placeholder:text-[var(--color-text-subtle)] focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={m.targetDate ?? ''}
                onChange={e => update(m.id, { targetDate: e.target.value || undefined })}
                className="flex-1 bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] rounded-lg px-2 py-1 border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)]"
                title="Target date (optional)"
              />
              <input
                type="number"
                value={m.budget ?? ''}
                onChange={e => update(m.id, { budget: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Budget"
                min={0}
                className="w-24 bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] rounded-lg px-2 py-1 border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
          <button type="button" onClick={() => remove(m.id)} className="text-[var(--color-text-muted)] hover:text-rose-400 p-1 shrink-0 mt-0.5">
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
      >
        <Plus size={13} /> Add milestone
      </button>
    </div>
  );
}

// ─── AddGoalModal ─────────────────────────────────────────────────────────────
function AddGoalModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: GoalData) => Promise<void> }) {
  const [step, setStep] = useState<'basics' | 'details' | 'milestones'>('basics');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('personal');
  const [color, setColor] = useState(COLORS[0].cls);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [targetDate, setTargetDate] = useState('');
  // Financial
  const [targetBudget, setTargetBudget] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  // Travel
  const [destination, setDestination] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [mapError, setMapError] = useState('');
  // Milestones
  const [milestoneItems, setMilestoneItems] = useState<MilestoneItem[]>([
    { id: 'm0', title: '', completed: false },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const isFinancial = category === 'savings' || category === 'purchase';
  const isTravel = category === 'travel';

  const validateMapUrl = (url: string) => {
    if (!url) { setMapError(''); return; }
    if (!isValidUrl(url)) { setMapError('Please enter a valid URL'); return; }
    if (!isSafeMapUrl(url)) { setMapError('Only Google Maps or Apple Maps URLs are supported'); return; }
    setMapError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (mapUrl && mapError) return;

    const tb = parseFloat(targetBudget) || undefined;
    const cs = parseFloat(currentSavings) || undefined;

    if (tb !== undefined && tb < 0) return alert('Target budget cannot be negative');
    if (cs !== undefined && cs < 0) return alert('Current savings cannot be negative');

    const filteredMilestones = milestoneItems.filter(m => m.title.trim());

    setIsLoading(true);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        color,
        priority,
        targetDate: targetDate || undefined,
        targetBudget: tb,
        currentSavings: cs ?? 0,
        destination: destination.trim() || undefined,
        mapUrl: mapUrl.trim() || undefined,
        milestoneItems: filteredMilestones,
      });
      onClose();
    } catch { alert('Failed to add goal'); }
    finally { setIsLoading(false); }
  };

  const PRIORITIES = [
    { id: 'low' as const, label: 'Low', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
    { id: 'medium' as const, label: 'Medium', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { id: 'high' as const, label: 'High', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--color-surface)] rounded-t-3xl w-full max-w-lg mx-auto shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black">New Goal</h2>
            <div className="flex gap-1 mt-1.5">
              {(['basics', 'details', 'milestones'] as const).map((s, i) => (
                <div key={s} className={`h-1 rounded-full transition-all ${step === s ? 'w-8 bg-[var(--color-primary)]' : i < ['basics','details','milestones'].indexOf(step) ? 'w-4 bg-[var(--color-primary)]/40' : 'w-4 bg-[var(--color-surface-2)]'}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 pb-2 scrollbar-hide">

            {/* ── STEP 1: Basics ── */}
            {step === 'basics' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Goal Title *</label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    placeholder="e.g. Buy a gaming PC, Travel to Japan..."
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Category</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map(cat => {
                      const CatIcon = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border transition-all text-center ${
                            category === cat.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                              : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-primary)]/40'
                          }`}
                        >
                          <CatIcon size={16} className={category === cat.id ? 'text-[var(--color-primary)]' : cat.color} />
                          <span className="text-[9px] font-semibold text-[var(--color-text-muted)] leading-tight">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c.cls} type="button" onClick={() => setColor(c.cls)}
                        className={`w-8 h-8 rounded-full ${c.cls} transition-all ${color === c.cls ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--color-surface)] scale-110' : ''}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITIES.map(p => (
                      <button key={p.id} type="button" onClick={() => setPriority(p.id)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${priority === p.id ? p.color : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border)]'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: Details ── */}
            {step === 'details' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What does achieving this goal mean to you?"
                    rows={3}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Target Date (optional)</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                </div>

                {isFinancial && (
                  <div className="flex flex-col gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet size={12} /> Financial Target
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Target Budget</label>
                        <input
                          type="number"
                          value={targetBudget}
                          onChange={e => setTargetBudget(e.target.value)}
                          placeholder="100,000"
                          min={0}
                          step="any"
                          className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Current Savings</label>
                        <input
                          type="number"
                          value={currentSavings}
                          onChange={e => setCurrentSavings(e.target.value)}
                          placeholder="0"
                          min={0}
                          step="any"
                          className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                    {targetBudget && currentSavings && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.round((parseFloat(currentSavings) / parseFloat(targetBudget)) * 100))}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-emerald-400">
                          {Math.min(100, Math.round((parseFloat(currentSavings) / parseFloat(targetBudget)) * 100))}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {isTravel && (
                  <div className="flex flex-col gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={12} /> Location
                    </p>
                    <input
                      value={destination}
                      onChange={e => setDestination(e.target.value)}
                      placeholder="Destination (e.g. Tokyo, Japan)"
                      className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <div>
                      <input
                        value={mapUrl}
                        onChange={e => { setMapUrl(e.target.value); validateMapUrl(e.target.value); }}
                        placeholder="Google Maps or Apple Maps URL (optional)"
                        className={`w-full bg-[var(--color-surface-2)] border text-white text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors ${mapError ? 'border-rose-500/50 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-blue-500'}`}
                      />
                      {mapError && (
                        <p className="flex items-center gap-1 text-[10px] text-rose-400 mt-1">
                          <AlertCircle size={10} /> {mapError}
                        </p>
                      )}
                      {mapUrl && !mapError && (
                        <p className="text-[10px] text-blue-400 mt-1">✓ Valid map URL</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 3: Milestones ── */}
            {step === 'milestones' && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Add the key steps to reach your goal. Each milestone can have an optional deadline and budget.
                </p>
                <MilestoneEditor items={milestoneItems} onChange={setMilestoneItems} />
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-3 shrink-0">
            {step !== 'basics' && (
              <button
                type="button"
                onClick={() => setStep(step === 'milestones' ? 'details' : 'basics')}
                className="flex-1 py-3 rounded-2xl bg-[var(--color-surface-2)] text-sm font-semibold"
              >
                Back
              </button>
            )}
            {step === 'basics' && (
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--color-surface-2)] text-sm font-semibold">
                Cancel
              </button>
            )}
            {step !== 'milestones' ? (
              <button
                type="button"
                disabled={step === 'basics' && !title.trim()}
                onClick={() => setStep(step === 'basics' ? 'details' : 'milestones')}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50"
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || !title.trim()}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-60"
              >
                {isLoading ? 'Saving...' : '🎯 Create Goal'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── UpdateSavingsModal ────────────────────────────────────────────────────────
function UpdateSavingsModal({
  goal,
  onClose,
}: {
  goal: GoalDoc;
  onClose: () => void;
}) {
  const [value, setValue] = useState(String(goal.currentSavings ?? 0));
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(value);
    if (isNaN(n) || n < 0) return alert('Please enter a valid amount');
    setIsLoading(true);
    try {
      await dbHelpers.updateGoalSavings(goal.id, n, goal.targetBudget ?? 0);
      onClose();
    } catch { alert('Failed to update'); }
    finally { setIsLoading(false); }
  };

  const tb = goal.targetBudget ?? 0;
  const cs = parseFloat(value) || 0;
  const pct = tb > 0 ? Math.min(100, Math.round((cs / tb) * 100)) : 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center backdrop-blur-md p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--color-surface)] rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-fade-in">
        <h3 className="text-lg font-black mb-1">Update Savings</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">{goal.title}</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Current Amount Saved
            </label>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              min={0}
              step="any"
              required
              className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-lg font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
          {tb > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[var(--color-text-muted)]">Progress</span>
                <span className="text-emerald-400 font-bold">{pct}% of {tb.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--color-surface-2)] text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold disabled:opacity-60">
              {isLoading ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────
function GoalCard({ goal, onDelete, onUpdateSavings, onToggleMilestone }: {
  goal: GoalDoc;
  onDelete: (id: string) => void;
  onUpdateSavings: (goal: GoalDoc) => void;
  onToggleMilestone: (goal: GoalDoc, mid: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const catInfo = getCategoryInfo(goal.category);
  const CatIcon = catInfo.icon;
  const isFinancial = goal.category === 'savings' || goal.category === 'purchase';
  const isTravel = goal.category === 'travel';

  const priorityBadge = {
    high: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    low: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  }[goal.priority ?? 'medium'];

  return (
    <Card className="flex flex-col gap-3 group">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${goal.color}`}>
            <CatIcon size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold leading-tight truncate">{goal.title}</h3>
              {goal.priority && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${priorityBadge}`}>
                  {goal.priority}
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={catInfo.color + ' text-[10px] font-semibold'}>{catInfo.label}</span>
              {goal.milestoneItems?.length > 0 && (
                <>
                  <span>·</span>
                  <Flag size={10} />
                  <span>{(goal.milestoneItems ?? []).filter(m => m.completed).length}/{goal.milestoneItems.length}</span>
                </>
              )}
              {goal.targetDate && (
                <>
                  <span>·</span>
                  <Calendar size={10} />
                  <span>{new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onDelete(goal.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-muted)] hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronRight size={16} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs font-semibold mb-1.5">
          <span className="text-[var(--color-text-muted)]">Progress</span>
          <span className="text-[var(--color-primary)]">{goal.progress}%</span>
        </div>
        <div className="w-full bg-[var(--color-surface)] h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="flex flex-col gap-3 mt-1 animate-fade-in border-t border-[var(--color-border)] pt-3">
          {goal.description && (
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{goal.description}</p>
          )}

          {/* Financial tracker */}
          {isFinancial && (goal.targetBudget ?? 0) > 0 && (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold flex items-center gap-1">
                  <Wallet size={10} /> Financial
                </span>
                <button
                  onClick={() => onUpdateSavings(goal)}
                  className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 hover:text-emerald-300"
                >
                  <Edit3 size={9} /> Update
                </button>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">Saved</span>
                <span className="font-bold text-emerald-400">
                  {(goal.currentSavings ?? 0).toLocaleString()} / {(goal.targetBudget ?? 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Travel location */}
          {isTravel && goal.destination && (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
              <span className="text-[10px] text-blue-300 uppercase tracking-wider font-bold flex items-center gap-1">
                <MapPin size={10} /> Destination
              </span>
              <p className="text-sm font-semibold">{goal.destination}</p>
              {goal.mapUrl && (
                <a
                  href={goal.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink size={11} /> Open Map
                </a>
              )}
            </div>
          )}

          {/* Milestones */}
          {(goal.milestoneItems ?? []).length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold flex items-center gap-1">
                <Flag size={10} /> Milestones
              </span>
              {(goal.milestoneItems ?? []).map(m => (
                <button
                  key={m.id}
                  onClick={() => onToggleMilestone(goal, m.id)}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left w-full group/m"
                >
                  {m.completed
                    ? <CheckCircle2 size={16} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                    : <Circle size={16} className="text-[var(--color-text-muted)] shrink-0 mt-0.5 group-hover/m:text-white transition-colors" />
                  }
                  <div className="min-w-0">
                    <span className={`text-sm ${m.completed ? 'line-through text-[var(--color-text-muted)]' : ''}`}>
                      {m.title}
                    </span>
                    {(m.targetDate || m.budget) && (
                      <div className="flex gap-2 mt-0.5">
                        {m.targetDate && <span className="text-[10px] text-[var(--color-text-subtle)]">{new Date(m.targetDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                        {m.budget && <span className="text-[10px] text-amber-400/70">{m.budget.toLocaleString()} budget</span>}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Goals page ───────────────────────────────────────────────────────────────
export default function Goals() {
  const [goals, setGoals] = useState<GoalDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('big_goals');
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState<GoalDoc | null>(null);

  useEffect(() => {
    try {
      const unsub = dbHelpers.subscribeToGoals(fetched => {
        setGoals(fetched as GoalDoc[]);
        setIsLoading(false);
      });
      return () => unsub();
    } catch { setIsLoading(false); }
  }, []);

  const handleAddGoal = async (data: GoalData) => {
    await dbHelpers.addGoal(data);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return;
    await dbHelpers.deleteGoal(id);
  };

  const handleToggleMilestone = async (goal: GoalDoc, milestoneId: string) => {
    const items = (goal.milestoneItems ?? []).map(m =>
      m.id === milestoneId
        ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : undefined }
        : m
    );
    const completedCount = items.filter(m => m.completed).length;

    // If goal has a financial target, keep financial-based progress; otherwise use milestone progress
    const tb = goal.targetBudget ?? 0;
    const cs = goal.currentSavings ?? 0;
    const hasFinancial = tb > 0;

    if (hasFinancial) {
      // Update milestones without overriding financial progress
      await dbHelpers.updateGoalProgress(goal.id, completedCount, items.length, items);
      // Then restore financial progress
      await dbHelpers.updateGoalSavings(goal.id, cs, tb);
    } else {
      await dbHelpers.updateGoalProgress(goal.id, completedCount, items.length, items);
    }
  };

  const inProgress = goals.filter(g => g.progress < 100);
  const completed = goals.filter(g => g.progress >= 100);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black">Goals</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
            {goals.length} goal{goals.length !== 1 ? 's' : ''} · {inProgress.length} in progress
          </p>
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
            [1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl skeleton" />)
          ) : goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-4">
                <Target size={36} className="text-indigo-400" />
              </div>
              <p className="font-semibold mb-1">No goals yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Set your first goal and start tracking progress</p>
              <button onClick={() => setShowAddModal(true)} className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-bold">
                Create First Goal
              </button>
            </div>
          ) : (
            goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onDelete={handleDeleteGoal}
                onUpdateSavings={setSavingsGoal}
                onToggleMilestone={handleToggleMilestone}
              />
            ))
          )}
          {goals.length > 0 && (
            <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all mt-1 press-effect">
              <Plus size={18} /><span className="font-semibold text-sm">Set a new goal</span>
            </button>
          )}
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
              <GoalCard
                key={goal.id}
                goal={goal}
                onDelete={handleDeleteGoal}
                onUpdateSavings={setSavingsGoal}
                onToggleMilestone={handleToggleMilestone}
              />
            ))
          )}
        </div>
      )}

      {/* ── PROJECTS TAB ── */}
      {activeTab === 'projects' && (
        <div className="flex flex-col gap-4">
          {['in_progress', 'completed'].map(status => {
            const filtered = status === 'completed' ? completed : inProgress;
            if (filtered.length === 0) return null;
            return (
              <div key={status}>
                <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">
                  {status === 'completed' ? '✅ Completed' : '🚀 In Progress'}
                </h2>
                <div className="flex flex-col gap-2.5">
                  {filtered.map(goal => {
                    const catInfo = getCategoryInfo(goal.category);
                    const CatIcon = catInfo.icon;
                    return (
                      <Card key={goal.id} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${goal.color}`}>
                          <CatIcon size={18} className="text-white" />
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
                    );
                  })}
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
                    <BarChart
                      data={goals.map(g => ({ name: g.title.length > 12 ? g.title.slice(0, 12) + '…' : g.title, progress: g.progress }))}
                      margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                    >
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                      <Bar dataKey="progress" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                  <p className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">Total</p>
                  <p className="text-2xl font-black">{goals.length}</p>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                  <p className="text-[10px] text-amber-300 uppercase tracking-wider mb-1">Active</p>
                  <p className="text-2xl font-black">{inProgress.length}</p>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
                  <p className="text-[10px] text-emerald-300 uppercase tracking-wider mb-1">Done</p>
                  <p className="text-2xl font-black">{completed.length}</p>
                </Card>
              </div>
              {/* Category breakdown */}
              <div>
                <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">By Category</h2>
                <div className="flex flex-col gap-2">
                  {CATEGORIES.filter(c => goals.some(g => g.category === c.id)).map(cat => {
                    const CatIcon = cat.icon;
                    const catGoals = goals.filter(g => g.category === cat.id);
                    const avgProgress = Math.round(catGoals.reduce((s, g) => s + g.progress, 0) / catGoals.length);
                    return (
                      <Card key={cat.id} className="flex items-center gap-3">
                        <CatIcon size={16} className={cat.color} />
                        <span className="flex-1 text-sm font-medium">{cat.label}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{catGoals.length} goal{catGoals.length !== 1 ? 's' : ''}</span>
                        <span className="text-xs font-bold text-[var(--color-primary)]">{avgProgress}%</span>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {showAddModal && (
        <AddGoalModal onClose={() => setShowAddModal(false)} onAdd={handleAddGoal} />
      )}

      {savingsGoal && (
        <UpdateSavingsModal goal={savingsGoal} onClose={() => setSavingsGoal(null)} />
      )}
    </div>
  );
}
