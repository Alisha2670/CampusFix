import { Request, Response, NextFunction } from 'express';
import { Complaint } from '../models/Complaint.js';
import { sendSuccess } from '../utils/response.util.js';

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
}

