const express = require('express');
const scheduleController = require('../controller/scheduleController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.verifyToken);

// Optimize schedule for a depot
router.post('/depots/:depotId/schedule', (req, res) => {
  scheduleController.optimizeSchedule(req, res);
});

// Get schedule details
router.get('/schedules/:scheduleId', (req, res) => {
  scheduleController.getScheduleDetail(req, res);
});

// Update schedule status
router.patch('/schedules/:scheduleId', (req, res) => {
  scheduleController.updateScheduleStatus(req, res);
});

// Get schedule history for a depot
router.get('/depots/:depotId/schedule-history', (req, res) => {
  scheduleController.getScheduleHistory(req, res);
});

module.exports = router;
