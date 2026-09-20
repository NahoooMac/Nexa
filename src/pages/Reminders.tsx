import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Bell, Plus, Trash2, Calendar, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { dbHelpers } from '../lib/db';

import { scheduleReminders, requestNotificationPermission } from '../lib/notifications';

type Reminder = {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  dueTime?: string;
  repeat?: 'none' | 'daily' | 'weekly';
  dismissed: boolean;
  calendarEventId?: string;
};

import AddReminderModal from '../components/AddReminderModal';

function daysFromNow(isoDate: string): number {
  const d = new Date(isoDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDue(r: Reminder): string {
  const days = daysFromNow(r.dueDate);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today' + (r.dueTime ? ` at ${r.dueTime}` : '');
  if (days === 1) return 'Tomorrow' + (r.dueTime ? ` at ${r.dueTime}` : '');
  return new Date(r.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (r.dueTime ? ` at ${r.dueTime}` : '');
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    requestNotificationPermission();
    try {
      const unsub = dbHelpers.subscribeToAllReminders((fetched) => {
        setReminders(fetched as Reminder[]);
        setIsLoading(false);
        // Schedule browser notifications for active reminders
        const active = fetched.filter((r: any) => !r.dismissed);
        scheduleReminders(active);
      });
      return () => unsub();
    } catch { setIsLoading(false); }
  }, []);

  const upcoming  = reminders.filter(r => !r.dismissed);
  const dismissed = reminders.filter(r => r.dismissed);

  const displayed = activeTab === 'upcoming' ? upcoming : dismissed;

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try { await dbHelpers.dismissReminder(id); } catch (err: any) { alert('Failed to mark done: ' + err.message); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try { await dbHelpers.deleteReminder(id); } catch (err: any) { alert('Failed to delete: ' + err.message); }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black">Reminders</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">{upcoming.length} active reminder{upcoming.length !== 1 ? 's' : ''}</p>
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
        {(['upcoming', 'completed'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === tab ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1.5 text-[10px] opacity-70">({(tab === 'upcoming' ? upcoming : dismissed).length})</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2.5">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-[var(--color-text-muted)]">
            <Bell size={36} className="mb-3 opacity-30" />
            <p className="font-semibold">{activeTab === 'upcoming' ? 'No reminders set' : 'No completed reminders'}</p>
            {activeTab === 'upcoming' && <p className="text-xs mt-1 text-[var(--color-text-subtle)]">Tap + to add your first reminder</p>}
          </div>
        ) : (
          displayed.map(r => {
            const days = daysFromNow(r.dueDate);
            const isOverdue = days < 0;
            return (
              <Card key={r.id} className={`group ${isOverdue && !r.dismissed ? 'border-rose-500/30 bg-rose-500/5' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${r.dismissed ? 'bg-emerald-500/10' : isOverdue ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
                    {r.dismissed ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Bell size={18} className={isOverdue ? 'text-rose-400' : 'text-amber-400'} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${r.dismissed ? 'line-through text-[var(--color-text-muted)]' : ''}`}>{r.title}</p>
                    {r.description && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{r.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`flex items-center gap-1 text-[10px] font-semibold ${isOverdue && !r.dismissed ? 'text-rose-400' : 'text-[var(--color-text-muted)]'}`}>
                        <Clock size={9} /> {formatDue(r)}
                      </span>
                      {r.repeat && r.repeat !== 'none' && (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold">
                          <RefreshCw size={9} /> {r.repeat}
                        </span>
                      )}
                      {r.calendarEventId && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <Calendar size={9} /> Synced
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 relative">
                    {!r.dismissed && (
                      <button onClick={(e) => handleDismiss(r.id, e)} className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors pointer-events-auto" title="Mark done">
                        <CheckCircle2 size={13} />
                      </button>
                    )}
                    <button onClick={(e) => handleDelete(r.id, e)} className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-colors pointer-events-auto" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {activeTab === 'upcoming' && (
        <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all press-effect">
          <Plus size={18} /><span className="font-semibold text-sm">Set a reminder</span>
        </button>
      )}

      {showAddModal && <AddReminderModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
