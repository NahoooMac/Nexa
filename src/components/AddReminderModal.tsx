import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';
import { pushToGoogleCalendar } from '../lib/calendarSync';
import { dbHelpers } from '../lib/db';

export default function AddReminderModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('09:00');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none');
  const [syncCalendar, setSyncCalendar] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const reminderData: any = { title, dueDate, dueTime, repeat };
      if (description.trim()) reminderData.description = description.trim();
      
      if (syncCalendar) {
        try {
          const eventId = await pushToGoogleCalendar({ title, dueDate, dueTime, description });
          reminderData.calendarEventId = eventId;
        } catch (calendarError: any) { 
          alert('Calendar Sync Warning: ' + calendarError.message + '\n\nPlease check your browser console for exact API details. The reminder will still be saved to the app.'); 
        }
      }
      await dbHelpers.addReminder(reminderData);
      onClose();
    } catch (error: any) {
      alert(`Failed to add reminder: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center backdrop-blur-md p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--color-surface)] rounded-3xl w-full max-w-sm mx-auto p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <h2 className="text-xl font-black mb-5">New Reminder</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="What do you want to be reminded about?" className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Time</label>
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Repeat</label>
            <div className="flex gap-2">
              {(['none', 'daily', 'weekly'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRepeat(r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all capitalize ${repeat === r ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                  {r === 'none' ? 'Once' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={syncCalendar} onChange={e => setSyncCalendar(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-[var(--color-text-muted)]" />
              <span className="text-sm text-[var(--color-text-muted)]">Sync to Google Calendar</span>
            </div>
          </label>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-[var(--color-surface-2)] text-sm font-semibold transition-all active:scale-[0.98]">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-60 transition-all active:scale-[0.98]">
              {isLoading ? 'Saving...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
