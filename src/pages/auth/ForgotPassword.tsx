import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { KeyRound, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col justify-center px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 animate-blob" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 animate-blob" style={{ animationDelay: '-4s' }} />

      <div className="w-full max-w-sm mx-auto z-10 relative animate-fade-in">
        <Link to="/login" className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-white transition-colors mb-8 w-fit group">
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Login
        </Link>

        {success ? (
          <div className="flex flex-col items-center text-center gap-5 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black mb-2">Check your inbox</h1>
              <p className="text-[var(--color-text-muted)] text-sm">We sent a reset link to <span className="text-white font-medium">{email}</span></p>
            </div>
            <Link to="/login" className="w-full">
              <Button fullWidth size="lg">Back to Login</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                <KeyRound size={28} className="text-white" />
              </div>
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <Sparkles size={13} className="text-[var(--color-primary)]" />
                <span className="text-xs font-bold gradient-text tracking-widest uppercase">Nexa</span>
              </div>
              <h1 className="text-2xl font-black mb-1">Reset Password</h1>
              <p className="text-[var(--color-text-muted)] text-sm">Enter your email to receive a secure reset link</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm flex items-start gap-2 animate-fade-in">
                  <span className="shrink-0">⚠️</span><span>{error}</span>
                </div>
              )}
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" fullWidth isLoading={isLoading} size="lg">
                Send Reset Link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
