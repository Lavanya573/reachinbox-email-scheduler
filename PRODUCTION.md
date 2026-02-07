# Production Deployment Guide

## Pre-Deployment Checklist

- [ ] Node.js 16+ installed
- [ ] Redis instance ready (or Docker)
- [ ] PostgreSQL database (optional, recommended)
- [ ] SMTP credentials (SendGrid, AWS SES, etc.)
- [ ] Environment variables configured
- [ ] SSL certificates ready
- [ ] Domain name ready

## 1. Replace Ethereal Email with Production SMTP

### Option A: SendGrid (Recommended)

Install dependency:
```bash
npm install @sendgrid/mail
```

Update `backend/src/services/emailService.js`:
```javascript
import sgMail from '@sendgrid/mail';

export async function initEmailService() {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('Using SendGrid for email delivery');
}

export async function sendEmail(to, subject, body) {
  try {
    const msg = {
      to,
      from: process.env.SENDER_EMAIL,
      subject,
      html: `<p>${body}</p>`,
    };
    
    const info = await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
    
    return {
      success: true,
      messageId: info[0].headers['x-message-id'],
    };
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
}
```

### Option B: AWS SES

```bash
npm install aws-sdk
```

Update `emailService.js`:
```javascript
import AWS from 'aws-sdk';

const ses = new AWS.SES({
  region: process.env.AWS_REGION,
});

export async function sendEmail(to, subject, body) {
  const params = {
    Source: process.env.SENDER_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: body } },
    },
  };

  try {
    const data = await ses.sendEmail(params).promise();
    return {
      success: true,
      messageId: data.MessageId,
    };
  } catch (error) {
    console.error('AWS SES error:', error);
    throw error;
  }
}
```

## 2. Database Migration

### From SQLite to PostgreSQL

Install PostgreSQL driver:
```bash
npm install pg
```

Update `backend/src/config/database.js`:
```javascript
import pg from 'pg';

const pool = new pg.Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

export async function initDatabase() {
  const client = await pool.connect();
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id SERIAL PRIMARY KEY,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      scheduled_time BIGINT NOT NULL,
      created_at BIGINT NOT NULL,
      sent_at BIGINT,
      status TEXT DEFAULT 'scheduled',
      job_id TEXT,
      error_message TEXT,
      created_at_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for performance
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_status ON emails(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_time ON emails(scheduled_time);
  `);
  
  client.release();
}

export async function runAsync(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}
```

## 3. Environment Configuration

Create `.env.production`:
```env
# Server
PORT=5000
NODE_ENV=production

# Database
DB_HOST=your-postgres-host.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=email_scheduler

# Redis
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Email Service
EMAIL_PROVIDER=sendgrid  # or aws_ses
SENDGRID_API_KEY=your-sendgrid-key
SENDER_EMAIL=noreply@yourdomain.com

# AWS SES (if using)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Security
JWT_SECRET=your-secure-random-string
API_KEY=your-api-key-for-external-callers

# Logging
LOG_LEVEL=info  # debug, info, warn, error
LOG_FORMAT=json
```

## 4. Deployment Options

### Option A: Docker Compose on VPS

SSH into your server:
```bash
ssh user@your-server.com

# Clone or upload project
git clone your-repo.git
cd email-scheduler

# Create .env files
nano .env.production
# Paste environment variables

# Build and start
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose logs -f backend
```

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis-data:/data
    command: redis-server --requirepass ${REDIS_PASSWORD}

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: always

  backend:
    build: ./backend
    ports:
      - '5000:5000'
    environment:
      - PORT=5000
      - REDIS_HOST=redis
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - DB_HOST=postgres
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - NODE_ENV=production
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
    depends_on:
      - redis
      - postgres
    restart: always

  frontend:
    build: ./frontend
    ports:
      - '3000:3000'
    environment:
      - REACT_APP_API_URL=https://api.yourdomain.com
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  redis-data:
  postgres-data:
```

### Option B: Heroku Deployment

```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login
heroku login

# Create app
heroku create email-scheduler

# Add Redis (Redis Cloud)
heroku addons:create heroku-redis:premium-0

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Option C: AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli --upgrade

# Initialize
eb init -p node.js-14 email-scheduler

# Create environment
eb create production

# Deploy
git push
eb deploy

# Monitor
eb status
```

## 5. Reverse Proxy Setup (Nginx)

Create `nginx.conf`:
```nginx
upstream backend {
  server backend:5000;
}

upstream frontend {
  server frontend:3000;
}

server {
  listen 80;
  server_name yourdomain.com www.yourdomain.com;

  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name yourdomain.com www.yourdomain.com;

  # SSL certificates
  ssl_certificate /etc/nginx/ssl/cert.pem;
  ssl_certificate_key /etc/nginx/ssl/key.pem;

  # API requests
  location /api/ {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Health check
  location /health {
    proxy_pass http://backend;
  }

  # Frontend
  location / {
    proxy_pass http://frontend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

## 6. Monitoring & Logging

### Systemd Service (Linux)

Create `/etc/systemd/system/email-scheduler.service`:
```ini
[Unit]
Description=Email Scheduler Service
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/email-scheduler
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10

Environment="PATH=/usr/local/bin:/usr/bin:/bin"
Environment="NODE_ENV=production"
EnvironmentFile=/opt/email-scheduler/.env

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable email-scheduler
sudo systemctl start email-scheduler
sudo systemctl status email-scheduler
```

### Logging with Winston

Install:
```bash
npm install winston
```

### PM2 Process Manager

```bash
npm install -g pm2

# Start and save config
pm2 start src/index.js --name email-scheduler
pm2 save
pm2 startup

# Monitor
pm2 monit
pm2 logs email-scheduler
```

## 7. Performance Optimization

### Redis Configuration
```conf
# redis.conf
maxmemory 1gb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
```

### Database Indexes
```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_status ON emails(status);
CREATE INDEX idx_scheduled_time ON emails(scheduled_time);
CREATE INDEX idx_created_at ON emails(created_at);
CREATE INDEX idx_job_id ON emails(job_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM emails WHERE status = 'scheduled';
```

### Connection Pooling
```javascript
// Configure pool size based on load
const pool = new pg.Pool({
  max: 20,           // max connections
  min: 2,            // min connections
  idle_in_transaction_session_timeout: 30000,
});
```

## 8. Backup Strategy

### PostgreSQL Backup
```bash
# Daily backup
pg_dump email_scheduler > backup-$(date +%Y%m%d).sql

# Or with Docker
docker exec postgres pg_dump -U postgres email_scheduler > backup.sql

# Restore
psql email_scheduler < backup.sql
```

### Redis Backup
```bash
# Redis RDB backup (automatic with appendonly)
# OR manual
redis-cli BGSAVE

# Copy snapshot file
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
```

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup/email-scheduler"

mkdir -p $BACKUP_DIR

# PostgreSQL
docker exec postgres pg_dump -U postgres email_scheduler | gzip > $BACKUP_DIR/db-$DATE.sql.gz

# Redis
docker exec redis redis-cli --rdb /data/dump-$DATE.rdb

# Upload to S3
aws s3 sync $BACKUP_DIR s3://my-backup-bucket/email-scheduler/

# Keep only 30 days
find $BACKUP_DIR -mtime +30 -delete
```

## 9. Monitoring & Alerting

### Health Checks
```bash
# Monitor endpoint availability
curl -f https://api.yourdomain.com/health || alert

# Monitor job processing
SELECT COUNT(*) FROM emails WHERE status='scheduled' AND scheduled_time < NOW();
# Alert if > threshold
```

### Key Metrics
```
- Jobs scheduled per hour
- Jobs processed per hour
- Average job processing time
- Failed jobs percentage
- Queue depth (pending jobs)
- Database response time
- Redis memory usage
```

## 10. Security Hardening

- [ ] Enable HTTPS/TLS (Let's Encrypt)
- [ ] Set strong database passwords
- [ ] Configure Redis password auth
- [ ] Enable API authentication (JWT)
- [ ] Implement rate limiting
- [ ] Use environment variables for secrets
- [ ] Enable database auditing
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Monitor error logs for attacks

## Rollback Plan

```bash
# Save current git hash
CURRENT=$(git rev-parse HEAD)

# Deploy previous version
git checkout previous-tag
npm install
npm run build

# If something goes wrong, revert
git checkout $CURRENT
npm install
npm run build

# Use Docker for zero-downtime
docker-compose -f docker-compose.yml -f docker-compose.blue-green.yml up -d
```

## Support & Troubleshooting

See README.md for common issues and solutions.

## Getting Help

- Check logs: `docker-compose logs -f backend`
- Monitor Redis: `redis-cli monitor`
- Check database: `psql` and run queries
- Check memory: `free -h` and `docker stats`
