# Email Job Scheduler - Full Stack Application

A production-grade email job scheduler system that reliably schedules and sends emails at scale using BullMQ + Redis.

## Features

✅ **API-Based Email Scheduling** - Accept email requests via REST APIs
✅ **Persistent Job Queue** - BullMQ + Redis ensures no jobs are lost on server restart
✅ **Real Email Sending** - Ethereal Email integration for testing/development
✅ **Automatic Job Recovery** - Survives server restarts without losing scheduled emails
✅ **Frontend Dashboard** - Schedule emails, view status, track sent/failed emails
✅ **Production Ready** - Error handling, retries, exponential backoff

## System Architecture

```
┌─────────────────┐
│  React Frontend │ (Port 3000)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Express API    │ (Port 5000)
│  - Schedule     │
│  - Status       │
│  - Stats        │
└────────┬────────┘
         │
    ┌────┴─────┐
    ↓          ↓
┌────────┐  ┌──────────┐
│ SQLite │  │  Redis   │
│  DB    │  │ + BullMQ │
└────────┘  └──────────┘
    ↓
┌──────────────┐
│ Ethereal     │
│ Email        │
│ (SMTP Test)  │
└──────────────┘
```

## Prerequisites

- Node.js 16+ 
- Redis Server (local or remote)
- npm or yarn

## Installation & Setup

### 1. Install Redis

**Windows (using WSL):**
```bash
# Install WSL first (Windows Subsystem for Linux)
# Then in WSL:
sudo apt-get install redis-server
# Start Redis
redis-server
```

**macOS (using Homebrew):**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

**Docker (All platforms):**
```bash
docker run -d -p 6379:6379 redis:latest
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

Server will start on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Dashboard will open at `http://localhost:3000`

## API Endpoints

### Schedule an Email
```bash
POST /api/emails/schedule
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Hello World",
  "body": "This is my scheduled email",
  "scheduledTime": 1675000000  // Unix timestamp in seconds
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "jobId": "job-123",
    "scheduledTime": 1675000000,
    "status": "scheduled"
  }
}
```

### Get All Emails
```bash
GET /api/emails
GET /api/emails?status=scheduled
GET /api/emails?status=sent
GET /api/emails?status=failed
```

### Get Single Email
```bash
GET /api/emails/:id
```

### Get Statistics
```bash
GET /api/emails/stats/summary
```

### Health Check
```bash
GET /health
```

## Database Schema

### Emails Table
```sql
CREATE TABLE emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_time INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  sent_at INTEGER,
  status TEXT DEFAULT 'scheduled',  -- 'scheduled', 'sent', 'failed'
  job_id TEXT,
  error_message TEXT
);
```

## Key Features Explained

### 1. Persistent Job Scheduling
- Jobs are stored in both SQLite (metadata) and Redis/BullMQ (queue)
- On server restart, the system recovers unprocessed jobs
- Only reschedules jobs whose scheduled time hasn't passed yet

### 2. Earthquake-proof (Server Restarts)
- SQLite stores all email metadata
- BullMQ in Redis ensures jobs persist
- On startup, jobs are automatically recovered and rescheduled

### 3. Email Service
- Uses Ethereal Email (free fake SMTP)
- Perfect for testing without sending real emails
- In production, swap for SendGrid, AWS SES, etc.

### 4. Retry Logic
- Automatic retry with exponential backoff
- 3 attempts per email by default
- Failed emails are tracked with error messages

## Configuration

Edit `backend/.env` to customize:
```env
PORT=5000
REDIS_HOST=localhost
REDIS_PORT=6379
DB_PATH=./data/emails.db
NODE_ENV=development
```

## Testing the System

### Test Email 1: Schedule for 2 minutes from now
```bash
curl -X POST http://localhost:5000/api/emails/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "body": "This is a test!",
    "scheduledTime": '$(( $(date +%s) + 120 ))
  }'
```

### Test Server Restart
1. Schedule an email for 5 minutes from now
2. Stop the backend server (Ctrl+C)
3. Wait a few seconds
4. Restart the backend server
5. Check the dashboard - job should still be there!

### View Email Preview
When emails are sent, Ethereal Email generates a preview URL in the console:
```
Preview URL: https://ethereal.email/message/...
```

## Project Structure

```
reachinbox-assignment/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js       (SQLite connection)
│   │   ├── services/
│   │   │   ├── emailService.js   (Ethereal Email setup)
│   │   │   └── schedulerService.js (BullMQ worker)
│   │   ├── routes/
│   │   │   └── emailRoutes.js    (API endpoints)
│   │   └── index.js              (Express server)
│   ├── .env                       (Configuration)
│   ├── package.json
│   └── data/                      (SQLite DB location)
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ScheduleForm.js    (Form to schedule emails)
    │   │   ├── EmailList.js       (Display email list)
    │   │   └── Statistics.js      (Show stats)
    │   ├── Dashboard.js           (Main component)
    │   ├── index.js
    │   └── index.html
    └── package.json
```

## Debugging

### Check Redis Connection
```bash
redis-cli ping  # Should return PONG
redis-cli keys "*"  # See all keys
```

### Check Database
```bash
sqlite3 data/emails.db
> SELECT * FROM emails;
```

### View Logs
The console will show:
- Scheduled jobs
- Processing logs
- Email sent confirmations
- Error messages

## Scaling Considerations

1. **Multiple Workers**: Deploy multiple instances, all connected to same Redis
2. **Database**: SQLite is fine for testing; use PostgreSQL for production
3. **Email Service**: Swap Ethereal for SendGrid, AWS SES, or similar
4. **Monitoring**: Add job event tracking and metrics

## Troubleshooting

**Issue: "Redis connection refused"**
- Ensure Redis is running: `redis-cli ping`
- Check REDIS_HOST and REDIS_PORT in .env

**Issue: "SQLITE_CANTOPEN"**
- Ensure `data/` directory exists (will be created automatically)
- Check file permissions

**Issue: Frontend can't reach backend**
- Ensure backend is running on port 5000
- Check CORS settings in `backend/src/index.js`

## License

MIT
