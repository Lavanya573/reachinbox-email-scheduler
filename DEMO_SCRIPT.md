# Demo Script - Email Job Scheduler

**Duration**: 5 minutes  
**Objective**: Demonstrate core features and automatic recovery on restart

---

## 📹 Demo Outline

### Part 1: Application Overview (30s)
### Part 2: Scheduling Emails via Frontend (1m)
### Part 3: Dashboard Display (1m)
### Part 4: Restart Scenario (1.5m)
### Part 5: Rate Limiting Under Load (1m)

---

## 🎬 PART 1: Application Overview (30 seconds)

### Step 1a: Show System Running
```bash
# Terminal 1: Verify Docker services
docker compose ps
```

**Expected Output**:
```
NAME                       STATUS
email-scheduler-redis      Up 10 seconds (healthy)
email-scheduler-backend    Up 8 seconds
email-scheduler-frontend   Up 6 seconds
```

**Narrate**: "The Email Job Scheduler is a production-grade system with three main components:
- Frontend dashboard (React) on port 3000
- Backend API (Express + BullMQ) on port 5000
- Redis queue for persistent job storage on port 6379

All services are running in Docker containers."

### Step 1b: Show Architecture Diagram
```bash
# Open browser to README
# Navigate to "Architecture Overview" section
```

**Narrate**: "The system uses BullMQ on top of Redis for reliable job scheduling. When you schedule an email, it gets stored in SQLite and queued in Redis. The BullMQ worker processes jobs at their scheduled time and sends emails via Ethereal SMTP."

---

## 🎬 PART 2: Scheduling Emails via Frontend (1 minute)

### Step 2a: Open Frontend Dashboard
```
URL: http://localhost:3000
```

**Visual**: Show the frontend with three tabs: "Schedule", "Scheduled", "Sent"

**Narrate**: "Let's schedule three emails with different send times."

### Step 2b: Schedule Email 1 (Immediate - 10 seconds)
1. Click **"Schedule"** tab
2. Fill form:
   ```
   To: test1@example.com
   Subject: Quick Email Test
   Body: This email should send in 10 seconds
   Schedule Time: Current time + 10 seconds
   ```
3. Click **"Schedule Email"** button
4. Show success message

**Narrate**: "First email scheduled to send in 10 seconds. Notice the green success message."

### Step 2c: Schedule Email 2 (30 seconds delay)
1. Fill form:
   ```
   To: test2@example.com
   Subject: Medium Delay Test
   Body: This email sends after 30 seconds
   Schedule Time: Current time + 30 seconds
   ```
2. Click **"Schedule Email"**

**Narrate**: "Second email scheduled for 30 seconds out."

### Step 2d: Schedule Email 3 (1 minute delay)
1. Fill form:
   ```
   To: test3@example.com
   Subject: Long Delay Test
   Body: This email sends after 1 minute
   Schedule Time: Current time + 60 seconds
   ```
2. Click **"Schedule Email"**

**Narrate**: "Third email scheduled for 1 minute. Now let's view the dashboard to see these pending emails."

---

## 🎬 PART 3: Dashboard Display (1 minute)

### Step 3a: Show Scheduled Tab
1. Click **"Scheduled"** tab
2. Show table with 3 pending emails

**Color**: Yellow badges with ⏱️ Scheduled status

**Narrate**: "The Scheduled tab shows all emails waiting to be sent. Each row displays:
- Email ID and recipient
- Subject and status badge
- Created time and scheduled send time"

**Table columns**:
```
ID | To             | Subject              | Status    | Created  | Scheduled
1  | test1@...      | Quick Email Test     | ⏱️ Sch... | 16:42... | 16:42:45
2  | test2@...      | Medium Delay Test    | ⏱️ Sch... | 16:42... | 16:43:15
3  | test3@...      | Long Delay Test      | ⏱️ Sch... | 16:42... | 16:43:45
```

### Step 3b: Statistics Cards
Show the statistics section:
```
📊 Scheduled: 3
✓ Sent: 0
✗ Failed: 0
```

**Narrate**: "The statistics cards show real-time counts. We have 3 pending emails, 0 sent, and 0 failed."

### Step 3c: Demonstrate Real-Time Updates
Wait 15 seconds, then click **"Sent"** tab

**Narrate**: "Let's check the Sent tab. The first email should have automatically sent by now..."

### Step 3d: Show Sent Tab
1. Click **"Sent"** tab
2. Show completed email with preview link

**Expected**:
```
ID | To             | Subject             | Status   | Sent     | View Email
1  | test1@...      | Quick Email Test    | ✓ Sent   | 16:42:55 | 📧 Preview
```

**Narrate**: "The Sent tab shows completed emails. Notice the green ✓ Sent badge and the Preview button. Let me click it to show the actual email content."

### Step 3e: Click Preview Button
1. Click **"📧 Preview"** button
2. Opens new tab with Ethereal preview

**Narrate**: "This opens Ethereal's web interface showing the complete email - subject, body, HTML rendering, and all headers. This is how we verify the email was sent correctly."

**Close preview tab**

---

## 🎬 PART 4: Restart Scenario - Automatic Recovery (1.5 minutes)

### Step 4a: Show Backend Logs (Before Restart)
```bash
# Terminal 2: Watch backend logs
docker logs -f email-scheduler-backend
```

**Narrate**: "Let's examine the backend logs. You can see it's processing the scheduled emails and sending them at the correct times. Now, here's the critical test - what happens if the server crashes?"

### Step 4b: Stop the Backend
```bash
# Terminal 3: Stop backend (simulate crash)
docker compose stop email-scheduler-backend
```

Wait 3 seconds

**Narrate**: "I just stopped the backend server, simulating a crash. The system has lost the in-memory worker, but notice - emails 2 and 3 haven't been sent yet. Since they're stored in both SQLite and Redis, they won't be lost."

### Step 4c: Check Frontend During Downtime
```
http://localhost:3000 → Will show "Cannot reach server"
```

**Narrate**: "The frontend can't connect to the API because the backend is down. But the data is safe."

Wait another 5 seconds

### Step 4d: Restart Backend
```bash
# Terminal 3: Restart backend
docker compose start email-scheduler-backend
```

**Narrate**: "Now I'm restarting the backend. Watch what happens..."

### Step 4e: Show Recovery in Logs
```bash
# Look at logs showing:
# 1. Database connection
# 2. "Found X scheduled emails from previous sessions"
# 3. "Recovered email ID Y with new job ID Z"
```

**Expected logs**:
```
Connected to SQLite database
Emails table initialized
Found 2 scheduled emails from previous sessions
Recovered email ID 2 with new job ID 3
Recovered email ID 3 with new job ID 4
Connected to Redis
Email queue created
Email queue created
Email Scheduler Server running on port 5000
```

**Narrate**: "Look at the logs! The system recovered 2 pending emails and re-added them to the queue with adjusted delays. The scheduler recalculates how long to wait based on the scheduled send time."

### Step 4f: Frontend Comes Back Online
Refresh http://localhost:3000

**Narrate**: "Now the frontend is back online. Let's check the Scheduled tab again."

Click **"Scheduled"** tab

**Expected**:
- Email 2 is still there (waiting to send)
- Email 3 is still there (waiting to send)

Click **"Sent"** tab

**Expected**:
- Email 1 is there (sent before restart)

**Narrate**: "Perfect! The system recovered seamlessly. Both pending emails are still in the queue with their correct scheduled times. The server will send them automatically."

### Step 4g: Wait and Show Emails Auto-Sending
Wait 20 seconds (for emails 2 & 3 to send)

Refresh **"Sent"** tab

**Expected**:
```
ID | To             | Subject              | Status   | Sent     | View Email
1  | test1@...      | Quick Email Test     | ✓ Sent   | 16:42:55 | 📧 Preview
2  | test2@...      | Medium Delay Test    | ✓ Sent   | 16:43:15 | 📧 Preview
3  | test3@...      | Long Delay Test      | ✓ Sent   | 16:43:45 | 📧 Preview
```

**Narrate**: "All three emails have been sent successfully, even though we restarted the server. This is the magic of persistence - no email is ever lost, and the scheduler automatically resumes where it left off."

---

## 🎬 PART 5: Rate Limiting & Concurrency Under Load (1 minute)

### Step 5a: Explain Current Configuration
```bash
# Open: backend/src/services/schedulerService.js
# Show concurrency setting (scroll to setupWorker section)
```

**Current code**:
```javascript
const worker = new Worker(QUEUE_NAME, jobProcessor, {
  connection: redisConnection,
  // No concurrency limit = 1 at a time (safe, sequential)
});
```

**Narrate**: "Currently, the worker processes emails one at a time. This is safe and prevents email storms, but we can configure it for higher throughput."

### Step 5b: Show Scaling Code
```javascript
// Example for concurrency:
const worker = new Worker(QUEUE_NAME, jobProcessor, {
  connection: redisConnection,
  concurrency: 5,  // Max 5 emails in parallel
  limiter: {
    max: 10,           // 10 emails
    duration: 60000,   // per 60 seconds (rate limit)
  }
});
```

**Narrate**: "To handle load, you would set concurrency and add a limiter. For example:
- Concurrency 5: Process max 5 emails simultaneously
- Limiter 10/min: Never exceed 10 emails per minute

This prevents overwhelming your mail server."

### Step 5c: Schedule Multiple Emails (Bonus Demo)
If time permits:

1. Go to **Schedule** tab
2. Schedule 5 emails with same send time (30 seconds from now)
3. Show them all in **Scheduled** tab
4. Wait for send time
5. Show all in **Sent** tab within a few seconds

**Backend logs show**:
```
Processing job 1: sending email...
Processing job 2: sending email...
Processing job 3: sending email...
Processing job 4: sending email...
Processing job 5: sending email...
```

**Narrate**: "Each email processes sequentially. With higher concurrency settings, they would process in parallel. The current setup is conservative - perfect for reliability, scalable for performance."

---

## 📊 Demo Script Summary

**Total Time**: ~5 minutes

| Part | Duration | Key Takeaway |
|------|----------|--------------|
| 1. Overview | 30s | System architecture & components |
| 2. Scheduling | 1m | Frontend scheduling functionality |
| 3. Dashboard | 1m | Real-time status tracking |
| 4. Restart | 1.5m | **Automatic recovery on crash** |
| 5. Load | 1m | Concurrency & rate limiting config |

---

## 🔧 Prerequisites for Demo

**Before recording**:
1. Ensure Docker containers are running:
   ```bash
   docker compose up -d
   ```

2. Clear any old database (fresh start):
   ```bash
   docker compose down
   rm -rf backend/data
   docker compose up -d
   ```

3. Open three terminals:
   - Terminal 1: Frontend navigation
   - Terminal 2: Backend logs
   - Terminal 3: Docker commands

4. Open browser to http://localhost:3000

---

## 💡 Pro Tips for Recording

1. **Use browser zoom**: Zoom to 150% so UI is readable on video
2. **Narrate clearly**: Explain what you're doing as you do it
3. **Pause between actions**: Let viewers see results before moving on
4. **Show timestamps**: Mention current time when scheduling emails
5. **Use cursor**: Point to important UI elements
6. **Terminal text**: Make terminal font larger (50+ pt)

---

## 🎯 Key Messages to Emphasize

1. **"Scheduled emails send automatically at the right time"**
2. **"The database stores all records permanently"**
3. **"Redis queue ensures no job is lost even on crash"**
4. **"On restart, the system recovers all pending emails"**
5. **"Real-time dashboard shows email status instantly"**
6. **"Rate limiting can be configured for any load"**

---

## 📝 Script Templates

### Opening Narration
"This is the Email Job Scheduler - a production-grade system for reliably sending emails at scheduled times. It uses Express.js, Redis, BullMQ, and SQLite for persistent, recoverable job scheduling. Let me walk you through how it works."

### Feature Narration
"One of the critical features is automatic recovery. Even if the server crashes while emails are pending, they won't be lost. The system stores every email in both SQLite and Redis. When the server restarts, it automatically recalculates the remaining delay and resumes sending."

### Closing Narration
"This architecture ensures zero job loss, automatic recovery, and scalable rate limiting. The frontend provides real-time status updates, and the backend delivers reliable email scheduling at scale."

---

## 🎬 Recording Tips

**Suggested tool**: OBS Studio (free)
- Set resolution: 1920x1080
- Set recording bitrate: 5000 kbps
- Set framerate: 30 fps

**Edit for final video**:
- Add intro title (10s)
- Add closing title (5s)
- Speed up waiting periods 2x
- Add text overlays for important steps
- Keep narration clear and concise

---

**Equipment Needed**:
- Computer running the application
- Microphone for narration
- Screen recording software
- Video editor (optional, for polish)

**Estimated time to record**: 10-15 minutes (to get one good 5-minute take)
