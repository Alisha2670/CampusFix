import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ComplaintApi } from '../api/complaint.api.js';
import { IComplaint, Category, ComplaintStatus } from '../types/index.js';
import { Navbar } from '../components/common/Navbar.js';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import {
  Flame,
  Clock,
  ThumbsUp,
  Search,
  Building,
  AlertCircle,
  Loader2,
  Inbox,
  PlusCircle,
  ExternalLink,
  X,
  Filter,
  CheckCircle2,
  Check,
} from 'lucide-react';

const CATEGORIES: Category[] = [
  'Electrical',
  'Plumbing',
  'IT Support',
  'Housekeeping',
  'Infrastructure',
];

const BUILDINGS = [
  'Academic Block A',
  'Academic Block B',
  'Science Block',
  'Engineering Wing',
  'Central Library',
  'Student Center',
  'Cafeteria / Canteen',
  'Hostel Block 1',
  'Hostel Block 2',
  'Sports Complex',
];

export const CampusFeedPage: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'mostUpvoted' | 'newest'>('mostUpvoted');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // UI state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [votingComplaintId, setVotingComplaintId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ComplaintApi.getCampusFeed({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        building: buildingFilter !== 'all' ? buildingFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort: sortOption,
        page: 1,
        limit: 50,
      });
      setComplaints(data.complaints || []);
    } catch (err: any) {
      setError(err.customMessage || 'Failed to load campus feed.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, buildingFilter, statusFilter, sortOption]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Real-Time WebSocket event synchronization
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleUpvoteEvent = (payload: { complaintId: string; upvoteCount: number }) => {
      setComplaints((prev) =>
        prev.map((item) =>
          item.complaintId === payload.complaintId || item.id === payload.complaintId
            ? { ...item, upvoteCount: payload.upvoteCount }
            : item
        )
      );
    };

    const handleStatusEvent = (payload: { complaintId: string; status: ComplaintStatus }) => {
      setComplaints((prev) =>
        prev.map((item) =>
          item.complaintId === payload.complaintId || item.id === payload.complaintId
            ? { ...item, status: payload.status }
            : item
        )
      );
    };

    socket.on('complaint:upvoted', handleUpvoteEvent);
    socket.on('complaint:status_updated', handleStatusEvent);

    return () => {
      socket.off('complaint:upvoted', handleUpvoteEvent);
      socket.off('complaint:status_updated', handleStatusEvent);
    };
  }, [socket]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleUpvote = async (complaint: IComplaint) => {
    if (user?.role !== 'student') {
      showToast('Only students can cast "Me Too" votes.');
      return;
    }

    const complaintKey = complaint.id || complaint.complaintId;
    setVotingComplaintId(complaintKey);

    // Optimistic UI update
    const previousState = {
      hasUpvoted: complaint.hasUpvoted,
      upvoteCount: complaint.upvoteCount ?? 0,
    };

    const nextHasUpvoted = !previousState.hasUpvoted;
    const nextCount = nextHasUpvoted
      ? previousState.upvoteCount + 1
      : Math.max(0, previousState.upvoteCount - 1);

    setComplaints((prev) =>
      prev.map((item) =>
        (item.id || item.complaintId) === complaintKey
          ? { ...item, hasUpvoted: nextHasUpvoted, upvoteCount: nextCount }
          : item
      )
    );

    try {
      const result = await ComplaintApi.toggleUpvote(complaintKey);
      // Sync with server authoritative count
      setComplaints((prev) =>
        prev.map((item) =>
          (item.id || item.complaintId) === complaintKey
            ? { ...item, hasUpvoted: result.hasUpvoted, upvoteCount: result.upvoteCount }
            : item
        )
      );
      showToast(
        result.hasUpvoted
          ? '👍 Upvoted! We notified administrators of increased community urgency.'
          : 'Upvote removed.'
      );
    } catch (err: any) {
      // Revert optimistic update on failure
      setComplaints((prev) =>
        prev.map((item) =>
          (item.id || item.complaintId) === complaintKey
            ? {
                ...item,
                hasUpvoted: previousState.hasUpvoted,
                upvoteCount: previousState.upvoteCount,
              }
            : item
        )
      );
      showToast(err.customMessage || 'Failed to update vote.');
    } finally {
      setVotingComplaintId(null);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.complaintId.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.location.building.toLowerCase().includes(q) ||
      c.location.room.toLowerCase().includes(q)
    );
  });

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
        return 'bg-amber-100 text-amber-800';
      case 'Acknowledged':
        return 'bg-blue-100 text-blue-800';
      case 'Assigned':
        return 'bg-indigo-100 text-indigo-800';
      case 'In Progress':
        return 'bg-cyan-100 text-cyan-800';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800';
      case 'Duplicate':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Floating Micro-Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Banner Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-brand-500" />
                <span>Campus Community Live Feed</span>
              </div>
              {connected && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-time Sync</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Community Issues & Crowdsourced Upvotes
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Browse issues reported in shared spaces. Notice a problem you also experienced? Click{' '}
              <strong className="text-slate-700">"Me Too (+1)"</strong> to escalate its priority for
              maintenance staff instead of filing duplicate tickets.
            </p>
          </div>

          <Link
            to="/submit"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition shadow-sm shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report New Issue</span>
          </Link>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-8 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search issue title, room, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Selectors: Building & Category */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="all">All Locations</option>
                {BUILDINGS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Selection & Status Filter Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {/* Status pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {[
                { label: 'Active', value: 'all' },
                { label: 'Submitted', value: 'Submitted' },
                { label: 'In Progress', value: 'In Progress' },
                { label: 'Resolved', value: 'Resolved' },
              ].map((st) => (
                <button
                  key={st.value}
                  onClick={() => setStatusFilter(st.value)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    statusFilter === st.value
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setSortOption('mostUpvoted')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  sortOption === 'mostUpvoted'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Most Upvoted</span>
              </button>
              <button
                onClick={() => setSortOption('newest')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                  sortOption === 'newest'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-brand-500" />
                <span>Newest</span>
              </button>
            </div>
          </div>
        </div>

        {/* Complaints Feed List */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Retrieving campus community issues...</p>
          </div>
        ) : error ? (
          <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center text-rose-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="font-semibold text-sm">{error}</p>
            <button
              onClick={() => fetchFeed()}
              className="mt-4 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition"
            >
              Retry
            </button>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">No community issues found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              There are currently no reported issues matching your selected filters in this area.
              If you found a broken facility, report it below!
            </p>
            <Link
              to="/submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report First Issue Here</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComplaints.map((complaint) => {
              const complaintKey = complaint.id || complaint.complaintId;
              const isVoting = votingComplaintId === complaintKey;
              const hasUpvoted = complaint.hasUpvoted ?? false;
              const voteCount = complaint.upvoteCount ?? 0;

              return (
                <div
                  key={complaintKey}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                        {complaint.complaintId}
                      </span>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${getPriorityBadgeClass(
                          complaint.priority
                        )}`}
                      >
                        {complaint.priority} Priority
                      </span>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${getStatusBadgeClass(
                          complaint.status
                        )}`}
                      >
                        {complaint.status}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {complaint.category}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      {new Date(complaint.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="py-4">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">
                      {complaint.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {complaint.description}
                    </p>

                    {/* Location and Reporter Details */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building className="w-4 h-4 text-slate-400" />
                        <span>
                          {complaint.location.building} • Floor {complaint.location.floor} • Room{' '}
                          {complaint.location.room}
                        </span>
                      </div>
                      {complaint.assignedDepartment && (
                        <div className="text-slate-500 border-l border-slate-200 pl-3">
                          Dept: <strong className="text-slate-700">{complaint.assignedDepartment}</strong>
                        </div>
                      )}
                      <div className="ml-auto text-slate-400 italic">
                        Reported by {typeof complaint.studentId === 'object' && complaint.studentId?.name ? complaint.studentId.name : 'Student'}
                      </div>
                    </div>
                  </div>

                  {/* Footer Row: Photo Preview & Upvoting Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      {complaint.imageUrl ? (
                        <button
                          onClick={() => setPreviewImage(complaint.imageUrl)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Attached Photo</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No photo attached</span>
                      )}
                    </div>

                    {/* Interactive "Me Too (+1)" Upvote Button */}
                    <button
                      onClick={() => handleToggleUpvote(complaint)}
                      disabled={isVoting || user?.role !== 'student'}
                      title={
                        user?.role !== 'student'
                          ? 'Only students can cast Me Too votes'
                          : hasUpvoted
                          ? 'Click to remove your vote'
                          : 'I also noticed this issue (+1)'
                      }
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                        hasUpvoted
                          ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                          : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 border border-slate-200'
                      } ${user?.role !== 'student' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {isVoting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : hasUpvoted ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <ThumbsUp className="w-3.5 h-3.5" />
                      )}

                      <span>
                        {hasUpvoted ? 'Upvoted' : 'Me Too'} ({voteCount})
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Image Preview Modal Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition z-10"
              title="Close image"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Issue documentation"
              className="w-full h-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

