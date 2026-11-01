import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { ShieldCheck, User as UserIcon, LogOut, PlusCircle, LayoutDashboard, BarChart3 } from 'lucide-react';
import { NotificationBell } from './NotificationBell.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              FixMy<span className="text-brand-500">Campus</span>
            </span>
            <span className="block text-[10px] text-slate-500 font-medium -mt-1 tracking-wider uppercase">
              Facility Issue Management
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/submit"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 transition shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Report Issue</span>
              </Link>

              {user.role === 'admin' ? (
                <>
                  <Link
                    to="/admin"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium transition"
                  >
                    <LayoutDashboard className="w-4 h-4 text-brand-600" />
                    <span>Triage</span>
                  </Link>
                  <Link
                    to="/admin/analytics"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium transition"
                  >
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>Analytics</span>
                  </Link>
                </>
              ) : (
                <Link
                  to="/my-complaints"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium transition"
                >
                  <LayoutDashboard className="w-4 h-4 text-brand-600" />
                  <span>My Tickets</span>
                </Link>
              )}

              <NotificationBell />

              <div className="h-6 w-px bg-slate-200 mx-1" />

              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm text-slate-700">
                <UserIcon className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-800">{user.name}</span>
                <span className="text-xs uppercase px-1.5 py-0.5 rounded bg-white text-slate-600 font-bold border border-slate-200">
                  {user.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

