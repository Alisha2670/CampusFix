import { apiClient } from './client.js';
import { ApiResponse } from '../types/index.js';

export interface IAnalyticsSummary {
  totalComplaints: number;
  resolvedComplaints: number;
  openComplaints: number;
  resolutionRate: number;
  urgentActive: number;
  aiCompleted: number;
}

export interface IStatusMetric {
  status: string;
  count: number;
  percentage: number;
}

export interface ICategoryMetric {
  category: string;
  count: number;
  percentage: number;
}

export interface IPriorityMetric {
  priority: string;
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

export const AnalyticsApi = {
  getAnalytics: async (): Promise<IAnalyticsData> => {
    const res = await apiClient.get<ApiResponse<IAnalyticsData>>('/admin/analytics');
    return res.data.data!;
  },
};

