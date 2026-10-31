import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ComplaintApi } from '../api/complaint.api.js';
import { IComplaint, ComplaintStatus } from '../types/index.js';
import { Navbar } from '../components/common/Navbar.js';
import { StatusTimeline } from '../components/complaints/StatusTimeline.js';
import {
  PlusCircle,
  Search,
  Building,
  Calendar,
  AlertCircle,
  Loader2,
  Inbox,
  ExternalLink,
  X,
  Sparkles,
} from 'lucide-react';

export const MyComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<IComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ComplaintApi.getMyComplaints(1, 50);
      setComplaints(data.complaints);
    } catch (err: any) {
      setError(err.customMessage || 'Failed to load your complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      c.complaintId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.building.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
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

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              My Reported Issues
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track real-time progress and maintenance status for your campus tickets.
            </p>
          </div>
          <Link
            to="/submit"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report New Issue</span>
          </Link>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by ticket ID or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {['all', 'Submitted', 'In Progress', 'Resolved'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  statusFilter === tab
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* State Handling: Loading, Error, Empty, List */}
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading your complaints...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p className="font-semibold text-base mb-1">Unable to load complaints</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchComplaints}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">No complaints found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              {complaints.length === 0
                ? "You haven't submitted any complaints yet. Notice something broken on campus?"
                : "No complaints match your current search or filter."}
            </p>
            {complaints.length === 0 && (
              <Link
                to="/submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit Your First Issue</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredComplaints.map((complaint) => (
              <div
                key={complaint.id || complaint.complaintId}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition hover:shadow-md"
              >
                {/* Top Bar: ID, Badges, Date */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold bg-brand-50 text-brand-600 px-2.5 py-1 rounded-md border border-brand-100">
                      {complaint.complaintId}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getPriorityBadgeClass(
                        complaint.priority
                      )}`}
                    >
                      {complaint.priority} Priority
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                      {complaint.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${getStatusBadgeClass(
                        complaint.status
                      )}`}
                    >
                      {complaint.status}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(complaint.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="py-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{complaint.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {complaint.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {complaint.location.building} • Floor {complaint.location.floor} • Room{' '}
                      {complaint.location.room}
                    </span>

                    {complaint.assignedDepartment && (
                      <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 font-medium">
                        Assigned: {complaint.assignedDepartment}
                      </span>
                    )}

                    {complaint.aiAnalysis?.status === 'Completed' && (
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-purple-100">
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        AI Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Attached Photo Thumbnail */}
                {complaint.imageUrl && (
                  <div className="mb-4">
                    <span className="text-xs font-semibold text-slate-500 block mb-1.5">
                      Attached Photo:
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewImage(complaint.imageUrl)}
                      className="relative rounded-xl overflow-hidden border border-slate-200 w-32 h-20 bg-slate-100 group block focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <img
                        src={complaint.imageUrl}
                        alt="Complaint Attachment"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Progress Timeline */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
                    Resolution Timeline:
                  </span>
                  <StatusTimeline currentStatus={complaint.status} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewImage}
                alt="Enlarged Attachment"
                className="max-h-[80vh] w-auto object-contain"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

