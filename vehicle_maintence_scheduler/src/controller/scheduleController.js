const schedulingService = require('../service/schedulingService');
const scheduleHandler = require('../handler/scheduleHandler');
const logger = require('../config/logger');

class ScheduleController {
  async optimizeSchedule(req, res) {
    try {
      const { depotId } = req.params;
      const { availableMechanicHours, algorithm = 'dynamic_programming' } = req.body;

      if (!availableMechanicHours || availableMechanicHours <= 0) {
        return scheduleHandler.handleValidationError(res, [
          'availableMechanicHours must be a positive number'
        ]);
      }

      const schedule = await schedulingService.optimizeSchedule(
        depotId,
        availableMechanicHours,
        algorithm
      );

      scheduleHandler.handleSuccess(res, 201, schedule, 'Schedule optimized successfully');
    } catch (error) {
      scheduleHandler.handleError(res, 500, error);
    }
  }

  async getScheduleDetail(req, res) {
    try {
      const { scheduleId } = req.params;

      const schedule = await schedulingService.getScheduleDetail(scheduleId);
      if (!schedule) {
        return scheduleHandler.handleNotFound(res, 'Schedule');
      }

      scheduleHandler.handleSuccess(res, 200, schedule, 'Schedule detail retrieved');
    } catch (error) {
      scheduleHandler.handleError(res, 500, error);
    }
  }

  async updateScheduleStatus(req, res) {
    try {
      const { scheduleId } = req.params;
      const { status, completedTasks = [], incompleteTasks = [] } = req.body;

      if (!status || !['pending', 'active', 'completed'].includes(status)) {
        return scheduleHandler.handleValidationError(res, [
          'status must be one of: pending, active, completed'
        ]);
      }

      const schedule = await schedulingService.updateScheduleStatus(
        scheduleId,
        status,
        completedTasks,
        incompleteTasks
      );

      scheduleHandler.handleSuccess(res, 200, schedule, 'Schedule status updated');
    } catch (error) {
      scheduleHandler.handleError(res, 500, error);
    }
  }

  async getScheduleHistory(req, res) {
    try {
      const { depotId } = req.params;
      const { limit = 10 } = req.query;

      const history = await schedulingService.getDepotScheduleHistory(
        depotId,
        parseInt(limit)
      );

      scheduleHandler.handleSuccess(res, 200, {
        depotId,
        limit: parseInt(limit),
        schedules: history
      }, 'Schedule history retrieved');
    } catch (error) {
      scheduleHandler.handleError(res, 500, error);
    }
  }
}

module.exports = new ScheduleController();
