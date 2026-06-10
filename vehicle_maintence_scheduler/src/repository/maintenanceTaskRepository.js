const pool = require('../config/database');
const logger = require('../config/logger');

class MaintenanceTaskRepository {
  async create(task) {
    const query = `
      INSERT INTO maintenance_tasks (task_id, vehicle_id, task_type, operational_impact_score, estimated_service_duration, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [
        task.taskId,
        task.vehicleId,
        task.type,
        task.operationalImpactScore,
        task.estimatedServiceDuration,
        task.priority,
        task.status
      ]);
      logger.info('Maintenance task created', { taskId: task.taskId, vehicleId: task.vehicleId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating maintenance task', { error: error.message });
      throw error;
    }
  }

  async findByDepot(depotId, status = 'pending') {
    const query = `
      SELECT mt.* FROM maintenance_tasks mt
      JOIN vehicles v ON mt.vehicle_id = v.vehicle_id
      WHERE v.depot_id = $1 AND mt.status = $2
      ORDER BY mt.created_at DESC;
    `;
    try {
      const result = await pool.query(query, [depotId, status]);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching tasks by depot', { error: error.message });
      throw error;
    }
  }

  async updateStatus(taskId, status) {
    const query = `
      UPDATE maintenance_tasks
      SET status = $1, updated_at = NOW()
      WHERE task_id = $2
      RETURNING *;
    `;
    try {
      const result = await pool.query(query, [status, taskId]);
      logger.info('Task status updated', { taskId, status });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating task status', { error: error.message });
      throw error;
    }
  }

  async findById(taskId) {
    const query = `SELECT * FROM maintenance_tasks WHERE task_id = $1;`;
    try {
      const result = await pool.query(query, [taskId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching task', { error: error.message });
      throw error;
    }
  }
}

module.exports = new MaintenanceTaskRepository();
