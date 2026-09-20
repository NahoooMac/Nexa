import { useState } from 'react';
import { X, CheckSquare, Wallet, Target, Calendar, Bell } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { dbHelpers } from '../lib/db';
import { pushToGoogleCalendar } from '../lib/calendarSync';
import AddReminderModal from './AddReminderModal';

type QuickAddModalProps = { isOpen: boolean; onClose: () => void; };
type FormType = 'none' | 'task' | 'transaction' | 'goal' | 'reminder';

const categories = [
  { type: 'task' as FormType,        icon: CheckSquare, label: 'Task',        color: 'from-blue-500/20 to-indigo-500/20',    iconColor: 'text-blue-400',    border: 'border-blue-500/20' },
  { type: 'transaction' as FormType, icon: Wallet,      label: 'Transaction', color: 'from-emerald-500/20 to-teal-500/20',  iconColor: 'text-emerald-400', border: 'border-emerald-500/20' },
  { type: 'goal' as FormType,        icon: Target,      label: 'Goal',        color: 'from-purple-500/20 to-indigo-500/20', iconColor: 'text-purple-400',  border: 'border-purple-500/20' },
  { type: 'reminder' as FormType,    icon: Bell,        label: 'Reminder',    color: 'from-amber-500/20 to-orange-500/20',  iconColor: 'text-amber-400',   border: 'border-amber-500/20' },
];

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const [activeForm, setActiveForm] = useState<FormType>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('09:00');
  const [taskType, setTaskType] = useState<'general' | 'learning' | 'workout'>('general');
  const [priority, setPriority] = useState(false);
  const [syncToCalendar, setSyncToCalendar] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setActiveForm('none'); setTitle(''); setAmount(''); setType('expense');
    setDueDate(''); setDueTime('09:00'); setTaskType('general');
    setPriority(false); setSyncToCalendar(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  if (activeForm === 'reminder') {
    return <AddReminderModal onClose={handleClose} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (activeForm === 'task') {
        const taskData: any = { title, priority, type: taskType };
        if (dueDate) taskData.dueDate = dueDate;
        await dbHelpers.addTask(taskData);
        if (syncToCalendar && dueDate) {
          try {
            const eventId = await pushToGoogleCalendar({ title, dueDate, dueTime });
            await dbHelpers.updateTask((await dbHelpers.getTasks())[0]?.id, { calendarEventId: eventId });
          } catch { /* calendar errors are non-fatal */ }
        }
      } else if (activeForm === 'transaction') {
        await dbHelpers.addTransaction({ title, amount: parseFloat(amount), type, category: 'General' });
      } else if (activeForm === 'goal') {
        await dbHelpers.addGoal({ title, milestones: 5, color: 'bg-indigo-500' });
      }
      handleClose();
    } catch {
      alert('Failed to save. Make sure you are logged in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end animate-fade-in backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-[var(--color-surface)] rounded-t-3xl w-full max-w-md mx-auto animate-slide-up shadow-2xl">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--color-surface-hover)]" />
        </div>

        <div className="px-6 pb-10 pt-3">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black">
                {activeForm === 'none' ? 'Quick Add' : `New ${activeForm.charAt(0).toUpperCase() + activeForm.slice(1)}`}
              </h2>
              {activeForm === 'none' && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">What would you like to add?</p>}
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-all">
              <X size={18} />
            </button>
          </div>

          {activeForm === 'none' ? (
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => (
                <button
                  key={cat.type}
                  onClick={() => setActiveForm(cat.type)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-br ${cat.color} border ${cat.border} hover:scale-105 transition-all press-effect`}
                >
                  <cat.icon size={26} className={cat.iconColor} />
                  <span className="text-sm font-semibold">{cat.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
              <Input
                label="Title"
                placeholder={
                  activeForm === 'task' ? 'Buy groceries…'
                  : activeForm === 'goal' ? 'Learn Spanish…'
                  : 'Salary…'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              {/* TASK fields */}
              {activeForm === 'task' && (
                <>
                  <Input label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  <div>
                    <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Task Type</label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as any)}
                      className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                    >
                      <option value="general">General Task</option>
                      <option value="learning">Learning / Course</option>
                      <option value="workout">Workout / Fitness</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} className="w-4 h-4 rounded accent-rose-500" />
                    <span className="text-sm text-rose-400 font-semibold">Mark as Priority 🔴</span>
                  </label>
                  {dueDate && (
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={syncToCalendar} onChange={(e) => setSyncToCalendar(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-[var(--color-text-muted)]" />
                        <span className="text-sm text-[var(--color-text-muted)]">Sync to Google Calendar</span>
                      </div>
                    </label>
                  )}
                </>
              )}

              {/* TRANSACTION fields */}
              {activeForm === 'transaction' && (
                <>
                  <Input label="Amount" type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setType('expense')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${type === 'expense' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                      Expense
                    </button>
                    <button type="button" onClick={() => setType('income')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                      Income
                    </button>
                  </div>
                </>
              )}



              <div className="flex gap-3 mt-2">
                <Button type="button" variant="secondary" onClick={() => setActiveForm('none')} className="flex-1">Back</Button>
                <Button type="submit" className="flex-1" isLoading={isLoading}>Save</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
