# Email Job Scheduler - Complete System Overview

## 🎯 What You've Built

A **production-grade email scheduling system** that:
- ✅ Schedules emails to be sent at specific times
- ✅ Uses BullMQ + Redis for persistent job queue
- ✅ Survives server restarts without losing jobs
- ✅ Provides a beautiful React dashboard
- ✅ Demonstrates ReachInbox's core email scheduling technology

## 📁 Project Structure

```
reachinbox-assignment/
├── backend/                          # Node.js Express server
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # SQLite connection & initialization
│   │   ├── services/
│   │   │   ├── emailService.js      # Ethereal Email setup
│   │   │   └── schedulerService.js  # BullMQ queue & worker
│   │   ├── routes/
│   │   │   └── emailRoutes.js       # REST API endpoints
│   │   └── index.js                 # Express app entry point
│   ├── .env                          # Environment variables
│   ├── Dockerfile                    # Docker configuration
│   ├── package.json                  # Node dependencies
│   └── data/                         # SQLite database (created on first run)
│
├── frontend/                         # React dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── ScheduleForm.js      # Email scheduling form
│   │   │   ├── EmailList.js         # Email history table
│   │   │   └── Statistics.js        # Stats cards
│   │   ├── Dashboard.js             # Main container component
│   │   ├── index.js                 # React entry point
│   │   └── *.css                    # Styling
│   ├── public/
│   │   └── index.html               # HTML template
│   ├── Dockerfile                   # Docker configuration
│   └── package.json                 # React dependencies
│
├── docker-compose.yml               # Run everything with one command
├── README.md                         # Detailed documentation
├── QUICKSTART.md                     # Get started in 5 minutes
├── ARCHITECTURE.md                   # Design & how it works
├── PRODUCTION.md                     # Deploy to production
└── test-api.sh                       # API test examples
```

## 🚀 Quick Start (3 Steps)

### Step 1: Start Redis
```bash
# Using Docker (easiest)
docker run -d -p 6379:6379 redis:latest

# Or locally on Windows (WSL)
redis-server
```

### Step 2: Start Backend
```bash
cd backend
npm install
npm run dev

# Expected: "Email Scheduler Server running on port 5000"
```

### Step 3: Start Frontend
```bash
cd frontend
npm install
npm start

# Opens http://localhost:3000 automatically
```

✅ **System is running!**

## 💡 How It Works

### Scheduling an Email
1. User fills form: "Send email to user@example.com at 2 PM tomorrow"
2. Frontend sends POST to `/api/emails/schedule`
3. Backend:
   - Saves email metadata to SQLite database
   - Creates a BullMQ job in Redis queue with 2-hour delay
   - Returns job ID to frontend
4. User sees email in "Scheduled" tab

### Processing the Email
1. After 2 hours, BullMQ delay expires
2. Worker picks up job from Redis
3. Sends email via Ethereal (fake SMTP)
4. Updates database: `status = "sent"`, `sent_at = now`
5. User sees email moved to "Sent" tab

### Server Restarts (Persistence)
1. Server crashes while processing emails
2. SQLite stores all metadata
3. Redis (with persistence) stores all jobs
4. When server restarts:
   - Reads SQLite for unprocessed emails
   - For each scheduled email not yet sent:
     - Recalculates delay (time remaining)
     - Adds back to Redis queue
5. Jobs continue processing at correct time
6. **No emails lost!**

## 🔌 API Endpoints

### Schedule Email
```bash
curl -X POST http://localhost:5000/api/emails/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Hello",
    "body": "Test email",
    "scheduledTime": 1675000000
  }'
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
GET http://localhost:5000/api/emails
GET http://localhost:5000/api/emails?status=scheduled
GET http://localhost:5000/api/emails?status=sent
GET http://localhost:5000/api/emails?status=failed
```

### Get Statistics
```bash
GET http://localhost:5000/api/emails/stats/summary
```

### Health Check
```bash
GET http://localhost:5000/health
```

## 📊 Database Schema

### emails table
| Column | Type | Purpose |
|--------|------|---------|
| id | INTEGER | Unique email ID |
| to_email | TEXT | Recipient email |
| subject | TEXT | Email subject |
| body | TEXT | Email content |
| scheduled_time | INTEGER | Unix timestamp (when to send) |
| created_at | INTEGER | When scheduled (Unix timestamp) |
| sent_at | INTEGER | When actually sent (NULL until sent) |
| status | TEXT | 'scheduled', 'sent', or 'failed' |
| job_id | TEXT | BullMQ job ID |
| error_message | TEXT | Error details if failed |

## 🎨 Frontend Features

### Dashboard
- 📊 Real-time stats (scheduled, sent, failed count)
- 📋 Tabbed interface (Schedule, Scheduled, Sent)
- 🔄 Auto-refreshes every 5 seconds
- 📱 Responsive design (mobile-friendly)

### Schedule Form
- Email validation
- Date/time picker (future only)
- Error messages
- Success feedback

### Email Lists
- Sortable columns
- Status badges
- Email preview
- Timestamps

## 🛠️ Technology Stack

### Backend
- **Express.js** - REST API framework
- **BullMQ** - Job queue
- **Redis** - In-memory queue storage
- **SQLite** - Persistent metadata storage
- **Nodemailer** - Email sending
- **Ethereal Email** - Fake SMTP for testing

### Frontend
- **React 18** - UI library
- **Axios** - HTTP client
- **CSS Grid** - Responsive layouts
- **Fetch API** - Real-time updates

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy (production)

## 🔒 Reliability Features

### 1. Persistent Queue
- Jobs in Redis
- Metadata in SQLite
- Both survive crashes

### 2. Automatic Recovery
- On startup, reads SQLite for unprocessed jobs
- Reschedules with correct delays
- Zero job loss

### 3. Retry Logic
- 3 automatic retries
- Exponential backoff (2s, 4s, 8s)
- Failed jobs logged with error messages

### 4. Data Safety
- SQLite transactions
- Atomic job additions
- Consistent state after crash

## 📈 Scaling

### Single Instance
```
User → React → Express → SQLite
                      ↓
                    Redis + BullMQ
                      ↓
                   Ethereal
```

### Multiple Instances
```
Users → Load Balancer → Express Instance 1
                      → Express Instance 2  → Shared Redis
                      → Express Instance 3  → Shared SQLite
```

All instances share:
- One Redis instance (job queue)
- One SQLite/PostgreSQL database (metadata)
- Jobs distributed automatically

## 🧪 Testing

### Test Email in 2 Minutes
1. Open http://localhost:3000
2. Fill form:
   - To: `test@example.com`
   - Subject: `Test`
   - Body: `Hello`
   - Time: 2 minutes from now
3. Click "Schedule Email"
4. Watch status tab after 2 minutes
5. Email moves to "Sent" tab

### Test Persistence
1. Schedule email for 5 minutes from now
2. Stop backend: Ctrl+C
3. Wait 2 seconds
4. Restart backend: `npm run dev`
5. Open dashboard - email still there!
6. After 5 minutes, email sends correctly

## 📚 Documentation Files

- **README.md** - Full feature documentation
- **QUICKSTART.md** - 5-minute setup guide
- **ARCHITECTURE.md** - System design & data flow
- **PRODUCTION.md** - Deploy to production
- **test-api.sh** - API test examples

## 🚀 Deploy to Production

### Using Docker Compose (1 command)
```bash
docker-compose up -d
```

### Using Heroku
```bash
heroku create my-scheduler
git push heroku main
```

### Using AWS/Google Cloud
See PRODUCTION.md for detailed guides

## 🔄 Production Configuration

Update `.env.production`:
```env
# Replace Ethereal with SendGrid
SENDGRID_API_KEY=sg_your_key
SENDER_EMAIL=noreply@yourdomain.com

# Use PostgreSQL instead of SQLite
DB_HOST=your-postgres-host.com
DB_USER=postgres
DB_PASSWORD=your-password

# Secure Redis
REDIS_HOST=your-redis-host.com
REDIS_PASSWORD=your-password
```

See PRODUCTION.md for complete configuration.

## 🐛 Troubleshooting

### Redis not connecting
```bash
# Check Redis is running
redis-cli ping  # Should say PONG
```

### Port already in use
```bash
# Kill process using port 5000
lsof -i :5000  # Find PID
kill -9 <PID>
```

### Database locked
```bash
# Delete SQLite lock file
rm backend/data/emails.db-wal
rm backend/data/emails.db-shm
```

See README.md for more troubleshooting.

## ✨ Key Achievements

✅ **Reliable Scheduling** - BullMQ ensures no jobs lost  
✅ **Persistent** - Survives server restarts  
✅ **Scalable** - Multiple instances supported  
✅ **Production-Ready** - Error handling, retries, logging  
✅ **Beautiful UI** - Modern React dashboard  
✅ **Well-Documented** - Complete guides & examples  
✅ **Easy to Deploy** - Docker included  
✅ **Real-World Features** - Like ReachInbox itself  

## 🎓 Learning Value

This project demonstrates:
1. **Job Queues** - How BullMQ works at scale
2. **Persistence** - Combining SQLite + Redis
3. **Event-Driven** - Worker patterns & async processing
4. **Full-Stack** - React frontend → Node backend → Database
5. **DevOps** - Docker, Compose, production deployment

## 📞 Support

Issues or questions? Check:
1. README.md - Detailed documentation
2. QUICKSTART.md - Setup help
3. ARCHITECTURE.md - How it works
4. Backend console logs - Detailed errors
5. Browser developer tools - Frontend issues

## 🎉 You're Ready!

You now have a **production-grade email scheduler** that demonstrates the core technology behind ReachInbox's email infrastructure. 

Start the system and explore!

```bash
npm run dev  # Backend
npm start    # Frontend (in another terminal)
```

🚀 Happy scheduling!
