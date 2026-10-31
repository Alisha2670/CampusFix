import React, { useState, useEffect } from 'react';
import { AdminApi } from '../../api/admin.api.js';
import { IComplaint, Category, Priority, ComplaintStatus, IUser } from '../../types/index.js';
import { Navbar } from '../../components/common/Navbar.js';
import { StatusTimeline } from '../../components/complaints/StatusTimeline.js';
import {
  Search,
  Filter,
  RefreshCw,
  Building,
  Calendar,
  AlertCircle,
  Loader2,
  Inbox,
  User,
  ExternalLink,
  X,
  Sparkles,
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

const CATEGORIES: Category[] = [
  'Electrical',
  'Plumbing',
  'IT Support',
  'Housekeeping',
  'Infrastructure',
];

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

const STATUSES: { label: string; value: string }[] = [
  { label: 'All Issues', value: 'all' },
  { label: 'Awaiting Triage', value: 'Submitted' },
  { label: 'Acknowledged', value: 'Acknowledged' },
  { label: 'Assigned', value: 'Assigned' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Duplicate', value: 'Duplicate' },
  { label: 'Rejected', value: 'Rejected' },
];

export const AdminDashboardPage: React.FC = () => {
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Detail Review
  const [selectedComplaint, setSelectedComplaint] = useState<IComplaint | null>(null);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminApi.getAllComplaints({
        status: statusFilter,
        category: categoryFilter,
        priority: priorityFilter,
        search: searchQuery.trim() || undefined,
        page,
        limit: 10,
      });

      setComplaints(data.complaints);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.customMessage || 'Failed to fetch complaints list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter, priorityFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status: ComplaintStatus) => {
    switch (status) {
      case 'Submitted':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Acknowledged':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Assigned':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'In Progress':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Duplicate':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Administrator Triage Cockpit
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-brand-50 text-brand-700 border border-brand-200">
                Staff Portal
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Review, prioritize, dispatch, and track campus maintenance complaints.
            </p>
          </div>

          <button
            onClick={() => fetchComplaints()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Tickets
              </span>
              <ClipboardList className="w-5 h-5 text-brand-500" />
            </div>
            <span className="text-2xl font-extrabold text-slate-900">{total}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Awaiting Triage
              </span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-2xl font-extrabold text-amber-600">
              {complaints.filter((c) => c.status === 'Submitted').length}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active Repairs
              </span>
              <AlertTriangle className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-2xl font-extrabold text-blue-600">
              {complaints.filter((c) => c.status === 'In Progress' || c.status === 'Assigned').length}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Resolved
              </span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-2xl font-extrabold text-emerald-600">
              {complaints.filter((c) => c.status === 'Resolved').length}
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search ticket ID or problem summary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-20 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold"
              >
                Search
              </button>
            </form>

            {/* Category and Priority Selectors */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="all">All Priorities</option>
                {PRIORITIES.map((pri) => (
                  <option key={pri} value={pri}>
                    {pri}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Tabs Bar */}
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
            {STATUSES.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === tab.value
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Complaints Triage Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading complaints feed...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p className="font-semibold text-sm">{error}</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-bold text-slate-800 mb-1">No complaints match criteria</p>
              <p className="text-xs text-slate-500">Try adjusting your status or category filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Ticket</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Problem Summary</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Priority / Category</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {complaints.map((c) => {
                    const student = c.studentId as IUser;
                    return (
                      <tr key={c.id || c.complaintId} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100 block w-max">
                            {c.complaintId}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 block text-xs">
                            {student?.name || 'Student'}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate max-w-[160px]">
                            {student?.email || 'N/A'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <span className="font-semibold text-slate-900 block truncate">
                            {c.title}
                          </span>
                          <span className="text-xs text-slate-500 line-clamp-1">
                            {c.description}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          <span className="font-medium text-slate-800 block">
                            {c.location.building}
                          </span>
                          <span className="text-slate-500">
                            Fl. {c.location.floor} • Rm. {c.location.room}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-bold border mb-1 ${getPriorityBadgeClass(
                              c.priority
                            )}`}
                          >
                            {c.priority}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 block">
                            {c.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getStatusBadgeClass(
                              c.status
                            )}`}
                          >
                            {c.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedComplaint(c)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-700 rounded-lg text-xs font-semibold transition"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="py-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>
                Page <strong className="text-slate-900">{page}</strong> of{' '}
                <strong className="text-slate-900">{totalPages}</strong> ({total} total tickets)
              </span>

              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 font-semibold"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-40 font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Complaint Detail Review Modal */}
        {selectedComplaint && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedComplaint(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedComplaint(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-sm font-bold bg-brand-50 text-brand-600 px-3 py-1 rounded-md border border-brand-100">
                  {selectedComplaint.complaintId}
                </span>
                <span
                  className={`text-xs px-3 py-0.5 rounded-full font-bold uppercase border ${getStatusBadgeClass(
                    selectedComplaint.status
                  )}`}
                >
                  {selectedComplaint.status}
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedComplaint.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                {selectedComplaint.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-6">
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Location:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedComplaint.location.building} • Floor {selectedComplaint.location.floor}{' '}
                    • Room {selectedComplaint.location.room}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Student Reporter:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {(selectedComplaint.studentId as IUser)?.name || 'Student'} (
                    {(selectedComplaint.studentId as IUser)?.email})
                  </span>
                </div>
              </div>

              {/* Photo Preview */}
              {selectedComplaint.imageUrl && (
                <div className="mb-6">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Attached Photo (Cloudinary CDN):
                  </span>
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-60 bg-slate-100 flex items-center justify-center">
                    <img
                      src={selectedComplaint.imageUrl}
                      alt="Complaint attachment"
                      className="max-h-60 w-auto object-contain"
                    />
                  </div>
                </div>
              )}

              {/* AI Enrichment Status */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    AI Triage Insights (SentenceTransformers & Fast ML):
                  </span>
                </div>
                <div className="text-xs text-purple-800 space-y-1">
                  <p>
                    <strong>Status:</strong>{' '}
                    <span className="font-semibold">{selectedComplaint.aiAnalysis?.status}</span>
                  </p>
                  <p>
                    <strong>Suggested Category:</strong>{' '}
                    {selectedComplaint.aiAnalysis?.suggestedCategory || 'Pending analysis'}
                  </p>
                  <p>
                    <strong>Suggested Urgency:</strong>{' '}
                    {selectedComplaint.aiAnalysis?.suggestedPriority || 'Standard'}
                  </p>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                  Progress Lifecycle:
                </span>
                <StatusTimeline currentStatus={selectedComplaint.status} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

