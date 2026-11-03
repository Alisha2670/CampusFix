import { apiClient } from './client.js';
import { ApiResponse, IComplaint } from '../types/index.js';

export interface CreateComplaintResponseData {
  complaintId: string;
  status: string;
  aiAnalysisStatus: string;
  complaint: IComplaint;
}

export const ComplaintApi = {
  create: async (formData: FormData): Promise<CreateComplaintResponseData> => {
    const response = await apiClient.post<ApiResponse<CreateComplaintResponseData>>(
      '/complaints',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  },

  getMyComplaints: async (page = 1, limit = 10): Promise<{ complaints: IComplaint[]; total: number; totalPages: number }> => {
    const response = await apiClient.get<ApiResponse<{ complaints: IComplaint[]; total: number; totalPages: number }>>(
      `/complaints/my?page=${page}&limit=${limit}`
    );
    return response.data.data!;
  },

  getById: async (id: string): Promise<IComplaint> => {
    const response = await apiClient.get<ApiResponse<{ complaint: IComplaint }>>(`/complaints/${id}`);
    return response.data.data!.complaint;
  },

  toggleUpvote: async (
    id: string
  ): Promise<{ complaintId: string; upvoteCount: number; hasUpvoted: boolean }> => {
    const response = await apiClient.post<
      ApiResponse<{ complaintId: string; upvoteCount: number; hasUpvoted: boolean }>
    >(`/complaints/${id}/upvote`);
    return response.data.data!;
  },

  getCampusFeed: async (params?: {
    building?: string;
    category?: string;
    status?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    complaints: IComplaint[];
    total: number;
    pages: number;
    page: number;
  }> => {
    const query = new URLSearchParams();
    if (params?.building && params.building !== 'all') query.append('building', params.building);
    if (params?.category && params.category !== 'all') query.append('category', params.category);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const response = await apiClient.get<
      ApiResponse<{
        complaints: IComplaint[];
        total: number;
        pages: number;
        page: number;
      }>
    >(`/complaints/feed?${query.toString()}`);
    return response.data.data!;
  },
};

