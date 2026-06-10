const pool = require('../config/database');
const logger = require('../config/logger');

class ScheduleRepository {
  async create(schedule) {
    const query = `
      INSERT INTO maintenance_schedules (schedule_id, depot_id, available_mechanic_hours, total_impact_score, total_duration, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [
        schedule.scheduleId,
        schedule.depotId,
        schedule.availableMechanicHours,
        schedule.totalImpactScore,
        schedule.totalDuration,
        schedule.status
      ]);
      logger.info('Schedule created', { scheduleId: schedule.scheduleId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating schedule', { error: error.message });
      throw error;
    }
  }

  async findById(scheduleId) {
    const query = `SELECT * FROM maintenance_schedules WHERE schedule_id = $1;`;
    try {
      const result = await pool.query(query, [scheduleId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching schedule', { error: error.message });
      throw error;
    }
  }

  async saveScheduleTasks(scheduleId, tasks) {
    const query = `
      INSERT INTO schedule_tasks (schedule_id, task_id)
      VALUES ($1, $2);
    `;
    try {
      for (const task of tasks) {
        await pool.query(query, [scheduleId, task.taskId]);
      }
      logger.info('Schedule tasks saved', { scheduleId, taskCount: tasks.length });
    } catch (error) {
      logger.error('Error saving schedule tasks', { error: error.message });
      throw error;
    }
  }

  async updateStatus(scheduleId, status) {
    const query = `
      UPDATE maintenance_schedules
      SET status = $1, updated_at = NOW()
      WHERE schedule_id = $2
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [status, scheduleId]);
      logger.info('Schedule status updated', { scheduleId, status });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating schedule status', { error: error.message });
      throw error;
    }
  }

  async getScheduleHistory(depotId, limit = 10) {
    const query = `
      SELECT * FROM maintenance_schedules
      WHERE depot_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;
    try {
      const result = await pool.query(query, [depotId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching schedule history', { error: error.message });
      throw error;
    }
  }
}

module.exports = new ScheduleRepository();
