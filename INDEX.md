## 📧 Email Job Scheduler - Full Stack Project

**A production-grade email scheduling system demonstrating ReachInbox's core technology.**

---

 Quick Navigation

Getting Started
- **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 5 minutes
- **[README.md](./README.md)** - Full feature documentation

Understanding the System
- **[SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)** - Complete system summary
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Design decisions & data flow
- **[DIAGRAMS.md](./DIAGRAMS.md)** - Visual system architecture

Production Ready
- **[PRODUCTION.md](./PRODUCTION.md)** - Deploy to production
- **[docker-compose.yml](./docker-compose.yml)** - One-command deployment

 Testing
- **[test-api.sh](./test-api.sh)** - API test examples

---

 Start in 30 Seconds

```bash
# Terminal 1: Start Redis
docker run -d -p 6379:6379 redis:latest

# Terminal 2: Start Backend
cd backend && npm install && npm run dev

# Terminal 3: Start Frontend
cd frontend && npm install && npm start

# Open browser: http://localhost:3000




 Features

| Feature | Status |
|---------|--------|
| Schedule emails to send at specific time | ✅ Complete |
| Persistent job queue with BullMQ + Redis | ✅ Complete |
| Survive server restarts without losing jobs | ✅ Complete |
| React dashboard (schedule/view/stats) | ✅ Complete |
| Ethereal Email integration for testing | ✅ Complete |
| Email with automatic retry & backoff | ✅ Complete |
| SQLite database for persistence | ✅ Complete |
| REST API for automation | ✅ Complete |
| Docker & Docker Compose ready | ✅ Complete |
| Production deployment guide | ✅ Complete |

---

 API Endpoints

### Schedule an Email
```
POST /api/emails/schedule
{
  "to": "user@example.com",
  "subject": "Hello",
  "body": "Test email",
  "scheduledTime": 1675000000
}
```

### View Status
```
GET /api/emails
GET /api/emails?status=scheduled
GET /api/emails?status=sent
GET /api/emails?status=failed
GET /api/emails/:id
GET /api/emails/stats/summary
GET /health
```

---

## 💡 How It Works

### 1. Scheduling
```
User submits form
  ↓
Backend stores in SQLite
  ↓
BullMQ job created in Redis with delay
  ↓
User sees email in "Scheduled" tab
```

### 2. Delivery
```
Delay expires (scheduled time reached)
  ↓
Worker picks up job from Redis
  ↓
Sends email via Ethereal
  ↓
Updates SQLite: status='sent'
  ↓
User sees email in "Sent" tab
```

### 3. Persistence
```
Server crashes
  ↓
SQLite keeps all metadata
  ↓
Redis keeps job queue (with persistence)
  ↓
Server restarts
  ↓
System recovers unprocessed jobs
  ↓
Jobs resume at correct scheduled time
  ↓
NO JOBS LOST
```

---

 Reliability

- ✅ **Persistent Queue** - BullMQ + Redis + SQLite
- ✅ **Automatic Recovery** - On server restart
- ✅ **Retry Logic** - 3 attempts with exponential backoff
- ✅ **Error Tracking** - All failures logged
- ✅ **Scalable** - Multiple instances supported

---

 Deployment Options

### Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Local Development
```bash
# Install Redis first
redis-server

# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npm start
```

 Production
See [PRODUCTION.md](./PRODUCTION.md) for:
- Heroku deployment
- AWS deployment
- Google Cloud deployment
- Docker production setup
- Nginx configuration
- SSL/TLS setup

---

 Documentation Guide

| File | Purpose |
|------|---------|
| **QUICKSTART.md** | Get running fast |
| **README.md** | Complete features & API |
| **SYSTEM_OVERVIEW.md** | Project summary |
| **ARCHITECTURE.md** | Technical deep-dive |
| **DIAGRAMS.md** | Visual architecture |
| **PRODUCTION.md** | Deploy to production |

**Recommended reading order:**
1. Start with QUICKSTART.md (get it running)
2. Read SYSTEM_OVERVIEW.md (understand what you built)
3. Check ARCHITECTURE.md (how it works)
4. See PRODUCTION.md (deploy to production)

---

Technology Stack

**Backend:**
- Node.js + Express.js
- BullMQ (job queue)
- Redis (queue storage)
- SQLite (metadata)
- Nodemailer + Ethereal Email

**Frontend:**
- React 18
- Axios (HTTP)
- CSS Grid (layout)

**DevOps:**
- Docker & Docker Compose
- Nginx (reverse proxy)
- Environment variables

---

Architecture Summary

```
User Browser (React)
       ↓
Rest API (Express)
       ↓
    ┌──┴──┐
    ↓     ↓
 SQLite  Redis + BullMQ
    ↓     ↓
 Metadata Job Queue
    ↓     ↓
  [Persistence & Reliability]
     ↓
Email Service (Ethereal)
```

---

 Test It Out

### Step 1: Schedule email for 2 minutes from now
1. Open http://localhost:3000
2. Fill form with test data
3. Select time 2 minutes away
4. Click "Schedule Email"

### Step 2: Watch it process
1. Check "Scheduled" tab (email appears)
2. After 2 minutes, check "Sent" tab
3. Email status changes to "Sent"

### Step 3: Test persistence
1. Schedule email for 5 minutes from now
2. Stop backend (Ctrl+C)
3. Restart backend (npm run dev)
4. Email still there! It will send at correct time

---

 Learning Outcomes

By exploring this project, you'll learn:

1. **Job Scheduling** - How BullMQ works
2. **Persistent Queues** - Combine Redis + SQLite
3. **Worker Patterns** - Process jobs asynchronously
4. **Database Design** - Schema for email metadata
5. **Full-Stack Development** - React + Node + Database
6. **REST APIs** - Build production APIs
7. **Error Handling** - Retries & backoff
8. **Deployment** - Docker & production setup
9. **System Design** - Architecture patterns
10. **Monitoring** - Health checks & logging

---

## 🐛 Troubleshooting

### Can't find your issue?
- Check **README.md** - Common issues section
- Check **ARCHITECTURE.md** - How components connect
- Check backend console logs for errors
- Check browser developer tools for frontend errors

### Quick fixes:

**Port already in use:**
```bash
# Find and kill process using port 5000
lsof -i :5000
kill -9 <PID>
```

**Redis not connecting:**
```bash
redis-cli ping  # Should return PONG
```

**Database locked:**
```bash
rm backend/data/emails.db-wal
rm backend/data/emails.db-shm
```

---



---



```bash
cd backend && npm install && npm run dev
# In another terminal
cd frontend && npm install && npm start
```

Then open **http://localhost:3000** and start scheduling emails!



**Issues?** See README.md troubleshooting section.

**Ready for production?** See PRODUCTION.md for deployment guides.

🚀 **Happy scheduling!**
