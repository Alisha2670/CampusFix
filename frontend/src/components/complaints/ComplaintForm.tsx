import React, { useState } from 'react';
import { ComplaintApi, CreateComplaintResponseData } from '../../api/complaint.api.js';
import { Category, Priority } from '../../types/index.js';
import {
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Layers,
  MapPin,
  Sparkles,
} from 'lucide-react';

const CATEGORIES: Category[] = [
  'Electrical',
  'Plumbing',
  'IT Support',
  'Housekeeping',
  'Infrastructure',
];

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

export const ComplaintForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('Electrical');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<CreateComplaintResponseData | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Selected image exceeds the 5MB size limit.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setError('Only JPEG, PNG, and WEBP image formats are supported.');
      return;
    }

    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters long.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters long.');
      return;
    }
    if (!building.trim() || !floor.trim() || !room.trim()) {
      setError('Please provide all location details (Building, Floor, and Room).');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append(
        'location',
        JSON.stringify({
          building: building.trim(),
          floor: floor.trim(),
          room: room.trim(),
        })
      );

      if (imageFile) {
        formData.append('image', imageFile);
      }

      const result = await ComplaintApi.create(formData);
      setSuccessData(result);
    } catch (err: any) {
      setError(err.customMessage || 'Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Electrical');
    setPriority('Medium');
    setBuilding('');
    setFloor('');
    setRoom('');
    removeImage();
    setError(null);
    setSuccessData(null);
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Complaint Submitted Successfully!</h2>
        <p className="text-slate-600 mb-6">
          Your issue has been logged into the system and dispatched for automated AI triaging and administrator review.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-left space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-sm font-medium text-slate-500">Ticket Reference ID:</span>
            <span className="text-base font-mono font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
              {successData.complaintId}
            </span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-sm font-medium text-slate-500">Initial Status:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              {successData.status}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />
              AI Enrichment:
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              {successData.aiAnalysisStatus}
            </span>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="w-full sm:w-auto px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl shadow-sm transition"
        >
          Submit Another Issue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Report a Campus Issue</h1>
        <p className="text-sm text-slate-500 mt-1">
          Provide complete issue details and location to help campus maintenance resolve it quickly.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Issue Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Issue Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Overhead projector won't turn on"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition text-sm"
          />
        </div>

        {/* Category & Priority Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition text-sm bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Urgency / Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition text-sm bg-white"
            >
              {PRIORITIES.map((pri) => (
                <option key={pri} value={pri}>
                  {pri}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Location Details (Building, Floor, Room) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Location Details <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="Building (e.g. Block A)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition"
              />
            </div>
            <div className="relative">
              <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="Floor (e.g. 2nd Floor)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition"
              />
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Room / Area (e.g. 204)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm transition"
              />
            </div>
          </div>
        </div>

        {/* Issue Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Detailed Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe symptoms, when the issue started, and any hazards..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition text-sm resize-none"
          />
          <span className="text-[11px] text-slate-400 block text-right">
            {description.length} / 2000 characters
          </span>
        </div>

        {/* Image Attachment (Cloudinary Pipeline) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Attach Photo (Optional, Max 5MB)
          </label>

          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 w-full sm:w-64 h-44 bg-slate-100 group">
              <img
                src={imagePreview}
                alt="Complaint preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-lg transition"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 hover:bg-brand-50/30">
              <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-700">
                Click to upload photo or drag and drop
              </span>
              <span className="text-xs text-slate-400 mt-1">JPEG, PNG, or WEBP up to 5MB</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Uploading & Filing Complaint...</span>
            </>
          ) : (
            <span>Submit Complaint</span>
          )}
        </button>
      </form>
    </div>
  );
};

