const maintenanceTaskRepository = require('../repository/maintenanceTaskRepository');
const scheduleRepository = require('../repository/scheduleRepository');
const knapsackOptimizer = require('./knapsackOptimizer');
const cacheManager = require('../cache/cacheManager');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const { MaintenanceSchedule } = require('../domain/maintenanceTask');

class SchedulingService {
  async optimizeSchedule(depotId, availableHours, algorithm = 'dynamic_programming') {
    try {
      // Fetch pending tasks for the depot
      const tasks = await maintenanceTaskRepository.findByDepot(depotId, 'pending');

      if (tasks.length === 0) {
        logger.warn('No pending tasks found for depot', { depotId });
        return {
          scheduleId: null,
          selectedTasks: [],
          totalImpactScore: 0,
          totalDuration: 0,
          message: 'No pending tasks available'
        };
      }

      // Run optimization based on algorithm choice
      let result;
      if (algorithm === 'greedy' || tasks.length > 1000) {
        result = knapsackOptimizer.solveGreedy(tasks, availableHours);
      } else {
        result = knapsackOptimizer.solve(tasks, availableHours);
      }

      // Create and save the schedule
      const scheduleId = uuidv4();
      const schedule = new MaintenanceSchedule(scheduleId, depotId, availableHours);
      schedule.totalImpactScore = result.maxImpact;
      schedule.totalDuration = result.totalDuration;
      schedule.selectedTasks = result.selectedTasks;

      await scheduleRepository.create(schedule);
      await scheduleRepository.saveScheduleTasks(scheduleId, result.selectedTasks);

      // Invalidate cache for this depot
      await cacheManager.invalidateDepotCache(depotId);

      logger.info('Schedule optimized and saved', {
        scheduleId,
        depotId,
        selectedTasksCount: result.selectedTasks.length,
        totalImpact: result.maxImpact
      });

      return schedule.toJSON();
    } catch (error) {
      logger.error('Error optimizing schedule', { error: error.message, depotId });
      throw error;
    }
  }

  async getScheduleDetail(scheduleId) {
    const cacheKey = cacheManager.generateKey('schedule', scheduleId);
    
    let schedule = await cacheManager.get(cacheKey);
    if (schedule) {
      return schedule;
    }

    schedule = await scheduleRepository.findById(scheduleId);
    if (schedule) {
      await cacheManager.set(cacheKey, schedule, 600);
    }

    return schedule;
  }

  async updateScheduleStatus(scheduleId, status, completedTasks = [], incompleteTasks = []) {
    try {
      const schedule = await scheduleRepository.updateStatus(scheduleId, status);

      if (completedTasks.length > 0) {
        for (const taskId of completedTasks) {
          await maintenanceTaskRepository.updateStatus(taskId, 'completed');
        }
      }

      if (incompleteTasks.length > 0) {
        for (const taskId of incompleteTasks) {
          await maintenanceTaskRepository.updateStatus(taskId, 'pending');
        }
      }

      const cacheKey = cacheManager.generateKey('schedule', scheduleId);
      await cacheManager.delete(cacheKey);

      logger.info('Schedule status updated', {
        scheduleId,
        status,
        completedCount: completedTasks.length,
        incompleteCount: incompleteTasks.length
      });

      return schedule;
    } catch (error) {
      logger.error('Error updating schedule status', { error: error.message });
      throw error;
    }
  }

  async getDepotScheduleHistory(depotId, limit = 10) {
    try {
      const history = await scheduleRepository.getScheduleHistory(depotId, limit);
      logger.info('Schedule history retrieved', { depotId, count: history.length });
      return history;
    } catch (error) {
      logger.error('Error fetching schedule history', { error: error.message });
      throw error;
    }
  }
}

module.exports = new SchedulingService();
