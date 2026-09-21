import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, getFirebaseErrorMessage } from '../../lib/firebase';
import { signInWithGoogle } from '../../lib/calendarSync';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Removed navigate('/') — App.tsx handles redirect automatically via Zustand state
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Calling popup synchronously without ANY awaiting before it to prevent popup blocker
    try {
      await signInWithGoogle();
      // Removed navigate('/') — App.tsx handles redirect automatically
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 animate-blob" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 animate-blob" style={{ animationDelay: '-4s' }} />
      <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-7 animate-fade-in">

          {/* Branding */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30">
                <img src="/favicon.png" className="w-7 h-7 object-contain" alt="sparkle" />
              </div>
            </div>
            <h1 className="text-3xl font-black mb-1 gradient-text">Nexa</h1>
            <p className="text-[var(--color-text-muted)] text-sm">Sign in to continue your journey</p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-start gap-2 animate-fade-in">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border border-[var(--color-border)] bg-white/5 hover:bg-white/10 transition-all font-semibold text-sm press-effect"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="animate-fade-in delay-75">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="animate-fade-in delay-150">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[var(--color-text-muted)] hover:text-white transition-colors p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>

            <div className="flex justify-end animate-fade-in delay-150">
              <Link to="/forgot-password" className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors font-medium">
                Forgot password?
              </Link>
            </div>

            <div className="animate-fade-in delay-225">
              <Button type="submit" fullWidth isLoading={isLoading} size="lg">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>

          <p className="text-center text-sm text-[var(--color-text-muted)] animate-fade-in delay-300">
            Don't have an account?{' '}
            <Link to="/register" className="text-[var(--color-primary)] font-semibold hover:text-[var(--color-primary-light)] transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
