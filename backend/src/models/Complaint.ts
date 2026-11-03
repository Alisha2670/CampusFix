import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import {
  CATEGORIES,
  Category,
  PRIORITIES,
  Priority,
  COMPLAINT_STATUSES,
  ComplaintStatus,
  AI_ANALYSIS_STATUSES,
  AiAnalysisStatus,
} from '../constants/enums.js';

export interface ILocation {
  building: string;
  floor: string;
  room: string;
}

export interface IPossibleDuplicate {
  complaintId: string;
  similarity: number;
}

export interface IAiAnalysis {
  status: AiAnalysisStatus;
  suggestedCategory: Category | null;
  suggestedPriority: Priority | null;
  possibleDuplicates: IPossibleDuplicate[];
  analyzedAt: Date | null;
  errorMessage: string | null;
}

export interface IStatusHistoryItem {
  status: ComplaintStatus;
  changedBy: Types.ObjectId;
  comment?: string;
  timestamp: Date;
}

export interface IComplaint {
  complaintId: string;
  studentId: Types.ObjectId;
  title: string;
  description: string;
  location: ILocation;
  imageUrl: string | null;
  category: Category;
  priority: Priority;
  status: ComplaintStatus;
  assignedDepartment: string | null;
  duplicateOf: Types.ObjectId | null;
  upvotes?: Types.ObjectId[];
  upvoteCount?: number;
  aiAnalysis: IAiAnalysis;
  statusHistory: IStatusHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IComplaintDocument extends IComplaint, Document {}

export interface IComplaintModel extends Model<IComplaintDocument> {
  generateComplaintId(): Promise<string>;
}

const locationSchema = new Schema<ILocation>(
  {
    building: { type: String, required: true, trim: true },
    floor: { type: String, required: true, trim: true },
    room: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const possibleDuplicateSchema = new Schema<IPossibleDuplicate>(
  {
    complaintId: { type: String, required: true },
    similarity: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

const aiAnalysisSchema = new Schema<IAiAnalysis>(
  {
    status: {
      type: String,
      enum: Object.values(AI_ANALYSIS_STATUSES),
      default: AI_ANALYSIS_STATUSES.PENDING,
    },
    suggestedCategory: {
      type: String,
      enum: [...Object.values(CATEGORIES), null],
      default: null,
    },
    suggestedPriority: {
      type: String,
      enum: [...Object.values(PRIORITIES), null],
      default: null,
    },
    possibleDuplicates: {
      type: [possibleDuplicateSchema],
      default: [],
    },
    analyzedAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const statusHistorySchema = new Schema<IStatusHistoryItem>(
  {
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUSES),
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    comment: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const complaintSchema = new Schema<IComplaintDocument, IComplaintModel>(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    location: {
      type: locationSchema,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      enum: {
        values: Object.values(CATEGORIES),
        message: '{VALUE} is not a supported category',
      },
      required: [true, 'Category is required'],
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(PRIORITIES),
        message: '{VALUE} is not a valid priority',
      },
      default: PRIORITIES.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUSES),
      default: COMPLAINT_STATUSES.SUBMITTED,
      index: true,
    },
    assignedDepartment: {
      type: String,
      default: null,
    },
    duplicateOf: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
    },
    upvotes: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    upvoteCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    aiAnalysis: {
      type: aiAnalysisSchema,
      default: () => ({
        status: AI_ANALYSIS_STATUSES.PENDING,
        suggestedCategory: null,
        suggestedPriority: null,
        possibleDuplicates: [],
        analyzedAt: null,
        errorMessage: null,
      }),
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for optimized query patterns
complaintSchema.index({ studentId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, category: 1, priority: 1 });
complaintSchema.index({ 'location.building': 1, category: 1 });
complaintSchema.index({ status: 1, upvoteCount: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });

// Helper to generate a human-friendly complaint identifier (e.g. FC-1024)
complaintSchema.statics.generateComplaintId = async function (): Promise<string> {
  const count = await this.countDocuments();
  const sequentialNum = 1000 + count + 1;
  const candidateId = `FC-${sequentialNum}`;

  const exists = await this.findOne({ complaintId: candidateId });
  if (exists) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `FC-${sequentialNum}-${randomSuffix}`;
  }

  return candidateId;
};

export const Complaint = mongoose.model<IComplaintDocument, IComplaintModel>(
  'Complaint',
  complaintSchema
);

