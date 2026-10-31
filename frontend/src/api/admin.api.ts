import { apiClient } from './client.js';
import { ApiResponse, IComplaint } from '../types/index.js';

export interface AdminComplaintsParams {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminComplaintsResponseData {
  complaints: IComplaint[];
  total: number;
  page: number;
  totalPages: number;
}

export const AdminApi = {
  getAllComplaints: async (
    params: AdminComplaintsParams = {}
  ): Promise<AdminComplaintsResponseData> => {
    const query = new URLSearchParams();

    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.priority && params.priority !== 'all') query.append('priority', params.priority);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const res = await apiClient.get<ApiResponse<AdminComplaintsResponseData>>(
      `/admin/complaints?${query.toString()}`
    );
    return res.data.data!;
  },

  updateStatus: async (
    id: string,
    status: string,
    comment?: string
  ): Promise<IComplaint> => {
    const res = await apiClient.patch<ApiResponse<{ complaint: IComplaint }>>(
      `/admin/complaints/${id}/status`,
      { status, comment }
    );
    return res.data.data!.complaint;
  },

  updateTriage: async (
    id: string,
    data: {
      category?: string;
      priority?: string;
      assignedDepartment?: string | null;
      duplicateOf?: string | null;
    }
  ): Promise<IComplaint> => {
    const res = await apiClient.patch<ApiResponse<{ complaint: IComplaint }>>(
      `/admin/complaints/${id}`,
      data
    );
    return res.data.data!.complaint;
  },
};

