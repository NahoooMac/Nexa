import { useState, useEffect } from 'react';
import { usePinStore } from '../store/pinStore';
import { useAuthStore } from '../store/authStore';
import { Delete } from 'lucide-react';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function PinLock() {
  const { verifyPin, unlock } = usePinStore();
  const { logout } = useAuthStore();
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (input.length === 4) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const handleVerify = async () => {
    const ok = await verifyPin(input);
    if (ok) {
      unlock();
    } else {
      setShake(true);
      setError('Incorrect PIN');
      setAttempts((a) => a + 1);
      setInput('');
      setTimeout(() => {
        setShake(false);
        setError('');
      }, 700);
    }
  };

  const handleDigit = (d: string) => {
    if (d === '⌫') {
      setInput((prev) => prev.slice(0, -1));
      return;
    }
    if (d === '') return;
    if (input.length < 4) setInput((prev) => prev + d);
  };

  const handleSignOut = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[var(--color-background)] flex flex-col items-center justify-center px-6">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-10 relative z-10">
        <img src="/main logo.png" alt="Nexa" className="h-16 drop-shadow-xl" />
        <p className="text-sm text-[var(--color-text-muted)]">Enter your PIN to continue</p>
      </div>

      {/* PIN dots */}
      <div
        className={`flex gap-4 mb-4 relative z-10 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
        style={shake ? { animation: 'pinShake 0.5s ease-in-out' } : {}}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              input.length > i
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] scale-110 shadow-lg shadow-indigo-500/50'
                : 'bg-transparent border-[var(--color-surface-hover)]'
            }`}
          />
        ))}
      </div>

      {/* Error */}
      <div className="h-6 mb-6 flex items-center relative z-10">
        {error && (
          <p className="text-rose-400 text-sm font-semibold animate-fade-in">{error}</p>
        )}
        {attempts >= 5 && !error && (
          <p className="text-amber-400 text-xs text-center animate-fade-in">
            Too many attempts. Forgot your PIN?
          </p>
        )}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-4 relative z-10 w-full max-w-[280px]">
        {DIGITS.map((digit, idx) => {
          if (digit === '') return <div key={idx} />;
          if (digit === '⌫') {
            return (
              <button
                key={idx}
                onClick={() => handleDigit('⌫')}
                className="h-16 rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text-muted)] flex items-center justify-center hover:bg-[var(--color-surface-hover)] active:scale-95 transition-all"
                aria-label="Delete"
              >
                <Delete size={20} />
              </button>
            );
          }
          return (
            <button
              key={idx}
              onClick={() => handleDigit(digit)}
              className="h-16 rounded-2xl bg-[var(--color-surface-2)] text-white text-2xl font-bold flex items-center justify-center hover:bg-[var(--color-surface-hover)] active:scale-95 active:bg-indigo-500/20 transition-all shadow-sm"
            >
              {digit}
            </button>
          );
        })}
      </div>

      {/* Sign out escape hatch */}
      <button
        onClick={handleSignOut}
        className="mt-10 text-xs text-[var(--color-text-muted)] hover:text-rose-400 transition-colors underline underline-offset-2 relative z-10"
      >
        Forgot PIN? Sign out
      </button>

      <style>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-8px); }
          30%       { transform: translateX(8px); }
          45%       { transform: translateX(-6px); }
          60%       { transform: translateX(6px); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
