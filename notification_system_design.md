# Notification System Design

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
