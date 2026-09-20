import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** SHA-256 hash a string using the Web Crypto API */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

type PinState = {
  pinHash: string | null;         // SHA-256 of the 4-digit PIN, or null if no PIN set
  isLocked: boolean;              // Whether the lock screen is currently showing
  autoLockMinutes: number;        // 0 = disabled, otherwise minutes before auto-lock
  lastActiveAt: number;           // timestamp (ms) of last user activity

  // Actions
  setPin: (pin: string) => Promise<void>;
  clearPin: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
  setAutoLockMinutes: (minutes: number) => void;
  updateLastActive: () => void;
  checkAutoLock: () => void;
};

export const usePinStore = create<PinState>()(
  persist(
    (set, get) => ({
      pinHash: null,
      isLocked: false,
      autoLockMinutes: 0,
      lastActiveAt: Date.now(),

      setPin: async (pin: string) => {
        const hash = await sha256(pin);
        set({ pinHash: hash, isLocked: false });
      },

      clearPin: () => {
        set({ pinHash: null, isLocked: false });
      },

      verifyPin: async (pin: string): Promise<boolean> => {
        const { pinHash } = get();
        if (!pinHash) return true;
        const hash = await sha256(pin);
        return hash === pinHash;
      },

      lock: () => {
        const { pinHash } = get();
        if (pinHash) set({ isLocked: true });
      },

      unlock: () => {
        set({ isLocked: false, lastActiveAt: Date.now() });
      },

      setAutoLockMinutes: (minutes: number) => {
        set({ autoLockMinutes: minutes });
      },

      updateLastActive: () => {
        set({ lastActiveAt: Date.now() });
      },

      checkAutoLock: () => {
        const { pinHash, autoLockMinutes, lastActiveAt, isLocked } = get();
        if (!pinHash || !autoLockMinutes || isLocked) return;
        const elapsed = (Date.now() - lastActiveAt) / 1000 / 60;
        if (elapsed >= autoLockMinutes) {
          set({ isLocked: true });
        }
      },
    }),
    {
      name: 'nexa-pin',
      storage: createJSONStorage(() => localStorage),
      // Don't persist isLocked so app starts unlocked (PIN will be re-requested on open)
      partialize: (state) => ({
        pinHash: state.pinHash,
        autoLockMinutes: state.autoLockMinutes,
        lastActiveAt: state.lastActiveAt,
      }),
    }
  )
);
