const notificationService = require('../service/notificationService');
const notificationHandler = require('../handler/notificationHandler');
const logger = require('../config/logger');

class NotificationController {
  async getNotifications(req, res) {
    try {
      const { studentId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const notifications = await notificationService.getNotifications(
        studentId,
        parseInt(limit),
        parseInt(offset)
      );

      notificationHandler.handleSuccess(res, 200, {
        studentId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        notifications
      }, 'Notifications retrieved successfully');
    } catch (error) {
      notificationHandler.handleError(res, 500, error);
    }
  }

  async getNotificationDetail(req, res) {
    try {
      const { notificationId } = req.params;

      const notification = await notificationService.getNotificationDetail(notificationId);
      if (!notification) {
        return notificationHandler.handleNotFound(res, 'Notification');
      }

      notificationHandler.handleSuccess(res, 200, notification, 'Notification detail retrieved');
    } catch (error) {
      notificationHandler.handleError(res, 500, error);
    }
  }

  async createNotification(req, res) {
    try {
      const { studentId } = req.params;
      const { type, title, message, metadata } = req.body;

      if (!type || !title || !message) {
        return notificationHandler.handleValidationError(res, [
          'type, title, and message are required'
        ]);
      }

      const notification = await notificationService.createNotification(
        studentId,
        type,
        title,
        message,
        metadata
      );

      notificationHandler.handleSuccess(res, 201, notification, 'Notification created successfully');
    } catch (error) {
      notificationHandler.handleError(res, 500, error);
    }
  }

  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;

      const notification = await notificationService.markAsRead(notificationId);
      if (!notification) {
        return notificationHandler.handleNotFound(res, 'Notification');
      }

      notificationHandler.handleSuccess(res, 200, notification, 'Notification marked as read');
    } catch (error) {
      notificationHandler.handleError(res, 500, error);
    }
  }

  async getUnreadCount(req, res) {
    try {
      const { studentId } = req.params;

      const count = await notificationService.getUnreadCount(studentId);

      notificationHandler.handleSuccess(res, 200, {
        studentId,
        unreadCount: count
      }, 'Unread count retrieved');
    } catch (error) {
      notificationHandler.handleError(res, 500, error);
    }
  }

  async getPriorityNotifications(req, res) {
    try {
      const { studentId } = req.params;
      const { limit = 10 } = req.query;

      const notifications = await notificationService.getPriorityNotifications(
        studentId,
        parseInt(limit)
      );

      notificationHandler.handleSuccess(res, 200, {
        studentId,
        limit: parseInt(limit),
        priorityNotifications: notifications
      }, 'Priority notifications retrieved');
    } catch (error) {
      notificationHandler.handleError(res, 500, error);
    }
  }
}

module.exports = new NotificationController();
