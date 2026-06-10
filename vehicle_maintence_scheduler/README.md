# Vehicle Maintenance Scheduler Microservice

A smart scheduling service that uses dynamic programming to optimize daily vehicle maintenance tasks and maximize operational efficiency.

## What This Does

When a logistics depot gets flooded with maintenance requests, we can't do everything. So this service picks the best combination of tasks to maximize impact while staying within the mechanic-hours budget.

It's the knapsack problem in production—solving real operational challenges.

## Architecture

```
vehicle_maintence_scheduler/
├── src/
│   ├── cache/              # Redis caching for fast lookups
│   ├── controller/         # Handles API requests
│   ├── cron_job/          # Scheduled maintenance jobs
│   ├── db/                # Database schema
│   ├── domain/            # Business logic models
│   ├── handler/           # Response formatting
│   ├── middleware/        # Auth and logging
│   ├── repository/        # Data access
│   ├── route/             # API routes
│   ├── service/           # Core optimization logic
│   ├── utils/             # Helpers
│   ├── config/            # Configuration
│   └── app.js            # Main server
├── package.json
└── .env.example
```

## Key Features

- **Smart Optimization**: Uses dynamic programming to find the best task selection
- **Fallback Strategy**: Greedy approximation if dataset is huge (1000+ tasks)
- **Caching**: Redis caching for instant repeated requests
- **JWT Auth**: Secure API access with token validation
- **Logging**: Full request/response logging with Winston
- **API First**: Clean REST endpoints for integration

## Setup

### Prerequisites
- Node.js 14+
- PostgreSQL 12+
- Redis 6+

### Installation

```bash
npm install
```

### Configuration

```bash
cp .env.example .env
```

Update `.env` with your database and Redis credentials.

### Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Endpoints

### Optimize Schedule
Create an optimized schedule for a depot:
```
POST /api/v1/depots/{depotId}/schedule
Authorization: Bearer <token>

{
  "availableMechanicHours": 16,
  "algorithm": "dynamic_programming"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "scheduleId": "sched_20260610_001",
    "totalImpactScore": 240,
    "totalDuration": 16,
    "utilizationRate": "1.00",
    "selectedTasks": [...]
  }
}
```

### Get Schedule Details
```
GET /api/v1/schedules/{scheduleId}
Authorization: Bearer <token>
```

### Update Schedule Status
Mark tasks as completed or incomplete:
```
PATCH /api/v1/schedules/{scheduleId}
Authorization: Bearer <token>

{
  "status": "completed",
  "completedTasks": ["task_001", "task_002"],
  "incompleteTasks": ["task_003"]
}
```

### View Schedule History
```
GET /api/v1/depots/{depotId}/schedule-history?limit=10
Authorization: Bearer <token>
```

## How the Algorithm Works

The service uses **dynamic programming** to solve the 0/1 knapsack problem:

1. Each task has an impact score (how critical) and duration (hours needed)
2. Available mechanic-hours is the budget constraint
3. We find the best combination that maximizes total impact

For very large datasets (1000+ tasks), it switches to **greedy approximation** for speed.

**Time complexity:** O(n × W) where n = tasks, W = available hours  
**Space complexity:** O(n × W)

For depot-scale problems (200 tasks, 16 hours), this runs in < 5ms.

## Testing

```bash
npm test
```

## Deployment

Ready to deploy to any Node.js hosting. Docker-friendly configuration included.

## License

MIT
