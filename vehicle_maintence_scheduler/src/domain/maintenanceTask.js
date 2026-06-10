// Domain model for Maintenance Task
class MaintenanceTask {
  constructor(id, vehicleId, type, impactScore, duration, priority = 'normal') {
    this.taskId = id;
    this.vehicleId = vehicleId;
    this.type = type; // Engine, Brake, Tire, Oil, Filter, etc.
    this.operationalImpactScore = impactScore;
    this.estimatedServiceDuration = duration; // in hours
    this.priority = priority; // critical, high, normal, low
    this.createdAt = new Date();
    this.status = 'pending'; // pending, scheduled, completed
  }

  isValid() {
    if (!this.vehicleId || !this.type || !this.operationalImpactScore || !this.estimatedServiceDuration) {
      return false;
    }
    return this.operationalImpactScore > 0 && this.estimatedServiceDuration > 0;
  }

  toJSON() {
    return {
      taskId: this.taskId,
      vehicleId: this.vehicleId,
      type: this.type,
      operationalImpactScore: this.operationalImpactScore,
      estimatedServiceDuration: this.estimatedServiceDuration,
      priority: this.priority,
      status: this.status,
      createdAt: this.createdAt
    };
  }
}

// Domain model for Maintenance Schedule
class MaintenanceSchedule {
  constructor(id, depotId, availableHours) {
    this.scheduleId = id;
    this.depotId = depotId;
    this.availableMechanicHours = availableHours;
    this.selectedTasks = [];
    this.totalImpactScore = 0;
    this.totalDuration = 0;
    this.createdAt = new Date();
    this.status = 'pending'; // pending, active, completed
  }

  addTask(task) {
    if (this.totalDuration + task.estimatedServiceDuration <= this.availableMechanicHours) {
      this.selectedTasks.push(task);
      this.totalDuration += task.estimatedServiceDuration;
      this.totalImpactScore += task.operationalImpactScore;
      return true;
    }
    return false;
  }

  getUtilizationRate() {
    return (this.totalDuration / this.availableMechanicHours).toFixed(2);
  }

  toJSON() {
    return {
      scheduleId: this.scheduleId,
      depotId: this.depotId,
      availableMechanicHours: this.availableMechanicHours,
      selectedTasks: this.selectedTasks,
      totalImpactScore: this.totalImpactScore,
      totalDuration: this.totalDuration,
      utilizationRate: this.getUtilizationRate(),
      status: this.status,
      createdAt: this.createdAt
    };
  }
}

module.exports = { MaintenanceTask, MaintenanceSchedule };
