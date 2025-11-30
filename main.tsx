import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import './index.css';
import { LogOut, User as UserIcon, AlertTriangle, RefreshCw, Shield } from 'lucide-react';

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated, logout, backendAvailable, backendError, checkBackendHealth } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  // DEBUG: Log authentication state
  console.log('🔐 AuthenticatedApp Render State:', {
    isLoading,
    isAuthenticated,
    backendAvailable,
    hasUser: !!user,
    backendError
  });

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkBackendHealth();
    setIsRetrying(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show backend error if not available
  if (!backendAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">
            Backend Server Unavailable
          </h2>

          <p className="text-slate-600 dark:text-slate-400 text-center mb-4">
            {backendError || 'Cannot connect to the backend server'}
          </p>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6 text-sm">
            <p className="font-semibold text-slate-900 dark:text-white mb-2">
              Troubleshooting Steps:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li>Make sure the backend server is running</li>
              <li>Run: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">npm run server</code></li>
              <li>Or start both: <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">npm run start:all</code></li>
              <li>Check that port 9081 is not in use</li>
              <li>Verify .env file has correct configuration</li>
            </ol>
          </div>

          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isRetrying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </>
            )}
          </button>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
            The application requires a running backend server to function.
          </p>
        </div>
      </div>
    );
  }

  // Require authentication - no demo mode
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Security Notice Banner */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm">
            <Shield className="w-4 h-4" />
            <span>OSPF Network Visualizer - Authentication Required</span>
          </div>
        </div>

        <div className="pt-12">
          <LoginPage />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* User Info Header */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm">
              <div className="font-medium text-slate-900 dark:text-white">{user?.username}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {user?.role === 'admin' ? (
                  <span className="text-amber-600 dark:text-amber-400">Administrator</span>
                ) : (
                  user?.email
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>
      <App />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  </StrictMode>,
);
