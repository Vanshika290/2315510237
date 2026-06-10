const pool = require('../config/database');
const logger = require('../config/logger');

class NotificationRepository {
  async create(notification) {
    const query = `
      INSERT INTO notifications (notification_id, student_id, notification_type, title, message, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [
        notification.notificationId,
        notification.studentId,
        notification.type,
        notification.title,
        notification.message,
        notification.isRead,
        notification.createdAt
      ]);
      logger.info('Notification created', { notificationId: notification.notificationId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification', { error: error.message });
      throw error;
    }
  }

  async findByStudentId(studentId, limit = 20, offset = 0) {
    const query = `
      SELECT * FROM notifications
      WHERE student_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    try {
      const result = await pool.query(query, [studentId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching notifications', { error: error.message });
      throw error;
    }
  }

  async findById(notificationId) {
    const query = `SELECT * FROM notifications WHERE notification_id = $1;`;
    try {
      const result = await pool.query(query, [notificationId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching notification', { error: error.message });
      throw error;
    }
  }

  async updateReadStatus(notificationId, isRead) {
    const query = `
      UPDATE notifications
      SET is_read = $1, updated_at = NOW()
      WHERE notification_id = $2
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [isRead, notificationId]);
      logger.info('Notification read status updated', { notificationId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating notification', { error: error.message });
      throw error;
    }
  }

  async getUnreadCount(studentId) {
    const query = `
      SELECT COUNT(*) as count FROM notifications
      WHERE student_id = $1 AND is_read = false;
    `;
    try {
      const result = await pool.query(query, [studentId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting unread count', { error: error.message });
      throw error;
    }
  }

  async deleteOlderThan(days) {
    const query = `
      DELETE FROM notifications
      WHERE created_at < NOW() - INTERVAL $1 day;
    `;
    try {
      const result = await pool.query(query, [days]);
      logger.info('Old notifications deleted', { deletedCount: result.rowCount });
      return result.rowCount;
    } catch (error) {
      logger.error('Error deleting old notifications', { error: error.message });
      throw error;
    }
  }
}

module.exports = new NotificationRepository();
