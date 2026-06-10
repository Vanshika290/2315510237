const express = require('express');
const notificationController = require('../controller/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// Get all notifications for a student with pagination
router.get('/students/:studentId/notifications', (req, res) => {
  notificationController.getNotifications(req, res);
});

// Get priority notifications (top N most important)
router.get('/students/:studentId/notifications/priority', (req, res) => {
  notificationController.getPriorityNotifications(req, res);
});

// Get a single notification
router.get('/students/:studentId/notifications/:notificationId', (req, res) => {
  notificationController.getNotificationDetail(req, res);
});

// Create a new notification
router.post('/students/:studentId/notifications', (req, res) => {
  notificationController.createNotification(req, res);
});

// Mark notification as read
router.patch('/students/:studentId/notifications/:notificationId/read', (req, res) => {
  notificationController.markAsRead(req, res);
});

// Get unread count
router.get('/students/:studentId/notifications/unread-count', (req, res) => {
  notificationController.getUnreadCount(req, res);
});

module.exports = router;
