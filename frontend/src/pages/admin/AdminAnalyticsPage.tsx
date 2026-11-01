import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Sparkles,
  RefreshCw,
  Layers,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { AnalyticsApi, IAnalyticsData } from '../../api/analytics.api.js';

export const AdminAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<IAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await AnalyticsApi.getAnalytics();
      setData(res);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Electrical':
        return { bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' };
      case 'Plumbing':
        return { bg: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' };
      case 'IT Support':
        return { bg: 'bg-purple-500', light: 'bg-purple-50 text-purple-700' };
      case 'Housekeeping':
        return { bg: 'bg-teal-500', light: 'bg-teal-50 text-teal-700' };
      case 'Infrastructure':
        return { bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' };
      default:
        return { bg: 'bg-slate-500', light: 'bg-slate-50 text-slate-700' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'High':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-slate-600 font-medium">Computing aggregation pipelines...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-200 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Analytics</h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
          >
            Retry Analytics
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalComplaints: 0,
    resolvedComplaints: 0,
    openComplaints: 0,
    resolutionRate: 0,
    urgentActive: 0,
    aiCompleted: 0,
  };

  const maxTrendCount = Math.max(...(data?.dailyTrend.map((d) => d.count) || [1]), 1);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-indigo-600" />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Facility Analytics & Metrics
              </h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Live campus facility intake volume, resolution rate, department capacity, and AI insights.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Top 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Complaints */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Complaints
                </p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">
                  {summary.totalComplaints}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
              <span className="font-semibold text-amber-600">{summary.openComplaints} Active</span>
              <span>·</span>
              <span className="font-semibold text-emerald-600">{summary.resolvedComplaints} Resolved</span>
            </div>
          </div>

          {/* Resolution Rate */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Resolution Rate
                </p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">
                  {summary.resolutionRate}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${summary.resolutionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Average Resolution Time */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Avg Resolution Time
                </p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">
                  {data?.avgResolutionHours || 0}{' '}
                  <span className="text-base font-medium text-slate-500">hrs</span>
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Calculated across all resolved campus tickets
            </p>
          </div>

          {/* Urgent Active Alerts */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Active Urgent Tickets
                </p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">
                  {summary.urgentActive}
                </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${summary.urgentActive > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              {summary.urgentActive > 0 ? (
                <span className="text-red-600 font-medium">Immediate triage required</span>
              ) : (
                <span className="text-emerald-600 font-medium">No critical hazards pending</span>
              )}
            </p>
          </div>
        </div>

        {/* 7-Day Intake Trend Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                7-Day Complaint Inflow Trend
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily volume of new campus facility requests
              </p>
            </div>
          </div>

          {/* Responsive SVG / CSS Bar Chart */}
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-48 pt-8 px-2 border-b border-slate-200">
            {data?.dailyTrend.map((item, idx) => {
              const heightPercent = maxTrendCount > 0 ? Math.round((item.count / maxTrendCount) * 100) : 0;
              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-xs font-semibold text-slate-700 mb-1 group-hover:text-indigo-600 transition">
                    {item.count}
                  </span>
                  <div className="w-full max-w-[42px] bg-slate-100 rounded-t-lg h-full flex items-end overflow-hidden">
                    <div
                      className="w-full bg-indigo-500 group-hover:bg-indigo-600 transition-all rounded-t-lg"
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 truncate w-full text-center">
                    {item.label.split(',')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Two-Column Grid: Category & Priority Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Distribution */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-indigo-600" />
              Category Breakdown
            </h2>
            <p className="text-xs text-slate-500 mb-6">Distribution across campus facility domains</p>

            <div className="space-y-4">
              {data?.byCategory.map((cat) => {
                const colors = getCategoryColor(cat.category);
                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{cat.category}</span>
                      <span className="text-slate-500 font-semibold">
                        {cat.count} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`${colors.bg} h-2.5 rounded-full transition-all duration-500`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority & Status Lifecycle Funnel */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-indigo-600" />
                Priority & Lifecycle Funnel
              </h2>
              <p className="text-xs text-slate-500 mb-6">Urgency distribution and State Machine stages</p>

              {/* Priority Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {data?.byPriority.map((p) => (
                  <div
                    key={p.priority}
                    className={`p-3 rounded-xl border text-center ${getPriorityColor(p.priority)}`}
                  >
                    <p className="text-xs font-semibold">{p.priority}</p>
                    <p className="text-xl font-bold mt-1">{p.count}</p>
                    <p className="text-[10px] opacity-75">{p.percentage}%</p>
                  </div>
                ))}
              </div>

              {/* Status Pipeline Flow */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  State Machine Status Distribution
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data?.byStatus.map((s) => (
                    <div
                      key={s.status}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center"
                    >
                      <span className="font-medium text-slate-700">{s.status}</span>
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {s.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Department Workload Matrix */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Department Workload & Capacity
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active load vs. completed tickets per maintenance crew
              </p>
            </div>
          </div>

          {data?.departmentWorkload && data.departmentWorkload.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-semibold border-y border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Total Assigned</th>
                    <th className="py-3 px-4 text-center">Active</th>
                    <th className="py-3 px-4 text-center">Resolved</th>
                    <th className="py-3 px-4">Workload Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {data.departmentWorkload.map((dept) => {
                    const resolvedRate =
                      dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
                    return (
                      <tr key={dept.department} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-500" />
                          {dept.department}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-800">{dept.total}</td>
                        <td className="py-3.5 px-4 text-center text-amber-600 font-bold">
                          {dept.active}
                        </td>
                        <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">
                          {dept.resolved}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${resolvedRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 font-semibold">
                              {resolvedRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              No department assignments recorded yet.
            </div>
          )}
        </div>

        {/* AI Processing Footprint Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center text-amber-300">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                Intelligent Campus AI Analysis Engine Active
              </h3>
              <p className="text-indigo-200 text-xs mt-0.5">
                {summary.aiCompleted} complaints processed through SentenceTransformers (`all-MiniLM-L6-v2`) semantic duplicate detection and NLP category suggestions.
              </p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold whitespace-nowrap">
            Zero Ticket Loss Resiliency 100%
          </span>
        </div>
      </div>
    </div>
  );
};

