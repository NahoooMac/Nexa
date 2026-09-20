import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, getFirebaseErrorMessage } from '../../lib/firebase';
import { signInWithGoogle } from '../../lib/calendarSync';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords don't match!"); return; }
    setError(''); setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      navigate('/');
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally { setIsLoading(false); }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 animate-blob" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 animate-blob" style={{ animationDelay: '-4s' }} />
      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-6 animate-fade-in">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <Sparkles size={30} className="text-white" />
            </div>
            <h1 className="text-3xl font-black mb-1 gradient-text">Nexa</h1>
            <p className="text-[var(--color-text-muted)] text-sm">Create your free account today</p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex gap-2 animate-fade-in">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* Google Sign-Up */}
          <button
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border border-[var(--color-border)] bg-white/5 hover:bg-white/10 transition-all font-semibold text-sm press-effect disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin-slow" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Sign up with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="animate-fade-in delay-75">
              <Input label="Full Name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="animate-fade-in delay-150">
              <Input label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="animate-fade-in delay-225">
              <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required
                rightElement={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[var(--color-text-muted)] hover:text-white transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>
            <div className="animate-fade-in delay-300">
              <Input label="Confirm Password" type={showConfirm ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                rightElement={
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-[var(--color-text-muted)] hover:text-white transition-colors" tabIndex={-1}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </div>
            <div className="animate-fade-in delay-400">
              <Button type="submit" fullWidth isLoading={isLoading} size="lg">Create Account</Button>
            </div>
          </form>
          <p className="text-center text-sm text-[var(--color-text-muted)]">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--color-primary)] font-semibold hover:text-[var(--color-primary-light)] transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
