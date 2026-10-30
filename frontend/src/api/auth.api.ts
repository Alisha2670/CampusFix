import { apiClient } from './client.js';
import { ApiResponse, IUser } from '../types/index.js';

export const AuthApi = {
  getMe: async (): Promise<IUser> => {
    const res = await apiClient.get<ApiResponse<{ user: IUser }>>('/auth/me');
    return res.data.data!.user;
  },

  login: async (email: string, password: string): Promise<IUser> => {
    const res = await apiClient.post<ApiResponse<{ user: IUser }>>('/auth/login', {
      email,
      password,
    });
    return res.data.data!.user;
  },

  register: async (name: string, email: string, password: string): Promise<IUser> => {
    const res = await apiClient.post<ApiResponse<{ user: IUser }>>('/auth/register', {
      name,
      email,
      password,
    });
    return res.data.data!.user;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};

