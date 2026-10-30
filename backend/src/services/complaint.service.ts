import { Types } from 'mongoose';
import { Complaint, IComplaintDocument } from '../models/Complaint.js';
import { CreateComplaintInput } from '../validators/complaint.validator.js';
import { CloudinaryService } from './cloudinary.service.js';
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
}

