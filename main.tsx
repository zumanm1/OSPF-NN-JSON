import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { RegisterPage } from './components/RegisterPage.tsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import './index.css';
import { LogOut, User as UserIcon, AlertTriangle, RefreshCw } from 'lucide-react';

function AuthenticatedApp() {
  const { user, isLoading, isAuthenticated, logout, backendAvailable, backendError, checkBackendHealth } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isRetrying, setIsRetrying] = useState(false);

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
              💡 Troubleshooting Steps:
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

  // If in demo mode, show app without authentication
  if (demoMode) {
    return (
      <div className="relative">
        {/* Demo Mode Banner */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Demo Mode</span>
              <span className="text-sm opacity-90">
                - Register to save your work and access all features
              </span>
            </div>
            <button
              onClick={() => setDemoMode(false)}
              className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Login / Register
            </button>
          </div>
        </div>
        <div className="pt-12">
          <App />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative">
        {authMode === 'login' ? (
          <LoginPage onSwitchToRegister={() => setAuthMode('register')} />
        ) : (
          <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />
        )}
        
        {/* Demo Mode Button - Positioned at bottom of auth pages */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => setDemoMode(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-full shadow-2xl transition-all hover:shadow-purple-500/50 hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Try Demo Mode (No Sign-up Required)
          </button>
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
              <div className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</div>
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
