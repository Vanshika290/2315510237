# Notification System Design

## Introduction

This document presents a comprehensive design for a student notification system serving a large-scale educational platform. The system must reliably deliver, store, and prioritize notifications to support critical events such as placement updates, exam results, and campus activities. Through six iterative stages, this design addresses REST API contract, database architecture, query optimization, performance scaling, reliability under high load, and finally, intelligent notification prioritization.

---

## Stage 1

This design describes a simple REST API for notifications and a real-time delivery mechanism for a student-facing platform.

### API overview

The notification service exposes the following main endpoints:

1. `GET /api/v1/students/{studentId}/notifications`
   - Returns a paginated list of notifications for a specific student.
   - Supports optional filters for unread notifications and notification type.

2. `GET /api/v1/students/{studentId}/notifications/{notificationId}`
   - Returns the details of a single notification.

3. `PATCH /api/v1/students/{studentId}/notifications/{notificationId}`
   - Updates the read state of a notification.

4. `POST /api/v1/students/{studentId}/notifications`
   - Creates a new notification for the specified student.

5. `GET /api/v1/students/{studentId}/notifications/unread-count`
   - Returns the unread notification count for the student.

### Example: list notifications
Request:
- `GET /api/v1/students/12345/notifications?limit=20&offset=0&unread=true`

Response:
```json
{
  "studentId": "12345",
  "limit": 20,
  "offset": 0,
  "total": 124,
  "notifications": [
    {
      "notificationId": "notif_001",
      "type": "Result",
      "title": "Exam result available",
      "message": "Your placement test result is ready.",
      "isRead": false,
      "createdAt": "2026-06-10T08:15:00Z",
      "metadata": {
        "courseId": "CSE101"
      }
    }
  ]
}
```

### Example: get a single notification
Response:
```json
{
  "notificationId": "notif_001",
  "studentId": "12345",
  "type": "Event",
  "title": "Orientation tomorrow",
  "message": "Campus orientation starts at 09:00 AM.",
  "isRead": false,
  "createdAt": "2026-06-10T08:15:00Z",
  "payload": {
    "eventId": "evt_2026",
    "location": "Auditorium"
  }
}
```

### Example: mark notification as read
Request body:
```json
{
  "isRead": true
}
```

Response:
```json
{
  "notificationId": "notif_001",
  "isRead": true
}
```

### Example: create a notification
Request body:
```json
{
  "type": "Placement",
  "title": "Placement update",
  "message": "A new placement notification was posted.",
  "metadata": {
    "placementId": "plc_2026",
    "deadline": "2026-06-17T17:00:00Z"
  }
}
```

Response:
```json
{
  "notificationId": "notif_002",
  "studentId": "12345",
  "createdAt": "2026-06-10T09:00:00Z",
  "status": "queued"
}
```

### Example: unread count
Response:
```json
{
  "studentId": "12345",
  "unreadCount": 12
}
```

### Headers and authentication
All protected endpoints should require:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- `Accept: application/json`

Optional headers for tracing and caching:
- `X-Request-Id: <uuid>`
- `If-None-Match: <etag>`

### Notification schema
The JSON payload should include these essential fields:
- `notificationId`: unique string identifier
- `studentId`: string or integer identifying the student
- `type`: one of `Event`, `Result`, `Placement`, or `Alert`
- `title`: short display title
- `message`: notification text
- `isRead`: boolean read status
- `createdAt`: ISO 8601 timestamp
- `metadata` / `payload`: optional object for event-specific details

### Real-time delivery
A real-time mechanism helps display notifications instantly when they arrive.

Use WebSocket or Server-Sent Events (SSE), for example:
- `GET /api/v1/students/{studentId}/notifications/stream`

A streaming message might look like:
```json
{
  "notificationId": "notif_010",
  "type": "Alert",
  "title": "System maintenance",
  "message": "Service will be unavailable at 10:00 PM.",
  "createdAt": "2026-06-10T18:30:00Z"
}
```
This avoids polling and keeps the student interface responsive.

## Stage 2

### Recommended storage option
For this notification system, PostgreSQL is the best choice.
It provides:
- predictable ACID behavior for marking notifications read or unread
- flexible JSONB support for event-specific payloads
- strong query optimization and indexing for large datasets

### Database schema
The main table should be `notifications`.
Key columns:
- `notification_id` UUID PRIMARY KEY
- `student_id` UUID NOT NULL
- `notification_type` VARCHAR(32) NOT NULL
- `title` TEXT NOT NULL
- `message` TEXT NOT NULL
- `is_read` BOOLEAN NOT NULL DEFAULT FALSE
- `created_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- `payload` JSONB NULL
- `metadata` JSONB NULL
- `delivery_status` VARCHAR(32) DEFAULT 'pending'

### Recommended indexes
To make common queries fast:
- `CREATE INDEX idx_notifications_student_read_created ON notifications (student_id, is_read, created_at DESC);`
- `CREATE INDEX idx_notifications_student_type ON notifications (student_id, notification_type);`
- `CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);`

### Scaling considerations
As data volume grows, these points matter:
- Queries must be narrow enough to avoid scanning too many rows.
- A partial index on unread notifications can dramatically speed reads.
- Partitioning by date may help if the notification table grows into tens of millions of rows.
- For very high write rates, consider a queue or event stream for notification creation.

### SQL vs NoSQL guidance
PostgreSQL is the right primary store here.
It handles relational queries well while also supporting flexible payloads.
If the system later needs faster counters or transient delivery state, add a cache layer such as Redis for unread counts or message delivery tracking.

### API to database mapping
- `GET /students/{studentId}/notifications` → query `notifications` filtered by `student_id`
- `PATCH /students/{studentId}/notifications/{notificationId}` → update the `is_read` flag
- `POST /students/{studentId}/notifications` → insert a new notification row and publish a real-time event
- `GET /students/{studentId}/notifications/unread-count` → count unread rows for the student

## Stage 3

### Why the query is slow
The query below is valid, but it can be slow if the database cannot use the right index:
```sql
SELECT * FROM notifications
WHERE studentID = 1042
  AND isRead = false
ORDER BY createdAt DESC;
```

The problem is that a table with 5,000,000 notifications and 50,000 students can still be expensive to search if the database has no composite index on `(studentID, isRead, createdAt)`.
Fetching `*` also makes the query heavier if rows contain large JSON or text fields.

### Is the query accurate?
Yes. It correctly returns all unread notifications for student `1042` sorted by most recent first.
However, the execution cost depends heavily on indexes and the amount of data scanned.

### Better index strategy
Creating an index on every column is not a good idea.
That approach slows writes and consumes extra storage.
Instead, add a targeted index for the query pattern:
```sql
CREATE INDEX idx_notifications_student_unread_created
ON notifications (student_id, is_read, created_at DESC);
```

If most queries are only interested in unread notifications, a partial index is even better:
```sql
CREATE INDEX idx_notifications_student_unread_created_partial
ON notifications (student_id, created_at DESC)
WHERE is_read = false;
```

### Placement notification query
To find placement notifications from the last 7 days, use a date filter and type filter:
```sql
SELECT *
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Summary of recommendations
- Use a composite index for the most common filter and ordering pattern.
- Avoid indexing every column blindly.
- Prefer partial indexes for frequent unread-notification lookups.
- Keep commonly filtered fields such as `student_id`, `is_read`, `created_at`, and `notification_type` as explicit columns.
- Store flexible payloads in JSONB, but use dedicated columns for fields you need to query efficiently.

## Stage 4

### Problem
The current implementation is fetching notifications on every page load for every student. This is overwhelming the database and causing a poor user experience.

### Recommended approach
- Load notifications only for the currently logged-in student, not for all students.
- Use a dedicated endpoint such as `GET /api/v1/students/{studentId}/notifications` with pagination.
- Cache recent notifications or unread counts in Redis so the UI can render quickly without repeated database queries.
- Use WebSocket or SSE to push updates to the client when new notifications arrive, instead of fetching on every page load.
- Keep the UI responsive by returning only the top N notifications and loading more on demand.

### Tradeoffs
- Caching reduces database load but adds complexity around invalidation. This is acceptable when notification freshness is high and writes are less frequent than reads.
- Pagination keeps responses small, but the client must handle “load more” behavior. This is a good tradeoff for user-facing notification pages.
- Real-time push avoids frequent polling but requires connection management and infrastructure for WebSocket/SSE.
- A read-optimized cache or pre-computed unread counter improves performance, while the source of truth remains in the primary database.

### Practical improvements
- Add a partial index on `(student_id, is_read, created_at)` for unread notification queries.
- Use `GET /students/{studentId}/notifications/unread-count` for unread badge updates rather than loading full lists.
- Only fetch a small page of notifications on page load, then fetch older notifications as the user scrolls.
- If the UI loads multiple pages or sections, combine those requests into a single API call or cache the result.

## Stage 5

### What is wrong with the original implementation?
The pseudocode below is too fragile:

```python
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)  # calls Email API
        save_to_db(student_id, message)  # DB insert
        push_to_app(student_id, message)  # implementation is based on whatever real-time notification mechanism you have chosen in Stage 1
```

Problems:
- It processes 50,000 students sequentially, which is slow.
- One failed email call can stop the loop or cause partial delivery.
- DB insert and email send are tightly coupled, so a transient email failure can block the notification flow.
- It does not scale or retry failed operations safely.

### Better design
Use an asynchronous, event-driven approach.
Save the notification record and enqueue delivery work separately. This gives you reliability and keeps the main flow fast.

### Reliable pseudocode
```python
function notify_all(student_ids, message):
    job = {
        "type": "bulk_notification",
        "studentIds": student_ids,
        "message": message,
        "createdAt": now()
    }
    enqueue_job("notification_delivery", job)
    return {"status": "accepted"}

worker process notification_delivery:
    for batch in chunk(student_ids, 1000):
        notifications = []
        email_jobs = []
        for student_id in batch:
            notifications.append({
                "student_id": student_id,
                "message": message,
                "notification_type": "Placement",
                "is_read": false,
                "created_at": now()
            })
            email_jobs.append({
                "student_id": student_id,
                "message": message,
                "template": "placement_alert"
            })
        bulk_insert_notifications(notifications)
        enqueue_jobs("email_send", email_jobs)
        push_app_updates(batch, message)
```

### Why this is better
- The initial API returns quickly with an accepted response.
- Work is done in the background by workers that can retry failures.
- Bulk inserts and batched email jobs are much faster than one-by-one calls.
- The in-app notification path can still succeed even if email delivery has temporary failures.
- Failed emails can be retried independently using a dead-letter queue or retry policy.

### Should DB save and email send happen together?
They should be decoupled.
- Save the notification state first, or enqueue the delivery event first.
- Email and push delivery should be handled by separate workers.
- This avoids a single point of failure and improves throughput.

### Reliability strategy
- Use a durable queue for notification delivery jobs.
- Make the worker idempotent so retrying the same student/message does not create duplicate notifications.
- Use batch operations for database writes and email job creation.
- Keep the user-facing notification state consistent even if email sending is delayed.

### Summary
For 50,000 students, use batching, queuing, and background workers.
Keep the notification storage separate from email delivery, and handle failures with retries and dead-letter handling.
This approach scales much better than sequentially calling email APIs and writing DB rows in a tight loop.

## Stage 6

### Requirement
The product team wants to introduce a Priority Inbox that displays the top N most important unread notifications first.
Priority should be determined by a combination of notification type (placement > result > event) and recency.
Implement the core logic to find the top N notifications for a student based on these criteria.

### Priority scoring
Notifications should be prioritized as follows:
- **Placement** notifications: highest priority (score = 100)
- **Result** notifications: medium priority (score = 50)
- **Event** notifications: lower priority (score = 25)
- **Alert** notifications: lowest priority (score = 10)

Within the same type, newer notifications should rank higher.
For example, a two-day-old Placement notification scores higher than a one-day-old Result notification.

### Scoring algorithm
```
priority_score = type_score + recency_bonus
where:
  type_score = priority value for the notification type
  recency_bonus = (days_old == 0) ? 20 : max(10 - days_old, 0)
  
sorted by: priority_score DESC, created_at DESC
limit: N (e.g., 10, 15, 20)
```

### Example implementation in Python
```python
from datetime import datetime, timedelta
from typing import List, Dict

def get_priority_notifications(student_id: str, limit: int = 10) -> List[Dict]:
    """
    Fetch top priority notifications for a student.
    """
    TYPE_PRIORITY = {
        "Placement": 100,
        "Result": 50,
        "Event": 25,
        "Alert": 10
    }
    
    # Fetch all unread notifications for the student
    notifications = fetch_unread_notifications(student_id)
    
    # Calculate priority score for each
    scored = []
    now = datetime.utcnow()
    for notif in notifications:
        days_old = (now - notif['created_at']).days
        type_score = TYPE_PRIORITY.get(notif['type'], 0)
        recency_bonus = 20 if days_old == 0 else max(10 - days_old, 0)
        priority_score = type_score + recency_bonus
        
        scored.append({
            **notif,
            'priority_score': priority_score
        })
    
    # Sort by priority score (descending), then by created_at (newest first)
    scored.sort(
        key=lambda x: (-x['priority_score'], -x['created_at'].timestamp())
    )
    
    return scored[:limit]
```

### Example implementation in TypeScript
```typescript
interface Notification {
  notificationId: string;
  studentId: string;
  type: "Placement" | "Result" | "Event" | "Alert";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

function getPriorityNotifications(
  notifications: Notification[],
  limit: number = 10
): Notification[] {
  const TYPE_PRIORITY: Record<string, number> = {
    Placement: 100,
    Result: 50,
    Event: 25,
    Alert: 10
  };

  const now = new Date();
  const scored = notifications
    .filter(n => !n.isRead)
    .map(notif => {
      const daysOld = Math.floor(
        (now.getTime() - notif.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const typeScore = TYPE_PRIORITY[notif.type] || 0;
      const recencyBonus = daysOld === 0 ? 20 : Math.max(10 - daysOld, 0);
      const priorityScore = typeScore + recencyBonus;

      return {
        ...notif,
        priorityScore
      };
    });

  scored.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return scored.slice(0, limit);
}
```

### Database query optimization
If you want to get the top N notifications efficiently without loading all records into memory, use a computed score column or a view:

```sql
CREATE VIEW priority_notifications_view AS
SELECT
  notification_id,
  student_id,
  notification_type,
  title,
  message,
  is_read,
  created_at,
  (
    CASE 
      WHEN notification_type = 'Placement' THEN 100
      WHEN notification_type = 'Result' THEN 50
      WHEN notification_type = 'Event' THEN 25
      ELSE 10
    END +
    CASE
      WHEN DATE(created_at) = CURRENT_DATE THEN 20
      ELSE GREATEST(10 - EXTRACT(DAY FROM NOW() - created_at), 0)
    END
  ) AS priority_score
FROM notifications
WHERE is_read = false;

-- Query top 10 priority notifications for a student
SELECT *
FROM priority_notifications_view
WHERE student_id = 'student_12345'
ORDER BY priority_score DESC, created_at DESC
LIMIT 10;
```

### API endpoint
Add a new endpoint to fetch priority notifications:

```
GET /api/v1/students/{studentId}/notifications/priority
Query parameters:
  - limit (default: 10)
  - skip (default: 0)

Response:
{
  "studentId": "student_12345",
  "limit": 10,
  "priorityNotifications": [
    {
      "notificationId": "notif_042",
      "type": "Placement",
      "title": "Urgent: TCS Recruitment Drive",
      "message": "Registration closes in 2 hours.",
      "isRead": false,
      "createdAt": "2026-06-10T14:30:00Z",
      "priorityScore": 120
    },
    ...
  ]
}
```

### Implementation checklist
- [ ] Add type priority scoring logic to your backend.
- [ ] Implement date-based recency bonus calculation.
- [ ] Create a sorting function that orders by priority score and recency.
- [ ] Test with sample notifications of different types and ages.
- [ ] Add a new API endpoint for fetching priority notifications.
- [ ] Create a UI component to display the Priority Inbox.
- [ ] Add screenshots of the working Priority Inbox to the repository.
- [ ] Document the priority algorithm and any tuning decisions.

### Performance considerations
- If the unread notification count is very large, compute the priority score in the database and order there to avoid loading all records.
- Cache the top N priority notifications in Redis with a short TTL (e.g., 5 minutes) for fast repeated access.
- Use a background job to pre-compute priority scores for active students every few minutes.
- Monitor query performance as the notification table grows; add indexes on `(student_id, is_read, created_at)` if needed.

---

## Conclusion

This notification system design balances simplicity, scalability, and user experience. By starting with a clean REST API contract and moving through stages of database optimization, reliability engineering, and intelligent feature development, the system can grow from a small pilot serving hundreds of students to a robust platform supporting millions of notifications.

Key takeaways:
- **API Design**: A clear, versioned REST contract ensures consistency and ease of integration.
- **Database**: PostgreSQL with thoughtful indexing and schema design handles large volumes efficiently.
- **Performance**: Query optimization, caching, and real-time updates prevent database saturation and improve responsiveness.
- **Reliability**: Asynchronous workers, batching, and decoupled delivery mechanisms handle high-volume bulk operations safely.
- **Features**: Priority scoring and intelligent ranking make notifications more actionable and timely for users.

Implementation should proceed incrementally, validating at each stage before scaling to the next. Monitoring and profiling in production will guide further optimization based on real usage patterns.

---

**Prepared by:** Application Candidate  
**Date:** June 10, 2026  
**System:** Student Notification Platform
