import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export type User = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  googleAccessToken: string | null;
  setGoogleAccessToken: (token: string | null) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,
      googleAccessToken: null,
      setGoogleAccessToken: (token) => set({ googleAccessToken: token }),
      logout: async () => {
        await signOut(auth);
        set({ user: null, isAuthenticated: false, googleAccessToken: null });
      },
    }),
    {
      name: 'nexa-auth',
      storage: createJSONStorage(() => localStorage),
      // Only cache the serialisable data — functions are re-created each time
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        googleAccessToken: state.googleAccessToken,
      }),
    }
  )
);

// Boot-time: Listen for Firebase auth state changes.
// Placed OUTSIDE of the store creator so it does not run before React renders.
onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
  if (firebaseUser) {
    useAuthStore.setState({
      user: {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || undefined,
      },
      isAuthenticated: true,
      isInitialized: true,
    });
  } else {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      googleAccessToken: null,
    });
  }
});
