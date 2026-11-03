import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AuthApi } from '../../api/auth.api.js';
import { useAuth } from '../../context/AuthContext.js';
import { Lock, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Password recovery token is missing from the link. Please request a new link.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    try {
      setLoading(true);
      await AuthApi.resetPassword(token, password);
      setSuccess(true);
      await refreshUser();
      setTimeout(() => {
        navigate('/');
      }, 2500);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.customMessage ||
        'Password reset failed. The link may have expired or already been used.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Invalid Reset Link</h1>
          <p className="text-sm text-slate-500 mb-6">
            This password recovery link is missing a required security token or is malformed.
          </p>
          <Link
            to="/forgot-password"
            className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition inline-flex items-center justify-center gap-2 text-sm"
          >
            <span>Request New Reset Link</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-md shadow-brand-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create a new strong password for your campus account.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 mb-1">Password Successfully Updated!</p>
              <p className="text-emerald-700">
                Your credentials have been securely updated. You are now logged in and being redirected to your dashboard...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters (letters & numbers)"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-medium text-slate-700">Password requirements:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li className={password.length >= 8 ? 'text-emerald-600 font-medium' : ''}>
                  Minimum 8 characters
                </li>
                <li className={/[a-zA-Z]/.test(password) && /[0-9]/.test(password) ? 'text-emerald-600 font-medium' : ''}>
                  Contains both letters and numbers
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Update Password & Sign In</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-sm text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancel and return to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

