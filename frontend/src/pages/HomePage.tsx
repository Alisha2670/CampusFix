import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Navbar } from '../components/common/Navbar.js';
import { PlusCircle, Search, Sparkles, Clock, CheckCircle, Flame } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl shadow-brand-500/10 mb-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold tracking-wide uppercase mb-4 backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Smart Campus Maintenance
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4">
              Fix classroom, lab, or hostel issues faster.
            </h1>
            <p className="text-brand-100 text-base sm:text-lg mb-8 leading-relaxed">
              Report campus facility problems with photos and location details. Automated AI eliminates duplicates and helps technicians resolve issues quickly.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/submit"
                className="px-6 py-3.5 bg-white text-brand-700 hover:bg-brand-50 font-bold rounded-xl shadow-md transition flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5 text-brand-500" />
                <span>Report an Issue</span>
              </Link>
              <Link
                to="/feed"
                className="px-6 py-3.5 bg-brand-700/60 hover:bg-brand-700 text-white font-semibold rounded-xl border border-white/20 transition flex items-center gap-2 backdrop-blur"
              >
                <Flame className="w-5 h-5 text-amber-300" />
                <span>Campus Feed (+1)</span>
              </Link>
              {user ? (
                <Link
                  to="/my-complaints"
                  className="px-6 py-3.5 bg-brand-700/60 hover:bg-brand-700 text-white font-semibold rounded-xl border border-white/20 transition flex items-center gap-2 backdrop-blur"
                >
                  <Search className="w-5 h-5" />
                  <span>Track My Tickets</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-3.5 bg-brand-700/60 hover:bg-brand-700 text-white font-semibold rounded-xl border border-white/20 transition flex items-center gap-2 backdrop-blur"
                >
                  <span>Sign In to Track</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 3 Step Workflow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-4">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Submit with Details</h3>
            <p className="text-slate-600 text-sm">
              Provide the exact classroom/lab number and attach a photo so the maintenance team knows what to bring.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">AI Triaging & Dedup</h3>
            <p className="text-slate-600 text-sm">
              Semantic embeddings detect if your classmates already reported the issue, preventing redundant tickets.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-4">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Live Status Updates</h3>
            <p className="text-slate-600 text-sm">
              Receive status notifications at every stage from "Acknowledged" to "Technician Dispatched" to "Resolved".
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

