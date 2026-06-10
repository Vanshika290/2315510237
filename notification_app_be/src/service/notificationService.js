const Notification = require('../domain/notification');
const notificationRepository = require('../repository/notificationRepository');
const cacheManager = require('../cache/cacheManager');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

class NotificationService {
  async createNotification(studentId, type, title, message, metadata = {}) {
    const id = uuidv4();
    const notification = new Notification(id, studentId, type, title, message);

    if (!notification.isValid()) {
      throw new Error('Invalid notification data');
    }

    const saved = await notificationRepository.create(notification);
    await cacheManager.invalidateStudentCache(studentId);
    logger.info('Notification created via service', { notificationId: id, studentId });
    return saved;
  }

  async getNotifications(studentId, limit = 20, offset = 0) {
    const cacheKey = cacheManager.generateKey('student', studentId, 'notifications', limit, offset);
    
    let notifications = await cacheManager.get(cacheKey);
    if (notifications) {
      logger.info('Notifications retrieved from cache', { studentId, count: notifications.length });
      return notifications;
    }

    notifications = await notificationRepository.findByStudentId(studentId, limit, offset);
    await cacheManager.set(cacheKey, notifications, 300);
    logger.info('Notifications retrieved from DB', { studentId, count: notifications.length });
    return notifications;
  }

  async getNotificationDetail(notificationId) {
    const cacheKey = cacheManager.generateKey('notification', notificationId);
    
    let notification = await cacheManager.get(cacheKey);
    if (notification) {
      return notification;
    }

    notification = await notificationRepository.findById(notificationId);
    if (notification) {
      await cacheManager.set(cacheKey, notification, 600);
    }
    return notification;
  }

  async markAsRead(notificationId) {
    const notification = await notificationRepository.updateReadStatus(notificationId, true);
    
    const cacheKey = cacheManager.generateKey('notification', notificationId);
    await cacheManager.delete(cacheKey);
    
    logger.info('Notification marked as read', { notificationId });
    return notification;
  }

  async getUnreadCount(studentId) {
    const cacheKey = cacheManager.generateKey('student', studentId, 'unread_count');
    
    let count = await cacheManager.get(cacheKey);
    if (count !== null) {
      return count;
    }

    count = await notificationRepository.getUnreadCount(studentId);
    await cacheManager.set(cacheKey, count, 60);
    return count;
  }

  async getPriorityNotifications(studentId, limit = 10) {
    const notifications = await this.getNotifications(studentId, 100, 0);
    const unreadNotifications = notifications.filter(n => !n.is_read);

    const TYPE_PRIORITY = {
      'Placement': 100,
      'Result': 50,
      'Event': 25,
      'Alert': 10
    };

    const scored = unreadNotifications.map(notif => {
      const createdDate = new Date(notif.created_at);
      const daysOld = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
      const typeScore = TYPE_PRIORITY[notif.notification_type] || 0;
      const recencyBonus = daysOld === 0 ? 20 : Math.max(10 - daysOld, 0);
      
      return {
        ...notif,
        priorityScore: typeScore + recencyBonus
      };
    });

    scored.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return scored.slice(0, limit);
  }
}

module.exports = new NotificationService();
