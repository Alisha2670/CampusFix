import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { sendSuccess, sendError } from '../utils/response.util.js';

export class NotificationController {
  /**
   * GET /api/notifications
   * Fetch current user's notifications and unread badge count
   */
  static async getMyNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string, 10) || 20;

      const { notifications, unreadCount } =
        await NotificationService.getUserNotifications(userId, limit);

      sendSuccess(res, 'Notifications retrieved successfully', {
        notifications: notifications.map((n) => n.toJSON()),
        unreadCount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark a specific notification as read (with IDOR ownership protection)
   */
  static async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const userId = req.user!.id;

      const updated = await NotificationService.markAsRead(id, userId);

      if (!updated) {
        sendError(res, 'Notification not found', 'NOT_FOUND', 404);
        return;
      }

      sendSuccess(res, 'Notification marked as read', {
        notification: updated.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/notifications/read-all
   * Mark all unread notifications for the user as read
   */
  static async markAllAsRead(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.id;
      const count = await NotificationService.markAllAsRead(userId);

      sendSuccess(res, 'All notifications marked as read', {
        markedCount: count,
      });
    } catch (error) {
      next(error);
    }
  }
}

