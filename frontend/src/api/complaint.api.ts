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
};

