import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Bell, Plus, Trash2, Calendar, Clock, CheckCircle2, RefreshCw, History } from 'lucide-react';
import { dbHelpers } from '../lib/db';
import { scheduleReminders, requestNotificationPermission } from '../lib/notifications';
import AddReminderModal from '../components/AddReminderModal';

type Reminder = {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  repeat?: 'none' | 'daily' | 'weekly';
  dismissed: boolean;
  lastCompletedDate?: string | null;
  calendarEventId?: string;
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function daysFromNow(isoDate: string): number {
  const d = new Date(isoDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDue(r: Reminder): string {
  const days = daysFromNow(r.dueDate);
  const timeStr = r.dueTime ? ` at ${r.dueTime}` : '';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return `Today${timeStr}`;
  if (days === 1) return `Tomorrow${timeStr}`;
  return (
    new Date(r.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + timeStr
  );
}

function nextOccurrenceLabel(r: Reminder): string {
  if (!r.repeat || r.repeat === 'none') return '';
  if (r.repeat === 'daily') return 'Repeats daily';
  return 'Repeats weekly';
}

// A recurring reminder that was completed today counts as "done for now"
function isDoneForNow(r: Reminder): boolean {
  if (!r.repeat || r.repeat === 'none') return r.dismissed;
  const today = new Date().toISOString().split('T')[0];
  return r.lastCompletedDate === today;
}

// ─── Reminders page ───────────────────────────────────────────────────────────
export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    requestNotificationPermission();
    try {
      const unsub = dbHelpers.subscribeToAllReminders(fetched => {
        setReminders(fetched as Reminder[]);
        setIsLoading(false);
        // Schedule browser/SW notifications for active (non-dismissed, not snoozed) reminders
        const active = (fetched as Reminder[]).filter(r => !r.dismissed && !isDoneForNow(r));
        scheduleReminders(active);
      });
      return () => unsub();
    } catch { setIsLoading(false); }
  }, []);

  // Tabs:
  // "upcoming" = not permanently dismissed AND not done for now (for once) OR recurring that's due again
  // "completed" = permanently dismissed (once) OR recurring that completed at least once (lastCompletedDate set)
  const upcoming = reminders.filter(r => {
    if (r.repeat === 'none' || !r.repeat) return !r.dismissed;
    // Recurring: always active unless explicitly deleted
    return !r.dismissed;
  });

  const dismissed = reminders.filter(r => {
    if (r.repeat === 'none' || !r.repeat) return r.dismissed;
    // Recurring: show in completed if it has a completion history
    return r.dismissed || !!r.lastCompletedDate;
  });

  const displayed = activeTab === 'upcoming' ? upcoming : dismissed;

  const handleDismiss = async (r: Reminder, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await dbHelpers.dismissReminder(r.id, r.repeat ?? 'none');
    } catch (err: any) {
      alert('Failed to mark done: ' + err.message);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await dbHelpers.deleteReminder(id);
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const upcomingCount = upcoming.length;
  const activeCount = upcoming.filter(r => !isDoneForNow(r)).length;

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black">Reminders</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
            {activeCount} active · {upcomingCount} total upcoming
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 press-effect"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'upcoming', label: 'Upcoming', icon: Bell, count: upcomingCount },
          { id: 'completed', label: 'History', icon: History, count: dismissed.length },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-500/30'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
            <span className="text-[10px] opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Reminder list */}
      <div className="flex flex-col gap-2.5">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-[var(--color-text-muted)]">
            <Bell size={36} className="mb-3 opacity-30" />
            <p className="font-semibold">
              {activeTab === 'upcoming' ? 'No reminders set' : 'No completed reminders'}
            </p>
            {activeTab === 'upcoming' && (
              <p className="text-xs mt-1 text-[var(--color-text-subtle)]">Tap + to add your first reminder</p>
            )}
          </div>
        ) : (
          displayed.map(r => {
            const days = daysFromNow(r.dueDate);
            const isOverdue = days < 0 && !isDoneForNow(r);
            const doneForNow = isDoneForNow(r);
            const isRecurring = r.repeat && r.repeat !== 'none';

            return (
              <Card
                key={r.id}
                className={`group ${isOverdue ? 'border-rose-500/30 bg-rose-500/5' : doneForNow ? 'border-emerald-500/20 bg-emerald-500/5' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    r.dismissed || doneForNow
                      ? 'bg-emerald-500/10'
                      : isOverdue
                        ? 'bg-rose-500/10'
                        : 'bg-amber-500/10'
                  }`}>
                    {r.dismissed || doneForNow
                      ? <CheckCircle2 size={18} className="text-emerald-400" />
                      : <Bell size={18} className={isOverdue ? 'text-rose-400' : 'text-amber-400'} />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${r.dismissed ? 'line-through text-[var(--color-text-muted)]' : doneForNow ? 'text-[var(--color-text-muted)]' : ''}`}>
                      {r.title}
                    </p>
                    {r.description && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{r.description}</p>
                    )}

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Due time label */}
                      <span className={`flex items-center gap-1 text-[10px] font-semibold ${
                        isOverdue ? 'text-rose-400' : doneForNow ? 'text-emerald-400' : 'text-[var(--color-text-muted)]'
                      }`}>
                        <Clock size={9} />
                        {doneForNow ? `Done · Next: ${formatDue(r)}` : formatDue(r)}
                      </span>

                      {/* Repeat badge */}
                      {isRecurring && (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                          <RefreshCw size={8} />
                          {nextOccurrenceLabel(r)}
                        </span>
                      )}

                      {/* Calendar synced */}
                      {r.calendarEventId && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <Calendar size={9} /> Synced
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {!r.dismissed && !doneForNow && (
                      <button
                        onClick={e => handleDismiss(r, e)}
                        className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        title={isRecurring ? 'Mark done for today' : 'Mark done'}
                      >
                        <CheckCircle2 size={13} />
                      </button>
                    )}
                    <button
                      onClick={e => handleDelete(r.id, e)}
                      className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Delete reminder"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Add reminder CTA */}
      {activeTab === 'upcoming' && (
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all press-effect"
        >
          <Plus size={18} />
          <span className="font-semibold text-sm">Set a reminder</span>
        </button>
      )}

      {showAddModal && <AddReminderModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
