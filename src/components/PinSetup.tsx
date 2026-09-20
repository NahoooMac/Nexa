import { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePinStore } from '../store/pinStore';
import { Lock, X, Delete, Shield, CheckCircle2 } from 'lucide-react';

type Step = 'enter' | 'confirm' | 'success';

interface PinSetupProps {
  mode: 'set' | 'change' | 'disable';
  onClose: () => void;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function PinPad({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const handleDigit = (d: string) => {
    if (d === '⌫') { onChange(value.slice(0, -1)); return; }
    if (d === '') return;
    if (value.length < 4) onChange(value + d);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm text-[var(--color-text-muted)]">{placeholder}</p>
      {/* Dots */}
      <div className="flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              value.length > i
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] scale-110'
                : 'bg-transparent border-[var(--color-surface-hover)]'
            }`}
          />
        ))}
      </div>
      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
        {DIGITS.map((digit, idx) => {
          if (digit === '') return <div key={idx} />;
          if (digit === '⌫') {
            return (
              <button key={idx} onClick={() => handleDigit('⌫')}
                className="h-14 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text-muted)] flex items-center justify-center hover:bg-[var(--color-surface-hover)] active:scale-95 transition-all">
                <Delete size={18} />
              </button>
            );
          }
          return (
            <button key={idx} onClick={() => handleDigit(digit)}
              className="h-14 rounded-xl bg-[var(--color-surface-2)] text-white text-xl font-bold flex items-center justify-center hover:bg-[var(--color-surface-hover)] active:scale-95 active:bg-indigo-500/20 transition-all">
              {digit}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PinSetup({ mode, onClose }: PinSetupProps) {
  const { setPin, clearPin, verifyPin } = usePinStore();
  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin_] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const triggerShake = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => { setShake(false); setError(''); }, 700);
  };

  const handleNext = async () => {
    if (mode === 'disable') {
      if (currentPin.length < 4) return;
      const ok = await verifyPin(currentPin);
      if (!ok) { setCurrentPin(''); triggerShake('Incorrect PIN'); return; }
      clearPin();
      setStep('success');
      return;
    }

    if (step === 'enter') {
      if (pin.length < 4) return;
      setStep('confirm');
    } else if (step === 'confirm') {
      if (confirmPin.length < 4) return;
      if (confirmPin !== pin) {
        setConfirmPin('');
        triggerShake('PINs do not match');
        return;
      }
      await setPin(pin);
      setStep('success');
    }
  };

  const handlePinChange = (v: string) => setPin_(v);
  const handleConfirmChange = (v: string) => setConfirmPin(v);
  const handleCurrentChange = (v: string) => setCurrentPin(v);

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center backdrop-blur-md p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--color-surface)] rounded-3xl w-full max-w-sm p-6 animate-slide-up shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Lock size={17} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="font-black text-lg">
                {mode === 'set' ? 'Set PIN' : mode === 'change' ? 'Change PIN' : 'Disable PIN'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">4-digit security code</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className={`mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm text-center ${shake ? 'animate-[pinShake_0.5s_ease-in-out]' : ''}`}>
            {error}
          </div>
        )}

        {/* Content */}
        {step === 'success' ? (
          <div className="flex flex-col items-center py-6 gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <p className="font-bold text-lg">
              {mode === 'disable' ? 'PIN Disabled' : 'PIN Set Successfully!'}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] text-center">
              {mode === 'disable' ? 'Your PIN lock has been removed.' : 'Your app is now protected.'}
            </p>
            <button onClick={onClose} className="mt-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-lg shadow-indigo-500/30">
              Done
            </button>
          </div>
        ) : mode === 'disable' ? (
          <PinPad value={currentPin} onChange={handleCurrentChange} placeholder="Enter your current PIN to disable" />
        ) : step === 'enter' ? (
          <PinPad value={pin} onChange={handlePinChange} placeholder="Choose a 4-digit PIN" />
        ) : (
          <PinPad value={confirmPin} onChange={handleConfirmChange} placeholder="Confirm your PIN" />
        )}

        {step !== 'success' && (
          <button
            onClick={handleNext}
            disabled={
              (mode === 'disable' && currentPin.length < 4) ||
              (step === 'enter' && pin.length < 4) ||
              (step === 'confirm' && confirmPin.length < 4)
            }
            className="w-full mt-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {mode === 'disable' ? 'Disable PIN' : step === 'enter' ? 'Next' : 'Confirm PIN'}
          </button>
        )}

        {/* Step indicator */}
        {mode !== 'disable' && step !== 'success' && (
          <div className="flex justify-center gap-2 mt-5">
            {['enter', 'confirm'].map((s) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all ${step === s ? 'bg-[var(--color-primary)] w-6' : 'bg-[var(--color-surface-hover)]'}`} />
            ))}
          </div>
        )}

        {/* Security note */}
        {step !== 'success' && (
          <div className="mt-4 flex items-center gap-2 text-[10px] text-[var(--color-text-subtle)] justify-center">
            <Shield size={10} />
            PIN is stored securely on this device only
          </div>
        )}
      </div>

      <style>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>,
    document.body
  );
}
