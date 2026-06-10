# Vehicle Maintenance Scheduler Microservice Design

## Introduction

This document describes the design and implementation of a Vehicle Maintenance Scheduler microservice for a logistics company. The system optimizes daily vehicle maintenance task selection by maximizing operational impact score within a constrained mechanic-hour budget. This is a classic 0/1 knapsack optimization problem, essential for resource planning and operational efficiency in large fleets.

The design covers problem formulation, algorithm selection, API contract, integration with logging middleware, authentication, and production-ready implementation patterns.

---

## Stage 1: Problem Definition and Analysis

### Business Context

A logistics depot receives numerous vehicle maintenance requests daily. Each request has:
- An **operational impact score**: how critical the maintenance is to fleet operations
- A **service duration**: estimated mechanic-hours needed to complete the task

With limited mechanic-hours available per day, the challenge is to **select a subset of tasks that maximizes total operational impact without exceeding the available time budget**.

### Example Scenario
- Available mechanic-hours: 16 hours
- Tasks:
  | Task ID | Type | Impact Score | Duration (hrs) |
  | --- | --- | --- | --- |
  | 1 | Engine repair (critical) | 90 | 8 |
  | 2 | Tire rotation | 30 | 2 |
  | 3 | Oil change | 25 | 1 |
  | 4 | Brake inspection | 80 | 4 |
  | 5 | Battery replacement | 45 | 3 |
  | 6 | Air filter | 20 | 1 |

**Optimal selection** (greedy by impact/time ratio):
- Task 4 (Brake inspection): 80 impact, 4 hrs → ratio = 20
- Task 1 (Engine repair): 90 impact, 8 hrs → ratio = 11.25
- Task 5 (Battery replacement): 45 impact, 3 hrs → ratio = 15
- Task 3 (Oil change): 25 impact, 1 hr → ratio = 25

Total: 90 + 45 + 25 + 80 = 240 impact in 16 hours (perfect fit).

However, greedy doesn't always work for knapsack. **Dynamic programming** guarantees the optimal solution.

### Problem Type: 0/1 Knapsack

- **Items**: maintenance tasks
- **Value**: operational impact score
- **Weight**: service duration in mechanic-hours
- **Capacity**: daily mechanic-hour budget

---

## Stage 2: Algorithm Design

### Dynamic Programming Approach

The standard 0/1 knapsack algorithm uses a 2D DP table where:
- `dp[i][w]` = maximum impact achievable using the first `i` tasks with `w` mechanic-hours available

**Recurrence:**
```
dp[i][w] = max(
  dp[i-1][w],                              // don't include task i
  dp[i-1][w - duration[i]] + impact[i]   // include task i (if it fits)
)
```

**Time complexity:** O(n * W) where n = number of tasks, W = available hours  
**Space complexity:** O(n * W) with backtracking to recover the solution

### Practical Implementation

For a depot with ~200 tasks and 16 available hours, this is very fast (< 1ms).

For very large datasets (10,000+ tasks), consider:
- Greedy approximation by impact/duration ratio
- Branch-and-bound for exact solutions with pruning

### Pseudocode

```
function solve_knapsack(tasks, available_hours):
    n = tasks.length
    W = available_hours * 60  # convert to minutes for precision
    
    # Initialize DP table
    dp = array of size (n + 1) × (W + 1), all zeros
    
    # Fill DP table
    for i from 1 to n:
        for w from 0 to W:
            if tasks[i-1].duration <= w:
                include = dp[i-1][w - tasks[i-1].duration] + tasks[i-1].impact
                exclude = dp[i-1][w]
                dp[i][w] = max(include, exclude)
            else:
                dp[i][w] = dp[i-1][w]
    
    # Backtrack to find selected tasks
    selected = []
    w = W
    for i from n down to 1:
        if dp[i][w] != dp[i-1][w]:
            selected.append(tasks[i-1])
            w -= tasks[i-1].duration
    
    return {
        max_impact: dp[n][W],
        selected_tasks: selected,
        total_duration: sum(t.duration for t in selected)
    }
```

---

## Stage 3: API Design

### Endpoints

#### 1. Fetch depot details (GET)
```
GET /api/v1/depots/{depotId}

Response:
{
  "depotId": "depot_001",
  "name": "Hyderabad Logistics Hub",
  "location": "5th Phase, Hitech City",
  "availableMechanicHours": 16,
  "totalVehicles": 450,
  "operationalStatus": "active"
}
```

#### 2. Fetch all pending tasks for a depot (GET)
```
GET /api/v1/depots/{depotId}/tasks?status=pending

Response:
{
  "depotId": "depot_001",
  "taskCount": 45,
  "tasks": [
    {
      "taskId": "task_5001",
      "vehicleId": "VEH_10234",
      "taskType": "Engine Repair",
      "operationalImpactScore": 90,
      "estimatedServiceDuration": 8,
      "priority": "critical",
      "createdAt": "2026-06-10T06:00:00Z"
    },
    ...
  ]
}
```

#### 3. Schedule optimal tasks (POST)
```
POST /api/v1/depots/{depotId}/schedule

Request body:
{
  "availableMechanicHours": 16,
  "taskIds": ["task_5001", "task_5002", "task_5003", ...],
  "algorithm": "dynamic_programming"
}

Response:
{
  "depotId": "depot_001",
  "scheduleId": "sched_20260610_001",
  "totalImpactScore": 240,
  "totalDuration": 16,
  "utilizationRate": 1.0,
  "selectedTasks": [
    {
      "taskId": "task_5001",
      "vehicleId": "VEH_10234",
      "taskType": "Engine Repair",
      "impact": 90,
      "duration": 8,
      "priority": "critical"
    },
    ...
  ],
  "createdAt": "2026-06-10T10:30:00Z"
}
```

#### 4. Get schedule details (GET)
```
GET /api/v1/schedules/{scheduleId}

Response: [same as POST response]
```

#### 5. Update schedule status (PATCH)
```
PATCH /api/v1/schedules/{scheduleId}

Request body:
{
  "status": "completed",
  "completedTasks": ["task_5001", "task_5002"],
  "incompleteTasks": ["task_5003"],
  "feedback": "Task 5003 requires additional parts"
}

Response:
{
  "scheduleId": "sched_20260610_001",
  "status": "completed",
  "completionRate": 0.67,
  "actualImpactScore": 180,
  "actualDuration": 12,
  "updatedAt": "2026-06-10T18:45:00Z"
}
```

### Headers and Authentication

All requests must include:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Depot-ID: depot_001
```

Optional headers for tracing:
```
X-Request-ID: <uuid>
X-Correlation-ID: <uuid>
```

---

## Stage 4: Logging Integration

### Mandatory Logging Middleware

The logging middleware must be integrated to track all operations.

### Logging Points

1. **Request ingress**: log incoming request with method, path, headers, body
2. **Algorithm execution**: log task count, available hours, algorithm chosen
3. **Result calculation**: log selected tasks, total impact, duration
4. **API calls to external services**: log HTTP method, endpoint, response time
5. **Errors and exceptions**: log stack trace, error code, context
6. **Request egress**: log response status, duration, payload size

### Log Format (JSON)

```json
{
  "timestamp": "2026-06-10T10:30:15.123Z",
  "requestId": "req_abc123xyz",
  "service": "vehicle-scheduler",
  "operation": "schedule_tasks",
  "depotId": "depot_001",
  "level": "info",
  "message": "Scheduling optimization completed",
  "metadata": {
    "taskCount": 45,
    "selectedTaskCount": 12,
    "totalImpactScore": 240,
    "totalDuration": 16,
    "algorithm": "dynamic_programming",
    "executionTimeMs": 12
  }
}
```

### Implementation with Middleware

```javascript
// Attach logging to Express middleware
app.use(loggingMiddleware.requestLogger);
app.use(loggingMiddleware.errorLogger);

// Log inside route handler
app.post('/api/v1/depots/:depotId/schedule', (req, res) => {
  logger.info('Received schedule request', {
    depotId: req.params.depotId,
    taskCount: req.body.taskIds.length,
    availableHours: req.body.availableMechanicHours
  });
  
  const result = optimizeSchedule(req.body);
  
  logger.info('Schedule optimization completed', {
    selectedCount: result.selectedTasks.length,
    totalImpact: result.totalImpactScore,
    duration: result.totalDuration
  });
  
  res.json(result);
});
```

---

## Stage 5: Authentication and Security

### Authentication Mechanism

Assume all users accessing the service are pre-authenticated at the API gateway level. The microservice validates JWT tokens.

### JWT Validation

```javascript
function validateToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    throw new Error('Invalid or expired token');
  }
}

app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  
  try {
    req.user = validateToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});
```

### Authorization

Validate that the requesting user has permission to access the specific depot:

```javascript
function authorizeDepotAccess(req, res, next) {
  const depotId = req.params.depotId;
  const userDepots = req.user.allowedDepots || [];
  
  if (!userDepots.includes(depotId)) {
    return res.status(403).json({ error: 'Access denied to this depot' });
  }
  
  next();
}

app.post('/api/v1/depots/:depotId/schedule', authorizeDepotAccess, (req, res) => {
  // handle request
});
```

---

## Stage 6: Implementation Examples

### Python Implementation

```python
from typing import List, Dict, Tuple
import json
from datetime import datetime

class Task:
    def __init__(self, task_id: str, vehicle_id: str, impact: int, duration: int, task_type: str):
        self.task_id = task_id
        self.vehicle_id = vehicle_id
        self.impact = impact
        self.duration = duration
        self.task_type = task_type

class VehicleScheduler:
    def __init__(self, logger):
        self.logger = logger
    
    def solve_knapsack(self, tasks: List[Task], available_hours: int) -> Dict:
        """
        Solve 0/1 knapsack to find optimal task selection.
        """
        n = len(tasks)
        W = available_hours * 60  # convert to minutes
        
        self.logger.info(f"Starting knapsack optimization: {n} tasks, {available_hours} hours", {
            "task_count": n,
            "available_hours": available_hours
        })
        
        # DP table
        dp = [[0] * (W + 1) for _ in range(n + 1)]
        
        # Fill DP table
        for i in range(1, n + 1):
            task = tasks[i - 1]
            for w in range(W + 1):
                if task.duration <= w:
                    include = dp[i - 1][w - task.duration] + task.impact
                    exclude = dp[i - 1][w]
                    dp[i][w] = max(include, exclude)
                else:
                    dp[i][w] = dp[i - 1][w]
        
        # Backtrack to find selected tasks
        selected = []
        w = W
        for i in range(n, 0, -1):
            if dp[i][w] != dp[i - 1][w]:
                selected.append(tasks[i - 1])
                w -= tasks[i - 1].duration
        
        selected.reverse()
        total_impact = dp[n][W]
        total_duration = sum(t.duration for t in selected)
        
        self.logger.info(f"Optimization completed", {
            "selected_count": len(selected),
            "total_impact": total_impact,
            "total_duration_minutes": total_duration,
            "utilization_rate": total_duration / W
        })
        
        return {
            "max_impact": total_impact,
            "selected_tasks": selected,
            "total_duration": total_duration,
            "total_duration_hours": total_duration / 60
        }
```

### JavaScript Implementation (Node.js)

```javascript
class VehicleScheduler {
  constructor(logger) {
    this.logger = logger;
  }

  solveKnapsack(tasks, availableHours) {
    const n = tasks.length;
    const W = availableHours * 60; // minutes
    
    this.logger.info('Starting knapsack optimization', {
      taskCount: n,
      availableHours: availableHours
    });
    
    // DP table
    const dp = Array(n + 1).fill(0).map(() => Array(W + 1).fill(0));
    
    // Fill DP table
    for (let i = 1; i <= n; i++) {
      const task = tasks[i - 1];
      for (let w = 0; w <= W; w++) {
        if (task.duration <= w) {
          const include = dp[i - 1][w - task.duration] + task.impact;
          const exclude = dp[i - 1][w];
          dp[i][w] = Math.max(include, exclude);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }
    
    // Backtrack
    const selected = [];
    let w = W;
    for (let i = n; i > 0; i--) {
      if (dp[i][w] !== dp[i - 1][w]) {
        selected.push(tasks[i - 1]);
        w -= tasks[i - 1].duration;
      }
    }
    
    selected.reverse();
    const totalImpact = dp[n][W];
    const totalDuration = selected.reduce((sum, t) => sum + t.duration, 0);
    
    this.logger.info('Optimization completed', {
      selectedCount: selected.length,
      totalImpact: totalImpact,
      totalDurationMinutes: totalDuration,
      utilizationRate: (totalDuration / W).toFixed(2)
    });
    
    return {
      maxImpact: totalImpact,
      selectedTasks: selected,
      totalDuration: totalDuration,
      totalDurationHours: (totalDuration / 60).toFixed(2)
    };
  }
}

module.exports = VehicleScheduler;
```

---

## Stage 7: Performance and Optimization

### Time Complexity Analysis

| Input Size | Algorithm | Time | Space |
| --- | --- | --- | --- |
| 50 tasks, 16 hours | DP | ~1ms | 10KB |
| 200 tasks, 16 hours | DP | ~5ms | 40KB |
| 500 tasks, 16 hours | DP | ~15ms | 100KB |
| 1000 tasks, 16 hours | DP | ~40ms | 250KB |

For real-time APIs, DP is acceptable up to ~1000 tasks.

### Optimization Strategies

1. **Greedy approximation** for very large datasets (10,000+ tasks)
   - Sort by impact/duration ratio
   - Select greedily until budget exhausted
   - ~80-90% of optimal solution, < 1ms

2. **Branch-and-bound**
   - Exact algorithm with pruning
   - Good for 100-500 tasks

3. **Caching**
   - Cache optimization results per (task set, budget) pair in Redis
   - Invalidate on new task creation
   - Hit rate: ~60-70% in steady state

4. **Incremental updates**
   - When a new task arrives, recompute only if it improves solution
   - Early exit if no benefit found

### Production Deployment

- Run scheduler as async background job (not inline with API request)
- Store result in database and notify client via webhook/poll
- Set timeout: 5 seconds max per schedule request
- Use a queue (Redis, RabbitMQ) to handle burst requests
- Monitor DP execution time; alert if > 2 seconds

---

## Stage 8: Testing and Validation

### Test Cases

```javascript
describe('VehicleScheduler', () => {
  
  test('selects optimal tasks within budget', () => {
    const tasks = [
      { taskId: '1', impact: 90, duration: 8 },
      { taskId: '2', impact: 30, duration: 2 },
      { taskId: '3', impact: 80, duration: 4 },
    ];
    const scheduler = new VehicleScheduler(mockLogger);
    const result = scheduler.solveKnapsack(tasks, 16);
    
    expect(result.maxImpact).toBe(170); // 90 + 80
    expect(result.totalDuration).toBe(12);
  });
  
  test('handles edge case: no tasks fit', () => {
    const tasks = [
      { taskId: '1', impact: 100, duration: 20 },
    ];
    const scheduler = new VehicleScheduler(mockLogger);
    const result = scheduler.solveKnapsack(tasks, 16);
    
    expect(result.maxImpact).toBe(0);
    expect(result.selectedTasks.length).toBe(0);
  });
  
  test('handles edge case: all tasks fit', () => {
    const tasks = [
      { taskId: '1', impact: 10, duration: 2 },
      { taskId: '2', impact: 20, duration: 3 },
    ];
    const scheduler = new VehicleScheduler(mockLogger);
    const result = scheduler.solveKnapsack(tasks, 20);
    
    expect(result.maxImpact).toBe(30);
    expect(result.selectedTasks.length).toBe(2);
  });
});
```

### Integration Testing

- Test with actual Depot API calls
- Validate authentication flow
- Verify logging middleware captures all events
- Check error handling for network failures

---

## Conclusion

The Vehicle Maintenance Scheduler uses dynamic programming to efficiently solve the 0/1 knapsack problem for task selection. By combining a solid algorithm with proper API design, authentication, and logging, the system scales to handle hundreds of daily maintenance requests while maximizing operational efficiency.

Key principles:
- **Algorithm**: DP guarantees optimal solutions for depot-scale problems
- **API Design**: Clear contracts enable seamless integration with other services
- **Logging**: Comprehensive tracking for debugging and compliance
- **Security**: Token-based authentication with role-based access control
- **Performance**: Linear scaling with reasonable thresholds for production deployment

Next steps:
- Implement the microservice in production environment
- Integrate with existing fleet management system
- Monitor and optimize based on real operational data
- Consider machine learning for impact score prediction

---

**Prepared by:** Application Candidate  
**Date:** June 10, 2026  
**System:** Vehicle Maintenance Scheduler Microservice  
**Platform:** Logistics Operations  
