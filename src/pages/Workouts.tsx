import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Dumbbell, Activity, Flame, Timer, Calendar as CalendarIcon, ClipboardList, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { dbHelpers } from '../lib/db';

type Workout = { id: string; title: string; duration: number; exercises: number; calories?: number; createdAt: string; notes?: string; };
type FilterTab = 'today' | 'plans' | 'exercises' | 'progress';

const tabs = [
  { id: 'today',     label: "Today's Workout", icon: Dumbbell },
  { id: 'plans',     label: 'Plans',           icon: CalendarIcon },
  { id: 'exercises', label: 'Exercises',       icon: ClipboardList },
  { id: 'progress',  label: 'Progress',        icon: TrendingUp },
];

const avatarColors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-blue-500', 'bg-purple-500'];

const WORKOUT_PLANS = [
  { name: 'Push Day', emoji: '💪', exercises: ['Bench Press 4×8', 'Shoulder Press 3×10', 'Tricep Dips 3×12', 'Lateral Raises 3×15', 'Push-ups 3×15'] },
  { name: 'Pull Day', emoji: '🏋️', exercises: ['Pull-ups 4×8', 'Bent-over Rows 4×10', 'Bicep Curls 3×12', 'Face Pulls 3×15', 'Hammer Curls 3×12'] },
  { name: 'Leg Day', emoji: '🦵', exercises: ['Squats 4×8', 'Romanian Deadlift 3×10', 'Lunges 3×12 each', 'Leg Press 3×12', 'Calf Raises 4×20'] },
  { name: 'Full Body', emoji: '⚡', exercises: ['Deadlift 3×5', 'Bench Press 3×8', 'Squat 3×8', 'Pull-ups 3×8', 'Plank 3×60s'] },
  { name: 'Cardio', emoji: '🏃', exercises: ['Warm-up 5 min', 'Run 20 min', 'Jump Rope 5 min', 'Cool-down 5 min', 'Stretching 5 min'] },
  { name: 'HIIT', emoji: '🔥', exercises: ['Burpees 30s', 'Mountain Climbers 30s', 'Jump Squats 30s', 'High Knees 30s', '× 5 rounds'] },
];

const EXERCISE_LIBRARY = [
  { name: 'Push-up', muscle: 'Chest', emoji: '💪' },
  { name: 'Pull-up', muscle: 'Back', emoji: '🏋️' },
  { name: 'Squat', muscle: 'Legs', emoji: '🦵' },
  { name: 'Deadlift', muscle: 'Full Body', emoji: '⚡' },
  { name: 'Plank', muscle: 'Core', emoji: '🧘' },
  { name: 'Lunges', muscle: 'Legs', emoji: '🚶' },
  { name: 'Burpees', muscle: 'Full Body', emoji: '🔥' },
  { name: 'Bench Press', muscle: 'Chest', emoji: '🏋️' },
  { name: 'Shoulder Press', muscle: 'Shoulders', emoji: '💪' },
  { name: 'Bicep Curl', muscle: 'Arms', emoji: '💪' },
  { name: 'Tricep Dip', muscle: 'Arms', emoji: '💪' },
  { name: 'Running', muscle: 'Cardio', emoji: '🏃' },
];

function LogWorkoutModal({ onClose, onAdd, initialTitle = '' }: { onClose: () => void; onAdd: (d: any) => Promise<void>; initialTitle?: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [duration, setDuration] = useState('');
  const [exercises, setExercises] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    try { await onAdd({ title, duration: parseInt(duration), exercises: parseInt(exercises) || 0, notes: notes || undefined }); onClose(); }
    catch { alert('Failed to log workout'); } finally { setIsLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end backdrop-blur-md" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--color-surface)] rounded-t-3xl w-full max-w-md mx-auto p-6 animate-slide-up shadow-2xl">
        <h2 className="text-xl font-black mb-5">Log Workout</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Workout name" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Duration (min)</label>
              <input value={duration} onChange={e => setDuration(e.target.value)} required type="number" min="1" placeholder="30" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Exercises</label>
              <input value={exercises} onChange={e => setExercises(e.target.value)} type="number" min="0" placeholder="5" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
            </div>
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={3} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none" />
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-[var(--color-surface-2)] text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-bold shadow-lg shadow-rose-500/30 disabled:opacity-60">{isLoading ? 'Saving...' : 'Log It'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Workouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('today');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logTitle, setLogTitle] = useState('');

  useEffect(() => {
    try {
      const unsub = dbHelpers.subscribeToWorkouts((fetched) => { setWorkouts(fetched as Workout[]); setIsLoading(false); });
      return () => unsub();
    } catch { setIsLoading(false); }
  }, []);

  const latestWorkout = workouts[0];
  const workoutCount = workouts.length;
  const totalKcal = workouts.reduce((a, c) => a + (c.calories ?? c.duration * 7), 0);
  const avgDuration = workoutCount > 0 ? Math.round(workouts.reduce((a, c) => a + c.duration, 0) / workoutCount) : 0;

  // Weekly chart data
  const weeklyData = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { name: WEEKDAYS[d.getDay()], date: d.toISOString().split('T')[0], duration: 0 };
    });
    for (const w of workouts) {
      const wDate = w.createdAt?.split('T')[0];
      const day = days.find(d => d.date === wDate);
      if (day) day.duration += w.duration;
    }
    return days;
  })();

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black">Workouts</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Stay active and strong</p>
        </div>
        <button
          onClick={() => { setLogTitle(''); setShowLogModal(true); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold shadow-lg shadow-rose-500/30 press-effect"
        >
          <Plus size={14} /> Log
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as FilterTab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === tab.id ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-white'}`}>
            <tab.icon size={13} />{tab.label}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {activeTab === 'today' && (
        <div className="flex flex-col gap-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="flex flex-col items-center justify-center text-center py-4 bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
              <Flame size={20} className="text-orange-400 mb-1" />
              <span className="text-xl font-black text-white">{totalKcal}</span>
              <span className="text-[10px] text-orange-300 font-medium">kcal</span>
            </Card>
            <Card className="flex flex-col items-center justify-center text-center py-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
              <Activity size={20} className="text-blue-400 mb-1" />
              <span className="text-xl font-black text-white">{workoutCount}</span>
              <span className="text-[10px] text-blue-300 font-medium">total</span>
            </Card>
            <Card className="flex flex-col items-center justify-center text-center py-4 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-purple-500/30">
              <Timer size={20} className="text-purple-400 mb-1" />
              <span className="text-xl font-black text-white">{avgDuration}</span>
              <span className="text-[10px] text-purple-300 font-medium">avg min</span>
            </Card>
          </div>

          {/* Latest workout hero */}
          {latestWorkout && (
            <Card className="p-0 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10" />
              <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070&auto=format&fit=crop" alt="Workout" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 p-5 z-20 w-full">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="px-2 py-1 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-lg mb-2 inline-block uppercase tracking-wider">Latest</span>
                    <h2 className="text-xl font-black text-white">{latestWorkout.title}</h2>
                    <div className="flex items-center gap-4 text-xs text-gray-300 mt-1.5">
                      <span className="flex items-center gap-1"><Timer size={12} />{latestWorkout.duration} min</span>
                      <span className="flex items-center gap-1"><Dumbbell size={12} />{latestWorkout.exercises} exercises</span>
                      <span className="flex items-center gap-1"><Flame size={12} />{latestWorkout.calories ?? latestWorkout.duration * 7} kcal</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* History */}
          <div>
            <h2 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Workout History</h2>
            <div className="flex flex-col gap-2.5">
              {isLoading ? [1,2].map(i => <div key={i} className="h-16 rounded-2xl skeleton" />) :
              workouts.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-[var(--color-text-muted)]">
                  <Dumbbell size={32} className="mb-3 opacity-30" /><p className="text-sm">No workouts logged yet.</p>
                </div>
              ) : workouts.map((w, i) => (
                <Card key={w.id} className="flex items-center gap-4 group">
                  <div className={`w-11 h-11 ${avatarColors[i % avatarColors.length]} rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0`}>
                    {w.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{w.title}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{new Date(w.createdAt).toLocaleDateString()} · {w.duration} min · {w.calories ?? w.duration * 7} kcal</div>
                  </div>
                  <button onClick={() => dbHelpers.deleteWorkout(w.id)} className="w-7 h-7 rounded-full text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={12} />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PLANS TAB */}
      {activeTab === 'plans' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">Tap a plan to start logging it as today's workout.</p>
          {WORKOUT_PLANS.map(plan => (
            <Card key={plan.name} className="group cursor-pointer" onClick={() => { setLogTitle(plan.name); setShowLogModal(true); }}>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{plan.emoji}</span>
                <div>
                  <h3 className="font-black">{plan.name}</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">{plan.exercises.length} exercises</p>
                </div>
                <div className="ml-auto">
                  <span className="text-xs font-bold text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">Start →</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {plan.exercises.map(ex => (
                  <div key={ex} className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <div className="w-1 h-1 rounded-full bg-[var(--color-primary)] shrink-0" />
                    {ex}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* EXERCISES TAB */}
      {activeTab === 'exercises' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">Exercise library — tap any exercise to log a quick workout.</p>
          <div className="grid grid-cols-2 gap-3">
            {EXERCISE_LIBRARY.map(ex => (
              <Card
                key={ex.name}
                className="flex flex-col gap-2 cursor-pointer hover:border-[var(--color-primary)]/40 transition-all group"
                onClick={() => { setLogTitle(ex.name); setShowLogModal(true); }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ex.emoji}</span>
                  <div>
                    <p className="text-sm font-bold">{ex.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{ex.muscle}</p>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">Tap to log →</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* PROGRESS TAB */}
      {activeTab === 'progress' && (
        <div className="flex flex-col gap-4">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 pb-2">
              <h2 className="text-sm font-bold">Weekly Activity (minutes)</h2>
            </div>
            <div className="h-44 px-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', fontSize: '12px' }} formatter={(v: any) => [`${v} min`, 'Duration']} />
                  <Bar dataKey="duration" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
              <p className="text-[10px] text-orange-300 uppercase tracking-wider mb-1">Total Workouts</p>
              <p className="text-2xl font-black">{workoutCount}</p>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20">
              <p className="text-[10px] text-purple-300 uppercase tracking-wider mb-1">Total Kcal</p>
              <p className="text-2xl font-black">{totalKcal}</p>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
              <p className="text-[10px] text-blue-300 uppercase tracking-wider mb-1">Avg Duration</p>
              <p className="text-2xl font-black">{avgDuration}<span className="text-sm font-normal text-[var(--color-text-muted)]"> min</span></p>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
              <p className="text-[10px] text-emerald-300 uppercase tracking-wider mb-1">This Week</p>
              <p className="text-2xl font-black">{weeklyData.filter(d => d.duration > 0).length}<span className="text-sm font-normal text-[var(--color-text-muted)]"> days</span></p>
            </Card>
          </div>
        </div>
      )}

      {showLogModal && <LogWorkoutModal initialTitle={logTitle} onClose={() => setShowLogModal(false)} onAdd={async d => { await dbHelpers.addWorkout(d); }} />}
    </div>
  );
}
