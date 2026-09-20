import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { CheckCircle2, Circle, AlertCircle, Clock, BookOpen, Dumbbell, Play, CheckSquare, Trash2, Calendar } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { pushToGoogleCalendar } from '../lib/calendarSync';
import { useNavigate } from 'react-router-dom';

type Task = {
  id: string;
  title: string;
  completed: boolean;
  priority: boolean;
  date?: string;
  dueDate?: string;
  type?: 'general' | 'learning' | 'workout';
  referenceId?: string;
  calendarEventId?: string;
};
type FilterTab = 'today' | 'upcoming' | 'completed' | 'priorities';

const tabs = [
  { id: 'today',      label: 'Today' },
  { id: 'upcoming',   label: 'Upcoming' },
  { id: 'completed',  label: 'Done' },
  { id: 'priorities', label: 'Priority' },
];

const typeConfig = {
  learning: { color: 'border-l-blue-500',      badge: 'bg-blue-500/10 text-blue-400',    icon: BookOpen, label: 'Learning' },
  workout:  { color: 'border-l-emerald-500',   badge: 'bg-emerald-500/10 text-emerald-400', icon: Dumbbell, label: 'Workout' },
  general:  { color: 'border-l-indigo-500/40', badge: '',                                 icon: null,     label: '' },
};

export default function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('today');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsub = dbHelpers.subscribeToTasks((fetched) => { setTasks(fetched as Task[]); setIsLoading(false); });
      return () => unsub();
    } catch { setIsLoading(false); }
  }, []);

  const toggleTask = (id: string, current: boolean) => dbHelpers.toggleTaskStatus(id, current);

  const deleteTask = async (id: string) => {
    setDeletingId(id);
    try { await dbHelpers.deleteTask(id); }
    catch { alert('Failed to delete task'); }
    finally { setDeletingId(null); }
  };

  const syncToCalendar = async (task: Task) => {
    if (!task.dueDate) return;
    setSyncingId(task.id);
    try {
      const eventId = await pushToGoogleCalendar({ title: task.title, dueDate: task.dueDate });
      await dbHelpers.updateTask(task.id, { calendarEventId: eventId });
      alert('✅ Synced to Google Calendar!');
    } catch (err: any) {
      alert(`Calendar sync failed: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const isToday = (d?: string) => {
    if (!d) return true;
    return d === new Date().toISOString().split('T')[0];
  };

  const filteredTasks = (() => {
    switch (activeTab) {
      case 'completed':  return tasks.filter(t => t.completed);
      case 'priorities': return tasks.filter(t => t.priority && !t.completed);
      case 'upcoming':   return tasks.filter(t => !t.completed && t.dueDate && !isToday(t.dueDate));
      default:           return tasks.filter(t => !t.completed && isToday(t.dueDate));
    }
  })();

  const openCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black">Tasks</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-0.5">{openCount} open task{openCount !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as FilterTab)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === tab.id ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-16 rounded-2xl skeleton" />)
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-[var(--color-text-muted)]">
            <CheckSquare size={36} className="mb-3 opacity-30" />
            <p className="font-semibold">Nothing here</p>
            <p className="text-xs mt-1 text-[var(--color-text-subtle)]">Switch tabs or add a new task</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const tc = typeConfig[task.type ?? 'general'];
            return (
              <Card key={task.id} className={`flex items-center justify-between gap-3 border-l-4 ${tc.color} group transition-opacity ${deletingId === task.id ? 'opacity-40' : ''}`} style={{ paddingLeft: '1rem' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button onClick={() => toggleTask(task.id, task.completed)} className="shrink-0 transition-transform active:scale-90">
                    {task.completed
                      ? <CheckCircle2 size={22} className="text-[var(--color-primary)]" />
                      : <Circle size={22} className="text-[var(--color-text-muted)] group-hover:text-white transition-colors" />
                    }
                  </button>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={`text-sm font-medium truncate ${task.completed ? 'text-[var(--color-text-muted)] line-through' : 'text-white'}`}>{task.title}</span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {task.priority && <span className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-1.5 py-0.5 rounded-full"><AlertCircle size={9} />Priority</span>}
                      {task.dueDate && <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]"><Clock size={9} />{new Date(task.dueDate + 'T00:00:00').toLocaleDateString()}</span>}
                      {task.calendarEventId && <span className="flex items-center gap-1 text-[10px] text-emerald-400"><Calendar size={9} />Synced</span>}
                      {task.type && task.type !== 'general' && tc.badge && (
                        <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tc.badge}`}>
                          {tc.icon && <tc.icon size={9} />}{tc.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {!task.completed && task.dueDate && !task.calendarEventId && (
                    <button
                      onClick={() => syncToCalendar(task)}
                      disabled={syncingId === task.id}
                      className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Sync to Google Calendar"
                    >
                      {syncingId === task.id
                        ? <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin-slow" />
                        : <Calendar size={13} />
                      }
                    </button>
                  )}
                  {!task.completed && (
                    <button
                      onClick={() => navigate(`/focus/${task.id}`)}
                      className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-primary)] transition-all opacity-0 group-hover:opacity-100"
                      title="Start Focus Mode"
                    >
                      <Play size={13} fill="currentColor" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    disabled={deletingId === task.id}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete task"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
