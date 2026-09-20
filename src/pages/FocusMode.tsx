import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbHelpers } from '../lib/db';
import { sendBrowserNotification, requestNotificationPermission } from '../lib/notifications';
import { Play, Pause, Square, ArrowLeft, CheckCircle2, Timer } from 'lucide-react';

const DEFAULT_MINUTES = 25;

export default function FocusMode() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Request notification permission up-front so the alert fires when timer ends
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!taskId) return;
    const unsub = dbHelpers.subscribeToTasks((tasks) => {
      const found = tasks.find(t => t.id === taskId);
      if (found) setTask(found);
    });
    return () => unsub();
  }, [taskId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setIsCompleted(true);
      // Mark task complete
      if (taskId) dbHelpers.toggleTaskStatus(taskId, false);
      // Fire browser notification + vibrate
      sendBrowserNotification(
        '🎉 Focus Session Complete!',
        `You finished: ${task?.title ?? 'your task'}. Great work!`
      );
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft, taskId, task]);

  const finishEarly = () => {
    setIsActive(false);
    setIsCompleted(true);
    if (taskId) dbHelpers.toggleTaskStatus(taskId, false);
    sendBrowserNotification(
      '✅ Task Completed!',
      `You finished: ${task?.title ?? 'your task'}. Well done!`
    );
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const progress = timeLeft / (DEFAULT_MINUTES * 60);
  const r = 100;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * progress;

  if (!task) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-background)]">
      <div className="w-10 h-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin-slow" />
    </div>
  );

  return (
    <div className="h-screen w-screen bg-[var(--color-background)] flex flex-col fixed inset-0 z-[100] overflow-hidden">
      {/* Ambient glow */}
      {isActive && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-purple-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        </>
      )}

      {/* Back button */}
      <div className="px-5 pt-6 pb-2 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-muted)] hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        {isCompleted ? (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="w-28 h-28 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 size={56} className="text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black mb-2">Session Complete!</h1>
            <p className="text-[var(--color-text-muted)] text-center mb-2">You crushed it! 🎉</p>
            <p className="text-sm text-[var(--color-text-subtle)] mb-10">Finished: {task.title}</p>
            <button
              onClick={() => navigate('/tasks')}
              className="px-10 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 hover:scale-105 transition-transform active:scale-95 text-lg"
            >
              Back to Tasks
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Timer size={14} className="text-[var(--color-text-muted)]" />
              <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Focus Session</span>
            </div>
            <h1 className="text-xl font-black text-center mb-12 max-w-[280px] leading-tight">{task.title}</h1>

            {/* Timer ring */}
            <div className="relative w-64 h-64 mb-12">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 220 220">
                <defs>
                  <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <circle cx="110" cy="110" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="8" />
                <circle
                  cx="110" cy="110" r={r} fill="none"
                  stroke="url(#timerGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black font-mono tracking-tighter">{formatTime(timeLeft)}</span>
                <span className="text-xs text-[var(--color-text-muted)] mt-1">{isActive ? 'Focus...' : 'Ready'}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => { setIsActive(false); setTimeLeft(DEFAULT_MINUTES * 60); }}
                className="w-12 h-12 rounded-full bg-[var(--color-surface-2)] hover:bg-rose-500/20 text-[var(--color-text-muted)] hover:text-rose-400 flex items-center justify-center transition-all"
                title="Reset"
              >
                <Square size={16} fill="currentColor" />
              </button>
              <button
                onClick={() => setIsActive(!isActive)}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95"
                title={isActive ? 'Pause' : 'Start'}
              >
                {isActive ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
              </button>
              <button
                onClick={finishEarly}
                className="w-12 h-12 rounded-full bg-[var(--color-surface-2)] hover:bg-emerald-500/20 text-[var(--color-text-muted)] hover:text-emerald-400 flex items-center justify-center transition-all"
                title="Complete task"
              >
                <CheckCircle2 size={22} />
              </button>
            </div>

            <p className="mt-8 text-xs text-[var(--color-text-subtle)] text-center max-w-[220px] leading-relaxed">
              Stay focused. You'll get a notification when the session ends.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
