import { Queue, Worker } from 'bullmq';
import Redis from 'redis';
import { sendEmail, initEmailService } from './emailService.js';
import { runAsync, allAsync } from '../config/database.js';

const QUEUE_NAME = 'email-queue';

let emailQueue = null;
let worker = null;
let redisClient = null;

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

const redisUrl = `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

export async function initScheduler() {
  try {
    // Initialize Redis connection with retry logic
    let retries = 0;
    const maxRetries = 10;
    let lastError;
    
    while (retries < maxRetries) {
      try {
        console.log(`Attempting to connect to Redis at ${redisUrl} (attempt ${retries + 1}/${maxRetries})...`);
        redisClient = Redis.createClient({
          url: redisUrl,
        });
        await redisClient.connect();
        console.log('Connected to Redis');
        break;
      } catch (error) {
        lastError = error;
        retries++;
        if (retries < maxRetries) {
          console.log(`Redis connection failed, retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (retries === maxRetries) {
      throw lastError || new Error('Failed to connect to Redis after maximum retries');
    }

    // Initialize email service
    await initEmailService();

    // Create email queue
    emailQueue = new Queue(QUEUE_NAME, {
      connection: redisConnection,
    });

    console.log('Email queue created');

    // Setup worker to process jobs
    setupWorker();

    // Recover unprocessed jobs from database on startup
    await recoverPersistentJobs();

    return { emailQueue, redisClient };
  } catch (error) {
    console.error('Failed to initialize scheduler:', error);
    throw error;
  }
}

function setupWorker() {
  worker = new Worker(QUEUE_NAME, jobProcessor, {
    connection: redisConnection,
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error: ${err.message}`);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });
}

async function jobProcessor(job) {
  try {
    console.log(`Processing job ${job.id}: sending email to ${job.data.to}`);

    const { to, subject, body, emailId } = job.data;

    // Send the email
    const result = await sendEmail(to, subject, body);

    // Update database - mark as sent
    const sentAt = Math.floor(Date.now() / 1000);
    const previewUrl = result.previewUrl || null;
    await runAsync(
      `UPDATE emails SET status = 'sent', sent_at = ?, job_id = ?, preview_url = ? WHERE id = ?`,
      [sentAt, job.id, previewUrl, emailId]
    );

    console.log(`Email scheduled for ID ${emailId} was sent`);
    if (previewUrl) {
      console.log(`Preview URL: ${previewUrl}`);
    }
    return result;
  } catch (error) {
    console.error(`Failed to process job ${job.id}:`, error.message);

    // Update database - mark as failed
    if (job.data.emailId) {
      await runAsync(
        `UPDATE emails SET status = 'failed', error_message = ? WHERE id = ?`,
        [error.message, job.data.emailId]
      );
    }

    throw error;
  }
}

export async function scheduleEmail(to, subject, body, scheduledTime) {
  try {
    // Store in database first
    const now = Math.floor(Date.now() / 1000);
    const result = await runAsync(
      `INSERT INTO emails (to_email, subject, body, scheduled_time, created_at, status) 
       VALUES (?, ?, ?, ?, ?, 'scheduled')`,
      [to, subject, body, scheduledTime, now]
    );

    const emailId = result.lastID;

    // Schedule job with BullMQ
    const delayMs = (scheduledTime * 1000) - Date.now();
    const job = await emailQueue.add(
      'send-email',
      {
        to,
        subject,
        body,
        emailId,
      },
      {
        delay: delayMs > 0 ? delayMs : 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      }
    );

    console.log(`Email scheduled with job ID: ${job.id}`);

    // Update database with job ID
    await runAsync(
      `UPDATE emails SET job_id = ? WHERE id = ?`,
      [job.id, emailId]
    );

    return {
      id: emailId,
      jobId: job.id,
      scheduledTime,
      status: 'scheduled',
    };
  } catch (error) {
    console.error('Error scheduling email:', error);
    throw error;
  }
}

async function recoverPersistentJobs() {
  try {
    // Find all scheduled emails
    const scheduledEmails = await allAsync(
      `SELECT * FROM emails WHERE status = 'scheduled'`
    );

    console.log(`Found ${scheduledEmails.length} scheduled emails from previous sessions`);

    for (const email of scheduledEmails) {
      const now = Math.floor(Date.now() / 1000);
      
      // Only reschedule if the scheduled time hasn't passed yet
      if (email.scheduled_time > now) {
        const delayMs = (email.scheduled_time * 1000) - Date.now();
        
        try {
          const job = await emailQueue.add(
            'send-email',
            {
              to: email.to_email,
              subject: email.subject,
              body: email.body,
              emailId: email.id,
            },
            {
              delay: delayMs > 0 ? delayMs : 0,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
              removeOnComplete: true,
            }
          );

          // Update database with new job ID
          await runAsync(
            `UPDATE emails SET job_id = ? WHERE id = ?`,
            [job.id, email.id]
          );

          console.log(`Recovered email ID ${email.id} with new job ID ${job.id}`);
        } catch (error) {
          console.error(`Failed to recover email ID ${email.id}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error recovering persistent jobs:', error);
  }
}

export async function getEmailStatus(emailId) {
  try {
    const emails = await allAsync(
      `SELECT * FROM emails WHERE id = ?`,
      [emailId]
    );
    return emails[0] || null;
  } catch (error) {
    console.error('Error fetching email status:', error);
    throw error;
  }
}

export async function getAllEmails(status = null) {
  try {
    if (status) {
      return await allAsync(
        `SELECT * FROM emails WHERE status = ? ORDER BY created_at DESC`,
        [status]
      );
    }
    return await allAsync(
      `SELECT * FROM emails ORDER BY created_at DESC`
    );
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
}

export async function closeScheduler() {
  if (worker) await worker.close();
  if (redisClient) await redisClient.disconnect();
}
