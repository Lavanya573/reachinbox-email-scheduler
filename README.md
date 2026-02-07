# Email Job Scheduler - Full Stack Application

A production-grade email job scheduler system with persistent job queue, automatic recovery, and real-time dashboard.

**Repository**: https://github.com/Lavanya573/reachinbox-email-scheduler

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Docker & Docker Compose
- Git

### Run Everything with Docker

```bash
cd reachinbox-assignment
docker compose up -d
```

Access:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Redis**: localhost:6379

---

## 📋 Architecture Overview

### System Architecture

```
┌─────────────────────┐
│   React Frontend    │ (Port 3000)
│ - Schedule emails   │
│ - View sent/pending │
│ - Statistics        │
└──────────┬──────────┘
           │
           ↓ (REST API)
┌──────────────────────────┐
│   Express.js Backend     │ (Port 5000)
│ - Email Routes           │
│ - Input Validation       │
│ - Job Scheduling         │
└──┬─────────────────────┬──┘
   │                     │
   ↓                     ↓
┌─────────────────┐  ┌──────────────────┐
│   SQLite DB     │  │  Redis + BullMQ  │
│ - Persistence   │  │ - Job Queue      │
│ - Email Records │  │ - Delayed Jobs   │
└─────────────────┘  └────────┬─────────┘
                               │
                               ↓
                    ┌────────────────────┐
                    │  BullMQ Worker     │
                    │ - Process jobs     │
                    │ - Send emails      │
                    │ - Store results    │
                    └─────────┬──────────┘
                              │
                              ↓
                    ┌────────────────────┐
                    │  Ethereal Email    │
                    │  (Test SMTP)       │
                    └────────────────────┘
```

### How It Works

#### 1. **Email Scheduling Flow**
```
User submits email form
    ↓
Express validates input
    ↓
Stores in SQLite database (persistent record)
    ↓
Adds job to Redis queue with delay
    ↓
BullMQ worker waits for scheduled time
    ↓
When time arrives → Sends via Ethereal SMTP
    ↓
Updates database with sent_at, status, preview_url
    ↓
Frontend displays result with clickable email preview
```

#### 2. **Persistence on Restart** (Automatic Job Recovery)

```javascript
// On server startup:
// 1. Read all emails with status='scheduled' from SQLite
// 2. For each email, calculate remaining delay until scheduled_time
// 3. Re-add to Redis queue with updated delay
// 4. Server resumes sending emails without losing any jobs
```

**Location**: `backend/src/services/schedulerService.js` → `recoverPersistentJobs()`

Key Benefits:
- ✅ No job loss on server crash
- ✅ No manual re-scheduling needed
- ✅ Automatic resume on startup
- ✅ Database + Redis = dual persistence

#### 3. **Rate Limiting** (Planned Implementation)

Current concurrency: BullMQ processes jobs sequentially (1 worker instance)

To add rate limiting:
```javascript
// In schedulerService.js, configure concurrency:
const worker = new Worker(QUEUE_NAME, jobProcessor, {
  connection: redisConnection,
  concurrency: 5, // Max 5 emails in parallel
  limiter: {
    max: 10,           // Max 10 jobs
    duration: 60000,   // Per 60 seconds (rate limit)
  }
});
```

#### 4. **Concurrency Control**

**Current**: Single worker processes one job at a time (safe, reliable)

**To scale**:
```javascript
// Run multiple worker instances:
node worker1.js  // Process queue
node worker2.js  // Process queue
node worker3.js  // Both read from same Redis queue
                 // BullMQ automatically distributes jobs
```

**Job Distribution**:
- BullMQ uses Redis locks to ensure each job processes only once
- Multiple workers pull from same queue
- Failed jobs automatically retry (current: 3 attempts)

---

## 🔧 Setup Instructions

### Backend Setup

#### 1. Install Dependencies
```bash
cd backend
npm install
```

#### 2. Environment Variables

Create `.env` file in `backend/` directory:

```env
# Server
PORT=5000
NODE_ENV=production

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Database
DB_PATH=./data/emails.db

# Ethereal Email (Test SMTP)
# Auto-generated on first run, shown in logs
```

#### 3. Setup Ethereal Email

**Option A: Automatic (Recommended)**
- Server automatically creates test account on first run
- Check logs: `Email service initialized with Ethereal Email`
- Account email shown in logs: `Ethereal Account: xxxx@ethereal.email`

**Option B: Manual**
1. Go to https://www.ethereal.email/
2. Click "Create Ethereal Account"
3. Copy credentials
4. Update backend code in `src/services/emailService.js`:
```javascript
// Manual account config
const etherealAccount = {
  user: 'your-email@ethereal.email',
  pass: 'your-password',
  smtp: { host: 'smtp.ethereal.email', port: 587, secure: false }
};
```

#### 4. Redis Setup

**Option A: Docker** (Easiest)
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Option B: Local Installation**

Windows (WSL):
```bash
wsl
sudo apt-get install redis-server
redis-server
```

macOS:
```bash
brew install redis
brew services start redis
```

#### 5. Run Backend

**Development**:
```bash
cd backend
npm run dev
```

**Production**:
```bash
cd backend
npm start
```

Server will:
- Initialize SQLite database
- Connect to Redis
- Setup BullMQ worker
- Recover any pending emails
- Listen on port 5000

---

### Frontend Setup

#### 1. Install Dependencies
```bash
cd frontend
npm install
```

#### 2. Environment Variables

Create `.env` file in `frontend/` directory:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:5000
```

#### 3. Run Frontend

**Development**:
```bash
cd frontend
npm start
```

**Production Build**:
```bash
cd frontend
npm run build
# Serve build file:
npx serve -s build -l 3000
```

Frontend will open at http://localhost:3000

---

### Docker Compose (All-in-One)

Run everything together:

```bash
docker compose up -d
```

Services:
- Redis (port 6379)
- Backend (port 5000)  
- Frontend (port 3000)

View logs:
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f redis
```

Stop:
```bash
docker compose down
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/emails
```

### Endpoints

#### 1. Schedule Email
```http
POST /schedule

Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Subject line",
  "body": "Email body text",
  "scheduledTime": 1707350000  // Unix timestamp (seconds)
}

Response:
{
  "success": true,
  "emailId": 1,
  "jobId": "job-123",
  "message": "Email scheduled successfully"
}
```

**Validation Rules**:
- `to`: Valid email format (regex checked)
- `subject`: Required, non-empty
- `body`: Required, non-empty  
- `scheduledTime`: Must be future time (min 1 minute ahead)

#### 2. Get All Emails
```http
GET / (or /schedule?status=scheduled&status=sent)

Response:
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "to_email": "user@example.com",
      "subject": "Test",
      "body": "Email content",
      "scheduled_time": 1707350000,
      "status": "sent",
      "sent_at": 1707350045,
      "preview_url": "https://ethereal.email/message/xxxxx",
      "error_message": null
    }
  ]
}
```

#### 3. Get Single Email
```http
GET /:id

Response: Single email object
```

#### 4. Get Statistics
```http
GET /stats/summary

Response:
{
  "scheduled": 5,    // Waiting to send
  "sent": 12,        // Successfully sent
  "failed": 1        // Failed after retries
}
```

#### 5. Health Check
```http
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2026-02-07T16:42:01.901Z"
}
```

---

## 🎨 Frontend Features

### Dashboard Screens

#### 1. Schedule Tab
- **Form Fields**:
  - Email recipient (validated)
  - Subject (required)
  - Email body (required)
  - Date/time picker (future time only)
  
- **Feedback**:
  - Success message on schedule
  - Error messages for validation
  - Auto-clears form after success

#### 2. Scheduled Tab
- **Displays**: All emails with status `scheduled`
- **Columns**: ID, To, Subject, Status, Created, Scheduled, Sent
- **Status Badge**: ⏱️ Scheduled (yellow)

#### 3. Sent Tab
- **Displays**: All emails with status `sent` or `failed`
- **Additional Column**: "View Email" with 📧 Preview button
- **Preview Button**: 
  - Links to Ethereal's web interface
  - Shows full email rendering
  - Opens in new tab
- **Status Badges**: 
  - ✓ Sent (green) 
  - ✗ Failed (red)

#### 4. Statistics Cards
- **Scheduled Count**: Pending emails
- **Sent Count**: Successfully delivered
- **Failed Count**: After all retries
- **Real-time Updates**: Refreshes every 5 seconds

---

## ✨ Features Implemented

### Backend Features

#### Job Scheduling
- ✅ Accept email via REST API
- ✅ Validate email format, required fields
- ✅ Store in SQLite database
- ✅ Add to BullMQ queue with delay
- ✅ Process at scheduled time

#### Persistence & Recovery
- ✅ SQLite database stores all email records
- ✅ Automatic job recovery on server restart
- ✅ Recalculates remaining delay
- ✅ Re-adds to Redis queue
- ✅ No job loss on crashes

#### Error Handling
- ✅ Input validation with error messages
- ✅ Automatic retry (3 attempts)
- ✅ Exponential backoff (2s delay)
- ✅ Error message stored in database
- ✅ Failed emails marked with status

#### Concurrency Control
- ✅ Single worker instance (1 email at a time)
- ✅ BullMQ handles multiple queue instances
- ✅ Redis locks prevent duplicate processing
- ✅ Configurable workers for scaling

#### Rate Limiting
- ✅ Configurable concurrency (default: 1)
- ✅ Can add per-minute limits
- ✅ BullMQ limiter support built-in
- ✅ Ready for production scaling

#### Email Service
- ✅ Ethereal Email integration
- ✅ Auto test account creation
- ✅ Generates preview URLs
- ✅ HTML + text support
- ✅ Full email headers

#### Logging
- ✅ Connection status
- ✅ Job processing logs
- ✅ Error messages
- ✅ Preview URL generation
- ✅ Email recovery on startup

### Frontend Features

#### UI Components
- ✅ Schedule form with validation
- ✅ Email list table with sorting
- ✅ Statistics cards with counts
- ✅ Status badges (scheduled/sent/failed)
- ✅ Responsive design

#### Functionality
- ✅ Real-time email status updates (5s refresh)
- ✅ Tab-based navigation
- ✅ Form reset after submission
- ✅ Success/error message feedback
- ✅ Future time validation
- ✅ Email preview links for sent emails
- ✅ Date/time picker input

#### Design
- ✅ Color-coded status badges
- ✅ Professional styling
- ✅ Mobile responsive layout
- ✅ Hover effects on tables
- ✅ Clean typography

---

## 🔐 Security Considerations

- ✅ Input validation on backend
- ✅ Email regex validation
- ✅ SQL injection protection (parameterized queries)
- ✅ CORS enabled (localhost)
- ✅ Environment variables for secrets
- ⚠️ No authentication (add if needed)
- ⚠️ No rate limiting per user (add if needed)

---

## 📊 Database Schema

### Emails Table

```sql
CREATE TABLE emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,           -- Recipient email
  subject TEXT NOT NULL,             -- Email subject
  body TEXT NOT NULL,                -- Email body/content
  scheduled_time INTEGER NOT NULL,   -- Unix timestamp (seconds)
  created_at INTEGER NOT NULL,       -- When created
  sent_at INTEGER,                   -- When actually sent
  status TEXT DEFAULT 'scheduled',   -- 'scheduled', 'sent', 'failed'
  job_id TEXT,                       -- BullMQ job ID
  error_message TEXT,                -- Error details if failed
  preview_url TEXT                   -- Ethereal preview URL
);
```

### Redis Keys

- `email-queue` - BullMQ job queue
- `email-queue:* ` - Job data storage
- `redis-data` - Redis persistence volume (Docker)

---

## 🧪 Testing

### Manual API Testing

Schedule an email:
```bash
curl -X POST http://localhost:5000/api/emails/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "body": "This is a test",
    "scheduledTime": 1707350000
  }'
```

Get all emails:
```bash
curl http://localhost:5000/api/emails
```

Get statistics:
```bash
curl http://localhost:5000/api/emails/stats/summary
```

### Frontend Testing

1. Open http://localhost:3000
2. Go to "Schedule" tab
3. Fill in form with:
   - To: `test@example.com`
   - Subject: `Test`
   - Body: `Hello World`
   - Time: 5 minutes from now
4. Click "Schedule Email"
5. Go to "Scheduled" tab - see pending email
6. Wait for scheduled time
7. Go to "Sent" tab - see sent email
8. Click "📧 Preview" - opens Ethereal preview

---

## 🚀 Production Deployment

### Environment Setup

Create `.env.production`:
```env
PORT=5000
NODE_ENV=production
REDIS_HOST=redis-prod.example.com
REDIS_PORT=6379
DB_PATH=/var/data/emails.db
```

### Docker Production Build

```bash
docker build -t email-scheduler-backend:prod ./backend
docker build -t email-scheduler-frontend:prod ./frontend

docker run -d \
  --name backend \
  -p 5000:5000 \
  --env-file .env.production \
  email-scheduler-backend:prod

docker run -d \
  --name frontend \
  -p 3000:3000 \
  email-scheduler-frontend:prod
```

### Scaling Considerations

1. **Multiple Backend Instances**:
   - Each instance connects to same Redis
   - Each gets own BullMQ worker
   - Jobs distributed automatically

2. **Load Balancer** (nginx/HAProxy):
   - Route requests to multiple backend instances
   - Sticky sessions not needed (stateless)

3. **Database**:
   - SQLite works for ~10k emails
   - Upgrade to PostgreSQL for larger scale
   - Add indexes on `scheduled_time`, `status`

4. **Redis**:
   - Use Redis Cluster for high availability
   - Sentinel for failover
   - Enable persistence (RDB/AOF)

---

## 📦 Project Structure

```
reachinbox-assignment/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Express server entry
│   │   ├── config/
│   │   │   └── database.js          # SQLite setup
│   │   ├── services/
│   │   │   ├── emailService.js      # Ethereal integration
│   │   │   └── schedulerService.js  # BullMQ worker
│   │   └── routes/
│   │       └── emailRoutes.js       # API endpoints
│   ├── package.json
│   ├── .env
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── Dashboard.js             # Main container
│   │   ├── components/
│   │   │   ├── ScheduleForm.js     # Email form
│   │   │   ├── EmailList.js        # Email table
│   │   │   └── Statistics.js       # Stats cards
│   │   ├── Dashboard.css
│   │   └── components/*.css        # Component styles
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml               # All services
├── .gitignore
└── README.md
```

---

## 🐛 Troubleshooting

### Backend won't start

**Error**: `ECONNREFUSED` Redis connection
- **Solution**: Ensure Redis is running on port 6379
- Check: `docker ps` (should show redis container)

**Error**: `SQLITE_ERROR`
- **Solution**: Delete `backend/data/emails.db` and restart
- Backend will recreate it with correct schema

### Frontend shows empty tables
- Check: Network tab in browser dev tools
- Check: Backend logs for API errors
- Verify: `REACT_APP_API_URL` in `.env`

### Emails not sending
- Check: Backend logs for Ethereal errors
- Verify: Ethereal account created (check logs)
- Check: Scheduled time is in future

### Preview links broken
- Ensure: Email was successfully sent (status = 'sent')
- Verify: `preview_url` not null in database
- Check: Ethereal service (ethereal.email) is accessible

---

## 📞 Support & Contributing

For issues or questions:
1. Check logs: `docker compose logs`
2. Verify API: `curl http://localhost:5000/health`
3. Check database: `sqlite3 backend/data/emails.db`

---

## 📄 License

MIT License - See LICENSE file

---

**Last Updated**: February 7, 2026  
**Version**: 1.0.0
