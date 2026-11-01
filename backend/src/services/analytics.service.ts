import { Complaint } from '../models/Complaint.js';
import {
  COMPLAINT_STATUSES,
  CATEGORIES,
  PRIORITIES,
  ComplaintStatus,
  Category,
  Priority,
} from '../constants/enums.js';

export interface IAnalyticsSummary {
  totalComplaints: number;
  resolvedComplaints: number;
  openComplaints: number;
  resolutionRate: number; // Percentage 0 - 100
  urgentActive: number;
  aiCompleted: number;
}

export interface IStatusMetric {
  status: ComplaintStatus;
  count: number;
  percentage: number;
}

export interface ICategoryMetric {
  category: Category;
  count: number;
  percentage: number;
}

export interface IPriorityMetric {
  priority: Priority;
  count: number;
  percentage: number;
}

export interface IDepartmentWorkload {
  department: string;
  total: number;
  active: number;
  resolved: number;
}

export interface IDailyTrendItem {
  date: string;
  label: string;
  count: number;
}

export interface IAnalyticsData {
  summary: IAnalyticsSummary;
  byStatus: IStatusMetric[];
  byCategory: ICategoryMetric[];
  byPriority: IPriorityMetric[];
  departmentWorkload: IDepartmentWorkload[];
  avgResolutionHours: number;
  dailyTrend: IDailyTrendItem[];
}

export class AnalyticsService {
  /**
   * Aggregates comprehensive campus complaint analytics from MongoDB
   */
  static async getAnalytics(): Promise<IAnalyticsData> {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({
      status: COMPLAINT_STATUSES.RESOLVED,
    });
    const openComplaints = totalComplaints - resolvedComplaints;
    const resolutionRate =
      totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0;

    const urgentActive = await Complaint.countDocuments({
      priority: PRIORITIES.URGENT,
      status: { $ne: COMPLAINT_STATUSES.RESOLVED },
    });

    const aiCompleted = await Complaint.countDocuments({
      'aiAnalysis.status': 'Completed',
    });

    // 1. Status Breakdown
    const statusAgg = await Complaint.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusMap = new Map<string, number>(statusAgg.map((item) => [item._id, item.count]));
    const byStatus: IStatusMetric[] = Object.values(COMPLAINT_STATUSES).map((status) => {
      const count = statusMap.get(status) || 0;
      const percentage = totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0;
      return { status, count, percentage };
    });

    // 2. Category Breakdown
    const categoryAgg = await Complaint.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const categoryMap = new Map<string, number>(categoryAgg.map((item) => [item._id, item.count]));
    const byCategory: ICategoryMetric[] = Object.values(CATEGORIES).map((category) => {
      const count = categoryMap.get(category) || 0;
      const percentage = totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0;
      return { category, count, percentage };
    });

    // 3. Priority Breakdown
    const priorityAgg = await Complaint.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    const priorityMap = new Map<string, number>(priorityAgg.map((item) => [item._id, item.count]));
    const byPriority: IPriorityMetric[] = Object.values(PRIORITIES).map((priority) => {
      const count = priorityMap.get(priority) || 0;
      const percentage = totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0;
      return { priority, count, percentage };
    });

    // 4. Department Workload
    const departmentAgg = await Complaint.aggregate<{
      _id: string | null;
      total: number;
      resolved: number;
      active: number;
    }>([
      {
        $group: {
          _id: { $ifNull: ['$assignedDepartment', 'Unassigned'] },
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', COMPLAINT_STATUSES.RESOLVED] }, 1, 0] },
          },
          active: {
            $sum: { $cond: [{ $ne: ['$status', COMPLAINT_STATUSES.RESOLVED] }, 1, 0] },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const departmentWorkload: IDepartmentWorkload[] = departmentAgg.map((item) => ({
      department: item._id || 'Unassigned',
      total: item.total,
      active: item.active,
      resolved: item.resolved,
    }));

    // 5. Average Resolution Time in Hours (Calculated for Resolved Tickets)
    const resolutionAgg = await Complaint.aggregate<{ avgHours: number }>([
      { $match: { status: COMPLAINT_STATUSES.RESOLVED } },
      {
        $project: {
          durationHours: {
            $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$durationHours' },
        },
      },
    ]);

    const avgResolutionHours =
      resolutionAgg.length > 0 && resolutionAgg[0].avgHours
        ? Math.round(resolutionAgg[0].avgHours * 10) / 10
        : 0;

    // 6. Trailing 7-Day Trend
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendAgg = await Complaint.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const trendMap = new Map<string, number>(trendAgg.map((item) => [item._id, item.count]));

    const dailyTrend: IDailyTrendItem[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      dailyTrend.push({
        date: isoDate,
        label,
        count: trendMap.get(isoDate) || 0,
      });
    }

    return {
      summary: {
        totalComplaints,
        resolvedComplaints,
        openComplaints,
        resolutionRate,
        urgentActive,
        aiCompleted,
      },
      byStatus,
      byCategory,
      byPriority,
      departmentWorkload,
      avgResolutionHours,
      dailyTrend,
    };
  }
}

