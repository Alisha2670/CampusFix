import { Types } from 'mongoose';
import { Complaint, IComplaintDocument } from '../models/Complaint.js';
import { CreateComplaintInput } from '../validators/complaint.validator.js';
import { CloudinaryService } from './cloudinary.service.js';
import { AiService } from './ai.service.js';
import { COMPLAINT_STATUSES, AI_ANALYSIS_STATUSES } from '../constants/enums.js';

export class ComplaintService {
  /**
   * Create a new student complaint
   * MANDATORY DECISION #3: Save complaint in MongoDB first before any external/AI processing
   */
  static async createComplaint(
    input: CreateComplaintInput,
    studentId: string,
    imageFile?: Express.Multer.File
  ): Promise<IComplaintDocument> {
    const studentObjectId = new Types.ObjectId(studentId);

    // 1. Upload image to Cloudinary if provided
    let imageUrl: string | null = null;
    if (imageFile && imageFile.buffer) {
      imageUrl = await CloudinaryService.uploadImageBuffer(
        imageFile.buffer,
        'campusfix_complaints'
      );
    }

    // 2. Generate unique human-readable complaint ID
    const complaintId = await Complaint.generateComplaintId();

    // 3. Persist complaint in MongoDB Atlas
    const complaint = await Complaint.create({
      complaintId,
      studentId: studentObjectId,
      title: input.title,
      description: input.description,
      location: input.location,
      imageUrl,
      category: input.category,
      priority: input.priority,
      status: COMPLAINT_STATUSES.SUBMITTED,
      assignedDepartment: null,
      duplicateOf: null,
      aiAnalysis: {
        status: AI_ANALYSIS_STATUSES.PENDING,
        suggestedCategory: null,
        suggestedPriority: null,
        possibleDuplicates: [],
        analyzedAt: null,
        errorMessage: null,
      },
      statusHistory: [
        {
          status: COMPLAINT_STATUSES.SUBMITTED,
          changedBy: studentObjectId,
          comment: 'Complaint filed by student',
          timestamp: new Date(),
        },
      ],
    });

    // 4. Asynchronously invoke AI analysis (Zero UI lag / Non-blocking)
    void AiService.analyzeComplaintAsync(complaint._id);

    return complaint;
  }

  /**
   * Retrieve complaint by ID
   */
  static async getComplaintById(id: string): Promise<IComplaintDocument | null> {
    if (Types.ObjectId.isValid(id)) {
      return Complaint.findById(id).populate('studentId', 'name email role');
    }
    return Complaint.findOne({ complaintId: id }).populate('studentId', 'name email role');
  }

  /**
   * Retrieve paginated complaints for a specific student
   */
  static async getStudentComplaints(
    studentId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ complaints: IComplaintDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const query = { studentId: new Types.ObjectId(studentId) };

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('studentId', 'name email'),
      Complaint.countDocuments(query),
    ]);

    return {
      complaints,
      total,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Toggle student upvote ("Me Too / +1") on a complaint atomically
   */
  static async toggleUpvote(
    complaintId: string,
    studentId: string
  ): Promise<{ complaintId: string; upvoteCount: number; hasUpvoted: boolean } | null> {
    const studentObjectId = new Types.ObjectId(studentId);
    const query = Types.ObjectId.isValid(complaintId)
      ? { _id: complaintId }
      : { complaintId };

    const complaint = await Complaint.findOne(query);
    if (!complaint) {
      return null;
    }

    const alreadyUpvoted = (complaint.upvotes || []).some(
      (id) => id.toString() === studentId
    );

    let updatedDoc;
    if (alreadyUpvoted) {
      // Pull student and decrement atomically
      updatedDoc = await Complaint.findOneAndUpdate(
        query,
        {
          $pull: { upvotes: studentObjectId },
          $inc: { upvoteCount: -1 },
        },
        { new: true }
      );
    } else {
      // Add student and increment atomically
      updatedDoc = await Complaint.findOneAndUpdate(
        query,
        {
          $addToSet: { upvotes: studentObjectId },
          $inc: { upvoteCount: 1 },
        },
        { new: true }
      );
    }

    const finalCount = Math.max(0, updatedDoc?.upvoteCount ?? 0);
    return {
      complaintId: updatedDoc?.complaintId || complaint.complaintId,
      upvoteCount: finalCount,
      hasUpvoted: !alreadyUpvoted,
    };
  }

  /**
   * Get public community campus feed with upvote status and crowd validation
   */
  static async getCampusFeed(
    params: {
      building?: string;
      category?: string;
      status?: string;
      sort?: string;
      page?: number;
      limit?: number;
    },
    studentId?: string
  ): Promise<{
    complaints: any[];
    total: number;
    pages: number;
    page: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(50, params.limit || 10));
    const skip = (page - 1) * limit;

    const query: any = {};

    // By default, show active non-rejected complaints
    if (params.status && params.status !== 'all') {
      query.status = params.status;
    } else if (!params.status) {
      query.status = {
        $in: [
          COMPLAINT_STATUSES.SUBMITTED,
          COMPLAINT_STATUSES.ACKNOWLEDGED,
          COMPLAINT_STATUSES.ASSIGNED,
          COMPLAINT_STATUSES.IN_PROGRESS,
        ],
      };
    }

    if (params.building && params.building !== 'all') {
      query['location.building'] = {
        $regex: params.building,
        $options: 'i',
      };
    }

    if (params.category && params.category !== 'all') {
      query.category = params.category;
    }

    let sortOptions: any = { upvoteCount: -1, createdAt: -1 };
    if (params.sort === 'newest') {
      sortOptions = { createdAt: -1 };
    } else if (params.sort === 'mostUpvoted') {
      sortOptions = { upvoteCount: -1, createdAt: -1 };
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('studentId', 'name'), // Privacy: only expose student name, never email/phone
      Complaint.countDocuments(query),
    ]);

    const feedItems = complaints.map((doc) => {
      const { upvotes: _upvotes, ...rest } = doc.toJSON() as Record<string, any>;
      const hasUpvoted = studentId
        ? (doc.upvotes || []).some((id) => id.toString() === studentId)
        : false;
      return {
        ...rest,
        upvoteCount: doc.upvoteCount || 0,
        hasUpvoted,
      };
    });

    return {
      complaints: feedItems,
      total,
      pages: Math.ceil(total / limit) || 1,
      page,
    };
  }
}

