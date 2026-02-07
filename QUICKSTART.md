# Quick Start Guide

## Option 1: Using Docker Compose (Recommended)

This is the easiest way - everything runs in containers including Redis.

```bash
# From the project root
docker-compose up -d

# Wait a few seconds for services to start
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

To view logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

To stop:
```bash
docker-compose down
```

---

## Option 2: Local Development (With Redis)

### Prerequisites
- Redis running locally
- Node.js 16+

### Step 1: Start Redis

**Using redis-server directly:**
```bash
redis-server
```

**Using Docker (separate terminal):**
```bash
docker run -d -p 6379:6379 redis:latest
```

### Step 2: Start Backend

```bash
cd backend
npm install
npm run dev
```

Expected output:
```
Connected to SQLite database
Connected to Redis
Email service initialized with Ethereal Email
Email queue created
Emails table initialized or already exists
Email Scheduler Server running on port 5000
```

### Step 3: Start Frontend (New Terminal)

```bash
cd frontend
npm install
npm start
```

Frontend opens at `http://localhost:3000`

---

## Quick Test

### 1. Open Dashboard
Go to http://localhost:3000

### 2. Schedule Email for 2 minutes from now
- Fill in form:
  - To: `test@example.com`
  - Subject: `Hello World`
  - Body: `This is a test email`
  - Time: Select 2 minutes from now
- Click "Schedule Email"

### 3. Watch it Process
- Email should move to "Scheduled" tab
- After 2 minutes, checks "Sent" tab
- Console shows email preview URL

### 4. Test Persistence
- Schedule an email for 5 minutes from now
- Stop the backend (Ctrl+C in backend terminal)
- Restart backend
- Job should still be there - it recovered!

---

## View Email Preview

When an email is sent, Ethereal Email generates a preview link. Look in the backend console:

```
Email sent successfully
Message ID: <...>
Preview URL: https://ethereal.email/message/...
```

Click the link to see the email!

---

## Troubleshoot

### "Redis connection refused"
- Check if Redis is running: `redis-cli ping` should return `PONG`
- If using Docker Compose, ensure it's started: `docker-compose up -d`

### "Port 5000 already in use"
- Find and kill: `lsof -i :5000` (Mac/Linux) or `netstat -ano | findstr :5000` (Windows)
- Or change PORT in `.env`: `PORT=5001`

### "SQLITE_CANTOPEN"
- Backend will auto-create `data/` folder
- Manual: `mkdir -p backend/data`

### Frontend can't reach backend
- Check backend is running: `http://localhost:5000/health`
- Check .env CORS settings
- Or edit frontend `.env`: `REACT_APP_API_URL=...`

---

## Next Steps

1. ✅ System is running
2. Schedule test emails
3. Verify persistence by restarting
4. Ready for production!

See README.md for detailed documentation.
