# Notification App Backend

A production-grade backend service for managing student notifications with caching, real-time updates, and intelligent prioritization.

## Architecture

```
notification_app_be/
├── src/
│   ├── cache/              # Redis caching layer
│   ├── controller/         # Request handlers
│   ├── cron_job/          # Scheduled tasks
│   ├── db/                # Database migrations
│   ├── domain/            # Business logic models
│   ├── handler/           # Response formatting
│   ├── middleware/        # Express middleware
│   ├── repository/        # Data access layer
│   ├── route/             # API routes
│   ├── service/           # Business logic
│   ├── utils/             # Utilities
│   ├── config/            # Configuration
│   └── app.js            # Main application
├── package.json
└── .env.example
```

## Features

- **RESTful API** for notification CRUD operations
- **Caching** with Redis for fast response times
- **Priority Inbox** - intelligent notification ranking
- **JWT Authentication** - secure API access
- **Logging** with Winston for monitoring
- **Scheduled Tasks** - daily cleanup of old notifications
- **Error Handling** - consistent error responses

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

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
```

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

### Get Notifications
```
GET /api/v1/students/{studentId}/notifications?limit=20&offset=0
Authorization: Bearer <token>
```

### Get Priority Notifications
```
GET /api/v1/students/{studentId}/notifications/priority?limit=10
Authorization: Bearer <token>
```

### Get Single Notification
```
GET /api/v1/students/{studentId}/notifications/{notificationId}
Authorization: Bearer <token>
```

### Create Notification
```
POST /api/v1/students/{studentId}/notifications
Authorization: Bearer <token>

{
  "type": "Placement",
  "title": "New opportunity",
  "message": "A new placement offer is available"
}
```

### Mark as Read
```
PATCH /api/v1/students/{studentId}/notifications/{notificationId}/read
Authorization: Bearer <token>
```

### Get Unread Count
```
GET /api/v1/students/{studentId}/notifications/unread-count
Authorization: Bearer <token>
```

## Testing

```bash
npm test
```

## Deployment

The service is containerized and ready for deployment to any platform supporting Node.js.

## License

MIT
