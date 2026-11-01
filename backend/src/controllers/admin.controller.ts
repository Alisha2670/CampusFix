import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Complaint } from '../models/Complaint.js';
import { sendSuccess, sendError } from '../utils/response.util.js';
import { StateMachineService } from '../services/statemachine.service.js';
import {
  updateComplaintStatusSchema,
  adminUpdateComplaintSchema,
} from '../validators/complaint.validator.js';
import { ComplaintStatus, Category, Priority } from '../constants/enums.js';
import { NotificationService } from '../services/notification.service.js';
import { AnalyticsService } from '../services/analytics.service.js';

export class AdminController {
  /**
   * GET /api/admin/complaints
   * Multi-filter and search complaints with pagination (Admin only)
   */
  static async getAllComplaints(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        status,
        category,
        priority,
        building,
        search,
        page = '1',
        limit = '10',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
      const skip = (pageNum - 1) * limitNum;

      // Construct filter query dynamically
      const query: any = {};

      if (status && status !== 'all') {
        query.status = status;
      }

      if (category && category !== 'all') {
        query.category = category;
      }

      if (priority && priority !== 'all') {
        query.priority = priority;
      }

      if (building) {
        query['location.building'] = {
          $regex: building as string,
          $options: 'i',
        };
      }

      if (search) {
        const searchRegex = { $regex: search as string, $options: 'i' };
        query.$or = [{ complaintId: searchRegex }, { title: searchRegex }];
      }

      // Execute query with sorting, pagination, and population
      const [complaints, total] = await Promise.all([
        Complaint.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('studentId', 'name email role'),
        Complaint.countDocuments(query),
      ]);

      sendSuccess(res, 'Admin complaints retrieved successfully', {
        complaints: complaints.map((c) => c.toJSON()),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/complaints/:id/status
   * Transitions complaint status via State Machine rules and appends to statusHistory
   */
  static async updateComplaintStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      const validation = updateComplaintStatusSchema.safeParse(req.body);
      if (!validation.success) {
        sendError(
          res,
          'Validation failed',
          'VALIDATION_ERROR',
          400,
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }

      const { status: newStatus, comment } = validation.data;

      // Find by MongoDB _id or human-friendly complaintId
      const complaint = await Complaint.findOne(
        mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { complaintId: id }
      );

      if (!complaint) {
        sendError(res, `Complaint '${id}' not found`, 'NOT_FOUND', 404);
        return;
      }

      const currentStatus = complaint.status;

      // State machine validation
      if (!StateMachineService.isValidTransition(currentStatus, newStatus as ComplaintStatus)) {
        const allowed = StateMachineService.getAllowedTransitions(currentStatus);
        sendError(
          res,
          `Cannot transition complaint status from "${currentStatus}" to "${newStatus}". Allowed next statuses are: [${allowed.join(', ')}]`,
          'INVALID_STATUS_TRANSITION',
          400,
          { currentStatus, attemptedStatus: newStatus, allowedTransitions: allowed }
        );
        return;
      }

      const adminId = new mongoose.Types.ObjectId(req.user!.id);
      const auditComment =
        comment?.trim() || `Status updated from ${currentStatus} to ${newStatus}`;

      // Append state change to embedded statusHistory
      complaint.statusHistory.push({
        status: newStatus as ComplaintStatus,
        changedBy: adminId,
        comment: auditComment,
        timestamp: new Date(),
      });

      complaint.status = newStatus as ComplaintStatus;
      await complaint.save();
      await complaint.populate('studentId', 'name email role');

      // Dispatch in-app notification to the complaint owner
      const studentId = (complaint.studentId as any)?._id || complaint.studentId;
      if (studentId) {
        await NotificationService.createNotification(
          studentId,
          complaint._id,
          `Your complaint #${complaint.complaintId} status has been updated to "${newStatus}".`
        );
      }

      sendSuccess(res, `Complaint status successfully updated to "${newStatus}"`, {
        complaint: complaint.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/complaints/:id
   * Admin triage updates: category, priority, assignedDepartment, duplicateOf
   */
  static async updateComplaintTriage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      const validation = adminUpdateComplaintSchema.safeParse(req.body);
      if (!validation.success) {
        sendError(
          res,
          'Validation failed',
          'VALIDATION_ERROR',
          400,
          validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          }))
        );
        return;
      }

      const complaint = await Complaint.findOne(
        mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { complaintId: id }
      );

      if (!complaint) {
        sendError(res, `Complaint '${id}' not found`, 'NOT_FOUND', 404);
        return;
      }

      const { category, priority, assignedDepartment, duplicateOf } = validation.data;

      if (category !== undefined) {
        complaint.category = category as Category;
      }
      if (priority !== undefined) {
        complaint.priority = priority as Priority;
      }
      if (assignedDepartment !== undefined) {
        complaint.assignedDepartment = assignedDepartment;
      }
      if (duplicateOf !== undefined) {
        if (duplicateOf && mongoose.Types.ObjectId.isValid(duplicateOf)) {
          complaint.duplicateOf = new mongoose.Types.ObjectId(duplicateOf);
        } else {
          complaint.duplicateOf = null;
        }
      }

      await complaint.save();
      await complaint.populate('studentId', 'name email role');

      if (assignedDepartment) {
        const studentId = (complaint.studentId as any)?._id || complaint.studentId;
        if (studentId) {
          await NotificationService.createNotification(
            studentId,
            complaint._id,
            `Your complaint #${complaint.complaintId} has been assigned to "${assignedDepartment}".`
          );
        }
      }

      sendSuccess(res, 'Complaint triage information updated successfully', {
        complaint: complaint.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/analytics
   * Aggregated system-wide complaint metrics, KPIs, and department workloads (Admin only)
   */
  static async getAnalytics(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const analytics = await AnalyticsService.getAnalytics();
      sendSuccess(res, 'Analytics data retrieved successfully', analytics);
    } catch (error) {
      next(error);
    }
  }
}


