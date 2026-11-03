import { Request, Response, NextFunction } from 'express';
import { ComplaintService } from '../services/complaint.service.js';
import { createComplaintSchema } from '../validators/complaint.validator.js';
import { sendSuccess, sendError } from '../utils/response.util.js';
import { ROLES } from '../constants/enums.js';

export class ComplaintController {
  /**
   * POST /api/complaints
   * Create a new complaint (Student only)
   */
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
        return;
      }

      const validatedInput = createComplaintSchema.parse(req.body);
      const complaint = await ComplaintService.createComplaint(
        validatedInput,
        req.user.id,
        req.file
      );

      sendSuccess(
        res,
        'Complaint submitted successfully',
        {
          complaintId: complaint.complaintId,
          status: complaint.status,
          aiAnalysisStatus: complaint.aiAnalysis.status,
          complaint: complaint.toJSON(),
        },
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/complaints/my
   * Get complaints submitted by the authenticated student
   */
  static async getMyComplaints(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
        return;
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const result = await ComplaintService.getStudentComplaints(
        req.user.id,
        page,
        limit
      );

      sendSuccess(res, 'Complaints retrieved successfully', {
        complaints: result.complaints.map((c) => c.toJSON()),
        total: result.total,
        page,
        totalPages: result.pages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/complaints/:id
   * Get single complaint by ID (Enforces ownership verification if requester is student)
   */
  static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
        return;
      }

      const complaintIdParam = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const complaint = await ComplaintService.getComplaintById(complaintIdParam);
      if (!complaint) {
        sendError(res, 'Complaint not found', 'NOT_FOUND', 404);
        return;
      }

      // IDOR Security Defense: If student, verify they own this complaint
      const isOwner = (complaint.studentId as any)._id?.toString() === req.user.id ||
                      (complaint.studentId as any).toString() === req.user.id;
      const isAdmin = req.user.role === ROLES.ADMIN;

      if (!isOwner && !isAdmin) {
        sendError(
          res,
          'Access denied: You do not have permission to view this complaint',
          'FORBIDDEN',
          403
        );
        return;
      }

      sendSuccess(res, 'Complaint details retrieved', {
        complaint: complaint.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/complaints/:id/upvote
   * Toggle student upvote / "Me Too (+1)" on an issue
   */
  static async toggleUpvote(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
        return;
      }

      const complaintIdParam = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const result = await ComplaintService.toggleUpvote(
        complaintIdParam,
        req.user.id
      );

      if (!result) {
        sendError(res, 'Complaint not found', 'NOT_FOUND', 404);
        return;
      }

      sendSuccess(
        res,
        result.hasUpvoted ? 'Upvote registered successfully' : 'Upvote removed',
        result,
        200
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/complaints/feed
   * Retrieve community campus feed with public visibility and crowd validation
   */
  static async getCampusFeed(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
        return;
      }

      const { building, category, status, sort, page, limit } = req.query;

      const result = await ComplaintService.getCampusFeed(
        {
          building: building as string | undefined,
          category: category as string | undefined,
          status: status as string | undefined,
          sort: sort as string | undefined,
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        },
        req.user.id
      );

      sendSuccess(res, 'Campus feed retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
}
