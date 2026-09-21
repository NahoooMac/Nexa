import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';


export default function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAuthStore();

  // While Firebase is initializing, show a centered loading spinner
  // This prevents the flicker where unauthenticated users briefly see the login page
  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--color-background)]">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30">
            <img src="/favicon.png" className="w-[30px] h-[30px] object-contain" alt="sparkle" />
          </div>
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin-slow" />
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
