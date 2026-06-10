const logger = require('../config/logger');

class KnapsackOptimizer {
  /**
   * Solves the 0/1 knapsack problem using dynamic programming
   * @param {Array} tasks - Array of tasks with impact and duration
   * @param {Number} availableHours - Total available mechanic hours
   * @returns {Object} Result with selected tasks and metrics
   */
  solve(tasks, availableHours) {
    const n = tasks.length;
    const W = availableHours * 60; // Convert to minutes for precision

    logger.info('Starting knapsack optimization', {
      taskCount: n,
      availableHours,
      capacityMinutes: W
    });

    // Initialize DP table
    const dp = Array(n + 1).fill(0).map(() => Array(W + 1).fill(0));

    // Fill the DP table
    for (let i = 1; i <= n; i++) {
      const task = tasks[i - 1];
      const taskDuration = Math.ceil(task.estimatedServiceDuration * 60); // Convert to minutes

      for (let w = 0; w <= W; w++) {
        if (taskDuration <= w) {
          const include = dp[i - 1][w - taskDuration] + task.operationalImpactScore;
          const exclude = dp[i - 1][w];
          dp[i][w] = Math.max(include, exclude);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }

    // Backtrack to find selected tasks
    const selected = [];
    let w = W;
    for (let i = n; i > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) {
        selected.push(tasks[i - 1]);
        w -= Math.ceil(tasks[i - 1].estimatedServiceDuration * 60);
      }
    }

    selected.reverse();
    const totalImpact = dp[n][W];
    const totalDuration = selected.reduce((sum, t) => sum + t.estimatedServiceDuration, 0);

    logger.info('Optimization completed', {
      selectedCount: selected.length,
      totalImpact,
      totalDurationHours: totalDuration,
      utilizationRate: (totalDuration / availableHours).toFixed(2)
    });

    return {
      maxImpact: totalImpact,
      selectedTasks: selected,
      totalDuration: totalDuration,
      utilizationRate: totalDuration / availableHours
    };
  }

  /**
   * Greedy approximation for very large datasets
   * Uses impact/duration ratio for fast approximation
   */
  solveGreedy(tasks, availableHours) {
    logger.info('Starting greedy optimization', { taskCount: tasks.length });

    const scored = tasks.map(task => ({
      ...task,
      ratio: task.operationalImpactScore / task.estimatedServiceDuration
    }));

    scored.sort((a, b) => b.ratio - a.ratio);

    const selected = [];
    let totalDuration = 0;
    let totalImpact = 0;

    for (const task of scored) {
      if (totalDuration + task.estimatedServiceDuration <= availableHours) {
        selected.push(task);
        totalDuration += task.estimatedServiceDuration;
        totalImpact += task.operationalImpactScore;
      }
    }

    logger.info('Greedy optimization completed', {
      selectedCount: selected.length,
      totalImpact,
      totalDuration
    });

    return {
      maxImpact: totalImpact,
      selectedTasks: selected,
      totalDuration: totalDuration,
      utilizationRate: totalDuration / availableHours,
      approximation: true
    };
  }
}

module.exports = new KnapsackOptimizer();
