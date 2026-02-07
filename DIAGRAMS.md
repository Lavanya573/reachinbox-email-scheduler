# Email Job Scheduler - Visual Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                            │
│                    http://localhost:3000                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   React Dashboard                          │ │
│  │  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │  Schedule Form  │  │ Scheduled    │  │ Sent Emails  │  │ │
│  │  │ - Email addr    │  │ - Job list   │  │ - History    │  │ │
│  │  │ - Subject       │  │ - Status     │  │ - Timestamps │  │ │
│  │  │ - Date/Time     │  │ - Stats      │  │ - Preview    │  │ │
│  │  └─────────────────┘  └──────────────┘  └──────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                   HTTP/CORS
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express API Server                           │
│                  http://localhost:5000                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   API Routes                               │ │
│  │  POST   /api/emails/schedule  ←── Schedule new email      │ │
│  │  GET    /api/emails           ←── List all emails         │ │
│  │  GET    /api/emails/:id       ←── Get single email        │ │
│  │  GET    /api/emails?status=X  ←── Filter by status        │ │
│  │  GET    /api/emails/stats     ←── Get statistics          │ │
│  │  GET    /health               ←── Health check            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          │      │      │                        │
│                ┌─────────┼──────┼──────┴─────────┐              │
│                │         │      │                │              │
└────────────────┼─────────┼──────┼────────────────┴──────────────┘
                 │         │      │
                 ▼         ▼      ▼
         ┌──────────────────────────────────┐
         │         Data Storage             │
         │                                  │
    ┌────┴────────────────────┬─────────────┴────┐
    │                         │                  │
    ▼                         ▼                  ▼
 ┌─────────────┐        ┌──────────────┐   ┌──────────────┐
 │   SQLite    │        │    Redis     │   │  Ethereal    │
 │  Database   │        │   + BullMQ   │   │   Email      │
 │             │        │              │   │  (SMTP)      │
 │ ┌────────┐  │        │ ┌──────────┐ │   │              │
 │ │ emails │  │        │ │ Job      │ │   │ Fake Email   │
 │ │ ─────  │  │        │ │ Queue    │ │   │ Service      │
 │ │ id     │  │        │ │          │ │   │              │
 │ │ to     │  │        │ │ Status:  │ │   │ ✓ Test mode  │
 │ │ subject│  │        │ │ pending  │ │   │ ✓ Preview    │
 │ │ body   │  │        │ │ active   │ │   │ ✓ Logs       │
 │ │ status │  │        │ │ completed│ │   │ ✓ Webhooks   │
 │ │ job_id │  │        │ │          │ │   │              │
 │ │ sent_at│  │        │ │ Retry    │ │   └──────────────┘
 │ │ error  │  │        │ │ Logic:   │ │
 │ └────────┘  │        │ │ 3 times  │ │
 │             │        │ │ backoff  │ │
 │ Metadata    │        │ │ exp      │ │
 │ store       │        │ └──────────┘ │
 │             │        │              │
 │ Persistent  │        │ In-Memory    │
 │ Survives    │        │ Fast         │
 │ crash       │        │ Reliable     │
 └─────────────┘        └──────────────┘

Worker Process:
┌──────────────────────────────────────────────────┐
│         BullMQ Worker (In Backend)               │
│                                                  │
│  1. Monitor Redis queue                          │
│  2. When job delay expires:                      │
│     - Call emailService.sendEmail()              │
│     - Update SQLite: status='sent'               │
│  3. On failure:                                  │
│     - Retry 3 times (with backoff)               │
│     - Update SQLite: status='failed'             │
│     - Log error message                          │
│  4. Cleanup job from queue                       │
│                                                  │
│  Worker always running, even if jobs pending    │
└──────────────────────────────────────────────────┘
```

## Data Flow: Scheduling Email

```
User Action: Schedule email in dashboard
    │
    ▼
POST /api/emails/schedule
{
  to: "user@example.com",
  subject: "Hello",
  body: "Test",
  scheduledTime: 1675000000
}
    │
    ▼
Express receives request
    │
    ▼
Validate input
    │
    ▼
INSERT into SQLite
┌─────────────────────────┐
│ emails                  │
│ id: 1                   │
│ to: user@example.com    │
│ subject: Hello          │
│ status: scheduled       │
│ job_id: NULL (so far)   │
└─────────────────────────┘
    │
    ▼
Calculate delay: (scheduled_time * 1000) - now()
    │
    ▼
emailQueue.add('send-email', {
  to, subject, body, emailId: 1
}, {
  delay: 3600000,  // 1 hour in milliseconds
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
})
    │
    ▼
Job added to Redis (stored persistently)
    │
    ▼
Get job ID from BullMQ: "job-12345"
    │
    ▼
UPDATE emails SET job_id = 'job-12345' WHERE id = 1
    │
    ▼
Return response:
{
  success: true,
  id: 1,
  jobId: 'job-12345',
  status: 'scheduled'
}
    │
    ▼
Frontend displays in "Scheduled" tab
```

## Data Flow: Processing Email

```
Time passes... status.scheduledTime timestamp reached
    │
    ▼
BullMQ notices delay has expired
    │
    ▼
Worker picks up job from Redis queue
    │
    ▼
Call jobProcessor(job)
    │
    ▼
sendEmail(to, subject, body)
    │
    ▼
Connect to Ethereal SMTP
    │
    ▼
Send email (simulated)
    │
    ▼
Get response:
{
  success: true,
  messageId: 'msg-xyz',
  previewUrl: 'https://ethereal.email/...'
}
    │
    ▼
UPDATE emails
SET status='sent', sent_at=NOW(), job_id='job-12345'
WHERE id=1
    │
    ▼
Job removes from Redis queue (cleanup)
    │
    ▼
Frontend refreshes and shows in "Sent" tab
```

## Persistence: Server Restart

```
Server running normally:
┌─────────────────────────────────────────┐
│          Backend Server                 │
│  - Express listening on :5000           │
│  - Worker processing jobs               │
│  - Redis queue has jobs                 │
│  - SQLite has metadata                  │
└─────────────────────────────────────────┘

Critical state:
- Email scheduled for in 5 minutes
- Job in Redis queue with 5 min delay
- Metadata in SQLite

USER CRASHES SERVER: Ctrl+C
    │
    ▼
┌─────────────────────────────────────────┐
│      CRITICAL DATA STATE                │
│  SQLite on disk:     SAFE ✓             │
│  Redis dump:         SAFE ✓             │
│  Queue jobs:         SAFE ✓             │
│  In-memory state:    LOST              │
└─────────────────────────────────────────┘

USER RESTARTS SERVER: npm run dev
    │
    ▼
Express starts
Redis connects
    │
    ▼
initScheduler() → recoverPersistentJobs()
    │
    ▼
SELECT * FROM emails WHERE status='scheduled'
    │
    ▼
Find: "Email 1, scheduled at X, status=scheduled"
    │
    ▼
Check: Is X in the future?
  Yes! Calculate remaining delay:
  delay = (X * 1000) - Date.now()
    │
    ▼
emailQueue.add({...}, { delay: remainingDelay })
    │
    ▼
UPDATE emails SET job_id='job-67890' WHERE id=1
    │
    ▼
Worker continues as if nothing happened
    │
    ▼
In 5 minutes: Email sends at EXACT scheduled time
    │
    ▼
RESULT: No emails lost! 🎉
```

## System States

```
┌─────────────────────────────────────────────────┐
│           EMAIL LIFECYCLE                       │
│                                                 │
│  [CREATED] → [SCHEDULED] → [SENT] → [DONE]    │
│                 ↓                               │
│            [FAILED] ← (on error)                │
│                                                 │
└─────────────────────────────────────────────────┘

    CREATED: User submits form
         ↓
    SQLite: insert rows
    Redis: create job
         ↓
    SCHEDULED: Waiting for scheduled time
         ↓
    Worker: delay expires
    Call: sendEmail()
         ↓
    SUCCESS: SENT ✓
    SQLite: status='sent'
    Redis: cleanup
    Display: "Sent" tab
         ↓
    OR
         ↓
    FAILURE: FAILED ✗
    SQLite: status='failed', store error
    Redis: retry (up to 3 times)
    Display: "Failed" tab with error
```

## Queue Behavior Under Load

```
LIGHT LOAD (1-10 emails/hour)
┌─────────────────────────────┐
│ Redis Queue                 │
│ [Job-1] [Job-2] [Job-3]    │ → Processing smoothly
│                             │
│ Processed instantly         │
└─────────────────────────────┘

MEDIUM LOAD (100-1000 emails/hour)
┌──────────────────────────────────┐
│ Redis Queue                      │
│ [Job-1] [Job-2] ... [Job-500]   │ → Some queuing
│                                  │
│ Few second delay                 │
└──────────────────────────────────┘

HEAVY LOAD (10,000+ emails/hour)
┌────────────────────────────────────────┐
│ Redis Queue                            │
│ [Job-1] ... [Job-10000]               │ → Significant queue
│                                        │
│ Scale by adding more workers!          │
│                                        │
│ Instance 1: Process jobs 1-3333        │
│ Instance 2: Process jobs 3334-6667     │
│ Instance 3: Process jobs 6668-10000    │
└────────────────────────────────────────┘

All instances:
- Share same Redis queue
- Share same SQLite database
- Jobs distributed automatically
- No duplicate processing
```

## Security Considerations

```
┌────────────────────────────────────────────────────────┐
│                   Current State                        │
│  (Development - No Authentication)                     │
│                                                        │
│  Anyone can:                                           │
│  ✗ Schedule emails                                     │
│  ✗ View all emails                                     │
│  ✗ See scheduled times                                 │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│               Production Ready State                   │
│  (Add Authentication & Security)                      │
│                                                        │
│  Frontend ─── HTTPS ──→ Backend                        │
│               JWT Token                                │
│                                                        │
│  Backend checks JWT token on every request             │
│                                                        │
│  Database credentials in environment variables         │
│  Redis password protected                              │
│  API Rate limiting enabled                             │
│  CORS configured for specific domains                  │
│  All inputs validated & sanitized                      │
│  Error messages don't leak internal details            │
└────────────────────────────────────────────────────────┘
```

## Monitoring Checklist

```
QUEUE HEALTH
□ Normal: 0-100 pending jobs
□ Warning: 100-1000 pending jobs
□ Critical: 1000+ pending jobs

DATABASE HEALTH
□ Response time: < 100ms
□ Connection pool: > 1 free connection
□ Max connections: < 80% used

REDIS HEALTH
□ Memory: < 80% of max
□ Connected clients: < 500
□ Keyspace: growing but stable

WORKER HEALTH
□ Processing jobs: Active
□ Errors: < 1%
□ Average job time: < 5 seconds

API HEALTH
□ Response time: < 500ms
□ Error rate: < 0.1%
□ CPU: < 70%
□ Memory: stable
```
