import { useState } from 'react';
import { Card } from '../components/ui/Card';
import {
  User, Moon, Bell, LogOut, ChevronRight, Sparkles, Shield, Info,
  Calendar, Download, Lock, Timer, KeyRound, CheckCircle2, Smartphone,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePinStore } from '../store/pinStore';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { signInWithGoogle } from '../lib/calendarSync';
import { requestNotificationPermission, hasNotificationPermission, initializeFCM } from '../lib/notifications';
import PinSetup from '../components/PinSetup';

const AUTO_LOCK_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '1 min', value: 1 },
  { label: '2 min', value: 2 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '30 min', value: 30 },
];

type PinMode = 'set' | 'change' | 'disable';

export default function Settings() {
  const { user, logout, googleAccessToken } = useAuthStore();
  const { pinHash, autoLockMinutes, setAutoLockMinutes } = usePinStore();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState(hasNotificationPermission());
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [notifRequesting, setNotifRequesting] = useState(false);
  const [pinMode, setPinMode] = useState<PinMode | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [fcmLoading, setFcmLoading] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState('');

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleConnectCalendar = async () => {
    setCalendarConnecting(true);
    try {
      await signInWithGoogle();
      alert('✅ Google Calendar connected! Reminders will include phone popup notifications.');
    } catch {
      alert('Failed to connect Google Calendar. Please try again.');
    } finally {
      setCalendarConnecting(false);
    }
  };

  const handleRequestNotifications = async () => {
    setNotifRequesting(true);
    const granted = await requestNotificationPermission();
    setNotifications(granted);
    setNotifRequesting(false);
    if (!granted) alert('Notification permission was denied. Please enable it in your browser settings.');
  };

  const handleEnablePush = async () => {
    setFcmLoading(true);
    const token = await initializeFCM();
    setFcmToken(token);
    setFcmLoading(false);
    if (!token) alert('Push notifications could not be enabled. Make sure you have granted notification permission.');
  };

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      user: { name: user?.name, email: user?.email },
      note: 'Your data is stored in Firebase Firestore. This export includes account metadata only.',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexa-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    setPasswordResetSent(false);
    setPasswordResetError('');
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordResetSent(true);
      setTimeout(() => setPasswordResetSent(false), 5000);
    } catch (err: any) {
      setPasswordResetError(err.message || 'Failed to send reset email.');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-4">
      <div>
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Manage your preferences</p>
      </div>

      {/* Profile card */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 flex items-center gap-4">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-2xl object-cover shadow-xl shadow-indigo-500/30 shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-xl shadow-indigo-500/30 shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-black text-lg truncate">{user?.name || 'Nexa User'}</div>
          <div className="text-sm text-[var(--color-text-muted)] truncate">{user?.email}</div>
          <div className="flex items-center gap-1 mt-1.5">
            <Sparkles size={11} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Nexa Member</span>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <section>
        <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">Integrations</h2>
        <Card className="p-0 overflow-hidden divide-y divide-[var(--color-border)]">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Calendar size={17} className="text-blue-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Google Calendar</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {googleAccessToken ? '✅ Connected — phone reminders active' : 'Sync tasks & get phone reminders'}
                </div>
              </div>
            </div>
            <button
              onClick={handleConnectCalendar}
              disabled={calendarConnecting}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${googleAccessToken ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--color-primary)] text-white'} disabled:opacity-60`}
            >
              {calendarConnecting ? 'Connecting…' : googleAccessToken ? 'Reconnect' : 'Connect'}
            </button>
          </div>
        </Card>
      </section>

      {/* Notifications */}
      <section>
        <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">Notifications</h2>
        <Card className="p-0 overflow-hidden divide-y divide-[var(--color-border)]">
          {/* Browser notifications */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Bell size={17} className="text-amber-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Reminder Alerts</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {notifications ? "Enabled — you'll get reminders" : 'Disabled — tap to enable'}
                </div>
              </div>
            </div>
            {notifications ? (
              <div className="w-12 h-6 rounded-full relative bg-indigo-500">
                <div className="absolute top-1 right-1 bg-white w-4 h-4 rounded-full shadow" />
              </div>
            ) : (
              <button
                onClick={handleRequestNotifications}
                disabled={notifRequesting}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-primary)] text-white disabled:opacity-60"
              >
                {notifRequesting ? '…' : 'Enable'}
              </button>
            )}
          </div>

          {/* Mobile Push (FCM) */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Smartphone size={17} className="text-purple-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Mobile Push</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {fcmToken ? '✅ Push registered' : 'Background notifications'}
                </div>
              </div>
            </div>
            {fcmToken ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
            ) : (
              <button
                onClick={handleEnablePush}
                disabled={fcmLoading}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 disabled:opacity-60"
              >
                {fcmLoading ? '…' : 'Register'}
              </button>
            )}
          </div>
        </Card>
      </section>

      {/* Security — PIN Lock */}
      <section>
        <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">Security</h2>
        <Card className="p-0 overflow-hidden divide-y divide-[var(--color-border)]">
          {/* PIN toggle */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Lock size={17} className="text-rose-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">App PIN</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {pinHash ? '🔒 PIN enabled' : 'Lock app with 4-digit PIN'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pinHash && (
                <button
                  onClick={() => setPinMode('change')}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                >
                  Change
                </button>
              )}
              <button
                onClick={() => setPinMode(pinHash ? 'disable' : 'set')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  pinHash
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-[var(--color-primary)] text-white'
                }`}
              >
                {pinHash ? 'Disable' : 'Set PIN'}
              </button>
            </div>
          </div>

          {/* Auto-lock timer */}
          <div className="p-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Timer size={17} className="text-indigo-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Auto-Lock</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {!pinHash ? 'Set a PIN first' : autoLockMinutes === 0 ? 'Disabled' : `Locks after ${autoLockMinutes} min`}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
              {AUTO_LOCK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  disabled={!pinHash}
                  onClick={() => setAutoLockMinutes(opt.value)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    autoLockMinutes === opt.value
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* Preferences */}
      <section>
        <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">Preferences</h2>
        <Card className="p-0 overflow-hidden divide-y divide-[var(--color-border)]">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center"><Moon size={17} className="text-indigo-400" /></div>
              <div>
                <div className="font-semibold text-sm">Dark Mode</div>
                <div className="text-xs text-[var(--color-text-muted)]">Always on — your vibe ✨</div>
              </div>
            </div>
            <div className="w-12 h-6 rounded-full relative bg-indigo-500">
              <div className="absolute top-1 right-1 bg-white w-4 h-4 rounded-full shadow" />
            </div>
          </div>
        </Card>
      </section>

      {/* Account */}
      <section>
        <h2 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">Account</h2>
        <Card className="p-0 overflow-hidden divide-y divide-[var(--color-border)]">
          <div className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-hover)] flex items-center justify-center"><User size={17} className="text-[var(--color-text-muted)]" /></div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Email</div>
              <div className="text-xs text-[var(--color-text-muted)]">{user?.email}</div>
            </div>
          </div>

          {/* Change Password — now actually works */}
          <button
            onClick={handleChangePassword}
            className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-hover)] flex items-center justify-center">
              <KeyRound size={17} className="text-[var(--color-text-muted)]" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Change Password</div>
              {passwordResetSent && (
                <div className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1 animate-fade-in">
                  <CheckCircle2 size={10} /> Reset email sent to {user?.email}
                </div>
              )}
              {passwordResetError && (
                <div className="text-xs text-rose-400 mt-0.5 animate-fade-in">{passwordResetError}</div>
              )}
              {!passwordResetSent && !passwordResetError && (
                <div className="text-xs text-[var(--color-text-muted)]">Send password reset email</div>
              )}
            </div>
            <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
          </button>

          <button onClick={handleExportData} className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-hover)] flex items-center justify-center"><Download size={17} className="text-[var(--color-text-muted)]" /></div>
            <div className="flex-1"><div className="font-semibold text-sm">Export My Data</div><div className="text-xs text-[var(--color-text-muted)]">Download account data as JSON</div></div>
            <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
          </button>

          <button onClick={handleLogout} className="w-full p-4 flex items-center gap-3 hover:bg-rose-500/5 transition-colors text-left">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center"><LogOut size={17} className="text-rose-400" /></div>
            <div className="flex-1"><div className="font-semibold text-sm text-rose-400">Sign Out</div></div>
            <ChevronRight size={16} className="text-rose-400/50" />
          </button>
        </Card>
      </section>

      {/* App info */}
      <section>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-hover)] flex items-center justify-center"><Info size={17} className="text-[var(--color-text-muted)]" /></div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Nexa Personal OS</div>
            <div className="text-xs text-[var(--color-text-muted)]">Version 1.0.0 · Built with ❤️</div>
          </div>
          {pinHash && (
            <div className="flex items-center gap-1">
              <Shield size={12} className="text-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-semibold">Secured</span>
            </div>
          )}
        </Card>
      </section>

      {/* PIN Setup modal */}
      {pinMode && <PinSetup mode={pinMode} onClose={() => setPinMode(null)} />}
    </div>
  );
}
