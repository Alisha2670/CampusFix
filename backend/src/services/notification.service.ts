import mongoose, { Types } from 'mongoose';
import { Notification, INotificationDocument } from '../models/Notification.js';

export class NotificationService {
  /**
   * Create and persist a new in-app notification
   */
  static async createNotification(
    userId: Types.ObjectId | string,
    complaintId: Types.ObjectId | string,
    message: string
  ): Promise<INotificationDocument> {
    const notification = await Notification.create({
      userId: new Types.ObjectId(userId.toString()),
      complaintId: new Types.ObjectId(complaintId.toString()),
      message: message.trim(),
      isRead: false,
      createdAt: new Date(),
    });

    return notification;
  }

  /**
   * Get notifications for a user, sorted newest first, with unread count
   */
  static async getUserNotifications(
    userId: Types.ObjectId | string,
    limit: number = 20
  ): Promise<{ notifications: INotificationDocument[]; unreadCount: number }> {
    const userObjectId = new Types.ObjectId(userId.toString());

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('complaintId', 'complaintId title status'),
      Notification.countDocuments({ userId: userObjectId, isRead: false }),
    ]);

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read with ownership verification (IDOR defense)
   */
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<INotificationDocument | null> {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return null;
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      userId: new Types.ObjectId(userId),
    });

    if (!notification) {
      return null;
    }

    notification.isRead = true;
    await notification.save();

    return notification;
  }

  /**
   * Mark all notifications for a user as read
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } }
    );

    return result.modifiedCount;
  }
}

