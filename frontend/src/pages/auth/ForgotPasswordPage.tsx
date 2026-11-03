import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthApi } from '../../api/auth.api.js';
import { KeyRound, Mail, ArrowLeft, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    resetUrl?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await AuthApi.forgotPassword(email);
      setSuccessInfo({
        message: response.message,
        resetUrl: response.resetUrl,
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.customMessage ||
        'Failed to process password recovery. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-md shadow-amber-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Forgot Password?</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter your campus email address to receive a secure recovery link.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successInfo ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 mb-1">Reset Link Generated</p>
                <p className="text-emerald-700 leading-relaxed">{successInfo.message}</p>
                <p className="text-xs text-emerald-600 mt-2">
                  The link is valid for 15 minutes.
                </p>
              </div>
            </div>

            {successInfo.resetUrl && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-700 block mb-1">Development Shortcut:</span>
                <a
                  href={successInfo.resetUrl}
                  className="text-brand-600 font-medium hover:underline inline-flex items-center gap-1 break-all"
                >
                  <span>Click here to test reset link directly</span>
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
              </div>
            )}

            <div className="pt-2">
              <Link
                to="/login"
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Login</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Campus Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@campus.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Generate Recovery Link</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-sm text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

