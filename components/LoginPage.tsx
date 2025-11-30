import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, AlertCircle, Eye, EyeOff, LogIn, Network, Zap, Shield, Activity } from 'lucide-react';

interface LoginPageProps {
  onSwitchToRegister?: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo and Title Section */}
          <div className="text-center mb-8 space-y-6">
            {/* Animated Logo */}
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
              <div className="relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl ring-4 ring-blue-500/30 transform hover:scale-105 transition-transform duration-300">
                <Network className="w-12 h-12 text-white animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                OSPF Visualizer Pro
              </h1>
              <p className="text-slate-400 text-lg">
                Network Topology Analysis Platform
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-medium">
                <Zap className="w-3 h-3" />
                <span>Real-time Analysis</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-medium">
                <Activity className="w-3 h-3" />
                <span>100+ Nodes</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-medium">
                <Shield className="w-3 h-3" />
                <span>Secure</span>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <div className="relative group">
            {/* Card Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>

            {/* Card Content */}
            <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/50 overflow-hidden">
              {/* Top Accent Bar */}
              <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-shake">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-300">Authentication Failed</p>
                        <p className="text-xs text-red-400 mt-1">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Username/Email Field */}
                  <div className="space-y-2">
                    <label htmlFor="identifier" className="block text-sm font-semibold text-slate-300">
                      Username or Email
                    </label>
                    <div className="relative group/input">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-xl blur opacity-0 group-hover/input:opacity-100 transition-opacity"></div>
                      <div className="relative flex items-center">
                        <User className="absolute left-4 w-5 h-5 text-slate-500 group-hover/input:text-blue-400 transition-colors" />
                        <input
                          id="identifier"
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-500 transition-all duration-200 outline-none"
                          placeholder="Enter your username or email"
                          required
                          autoComplete="username"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-semibold text-slate-300">
                      Password
                    </label>
                    <div className="relative group/input">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-xl blur opacity-0 group-hover/input:opacity-100 transition-opacity"></div>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-4 w-5 h-5 text-slate-500 group-hover/input:text-blue-400 transition-colors" />
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-3.5 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-slate-500 transition-all duration-200 outline-none"
                          placeholder="Enter your password"
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 text-slate-500 hover:text-blue-400 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative w-full group/btn overflow-hidden"
                  >
                    {/* Button Glow */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-50 group-hover/btn:opacity-75 transition duration-300"></div>

                    {/* Button Content */}
                    <div className="relative flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          <span>Sign In</span>
                        </>
                      )}
                    </div>
                  </button>
                </form>

                {/* Security Notice */}
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Secured with enterprise-grade encryption</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-sm text-slate-500">
              OSPF Network Topology Visualization & Analysis Platform
            </p>
            <p className="text-xs text-slate-600">
              © 2025 OSPF Visualizer Pro. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default LoginPage;
