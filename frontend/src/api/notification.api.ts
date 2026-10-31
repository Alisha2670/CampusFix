import { apiClient } from './client.js';
import { ApiResponse, INotification } from '../types/index.js';

export class NotificationApi {
  /**
   * Fetch current user's notifications + unreadCount
   */
  static async getMyNotifications(limit: number = 20): Promise<{
    notifications: INotification[];
    unreadCount: number;
  }> {
    const res = await apiClient.get<
      ApiResponse<{ notifications: INotification[]; unreadCount: number }>
    >(`/notifications?limit=${limit}`);
    return res.data.data!;
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(id: string): Promise<INotification> {
    const res = await apiClient.patch<ApiResponse<{ notification: INotification }>>(
      `/notifications/${id}/read`
    );
    return res.data.data!.notification;
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<number> {
    const res = await apiClient.patch<ApiResponse<{ markedCount: number }>>(
      '/notifications/read-all'
    );
    return res.data.data!.markedCount;
  }
}

