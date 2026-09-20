import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useCallback } from 'react';

// Eagerly load auth + layout (needed on first paint)
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import PinLock from './components/PinLock';
import { useAuthStore } from './store/authStore';
import { usePinStore } from './store/pinStore';

// Lazy-load every page — each becomes its own chunk (~80 kB each vs 1.38 MB all-at-once)
const Dashboard  = lazy(() => import('./pages/Dashboard'));
const Goals      = lazy(() => import('./pages/Goals'));
const Tasks      = lazy(() => import('./pages/Tasks'));
const Budget     = lazy(() => import('./pages/Budget'));
const Learning   = lazy(() => import('./pages/Learning'));
const Workouts   = lazy(() => import('./pages/Workouts'));
const Settings   = lazy(() => import('./pages/Settings'));
const FocusMode  = lazy(() => import('./pages/FocusMode'));
const Reminders  = lazy(() => import('./pages/Reminders'));
const AIInsights = lazy(() => import('./pages/AIInsights'));

/** Minimal skeleton shown while a lazy page chunk loads */
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 animate-fade-in">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin-slow" />
    </div>
  );
}

/** Wraps protected content — shows PIN lock overlay when locked */
function PinLockWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const { pinHash, isLocked, updateLastActive, checkAutoLock } = usePinStore();

  const handleActivity = useCallback(() => {
    updateLastActive();
  }, [updateLastActive]);

  useEffect(() => {
    const handleVisibility = () => checkAutoLock();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointermove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [handleActivity, checkAutoLock]);

  useEffect(() => {
    const interval = setInterval(() => checkAutoLock(), 30_000);
    return () => clearInterval(interval);
  }, [checkAutoLock]);

  useEffect(() => {
    if (isAuthenticated && pinHash) checkAutoLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isAuthenticated && pinHash && isLocked) return <PinLock />;
  return <>{children}</>;
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <PinLockWrapper>
      <Routes>
        {/* Public */}
        <Route path="/login"           element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register"        element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />} />

        {/* Protected — all pages wrapped in Suspense for lazy loading */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index            element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="goals"     element={<Suspense fallback={<PageLoader />}><Goals /></Suspense>} />
            <Route path="tasks"     element={<Suspense fallback={<PageLoader />}><Tasks /></Suspense>} />
            <Route path="budget"    element={<Suspense fallback={<PageLoader />}><Budget /></Suspense>} />
            <Route path="learning"  element={<Suspense fallback={<PageLoader />}><Learning /></Suspense>} />
            <Route path="workouts"  element={<Suspense fallback={<PageLoader />}><Workouts /></Suspense>} />
            <Route path="settings"  element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            <Route path="reminders" element={<Suspense fallback={<PageLoader />}><Reminders /></Suspense>} />
            <Route path="insights"  element={<Suspense fallback={<PageLoader />}><AIInsights /></Suspense>} />
          </Route>
          <Route path="/focus/:taskId" element={<Suspense fallback={<PageLoader />}><FocusMode /></Suspense>} />
        </Route>
      </Routes>
    </PinLockWrapper>
  );
}

export default App;
