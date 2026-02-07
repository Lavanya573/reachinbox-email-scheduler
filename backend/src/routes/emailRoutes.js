import express from 'express';
import { scheduleEmail, getEmailStatus, getAllEmails } from '../services/schedulerService.js';

const router = express.Router();

// Schedule a new email
router.post('/schedule', async (req, res) => {
  try {
    const { to, subject, body, scheduledTime } = req.body;

    // Validation
    if (!to || !subject || !body || !scheduledTime) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, body, scheduledTime',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        error: 'Invalid email address',
      });
    }

    // Validate scheduled time is in the future
    const now = Math.floor(Date.now() / 1000);
    if (scheduledTime <= now) {
      return res.status(400).json({
        error: 'Scheduled time must be in the future',
      });
    }

    const result = await scheduleEmail(to, subject, body, scheduledTime);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in /schedule route:', error);
    res.status(500).json({
      error: error.message || 'Failed to schedule email',
    });
  }
});

// Get email status
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const email = await getEmailStatus(id);

    if (!email) {
      return res.status(404).json({
        error: 'Email not found',
      });
    }

    res.json({
      success: true,
      data: email,
    });
  } catch (error) {
    console.error('Error in GET /:id route:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch email',
    });
  }
});

// Get all emails with optional status filter
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    const emails = await getAllEmails(status);

    res.json({
      success: true,
      count: emails.length,
      data: emails,
    });
  } catch (error) {
    console.error('Error in GET / route:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch emails',
    });
  }
});

// Get summary stats
router.get('/stats/summary', async (req, res) => {
  try {
    const scheduled = await getAllEmails('scheduled');
    const sent = await getAllEmails('sent');
    const failed = await getAllEmails('failed');

    res.json({
      success: true,
      data: {
        scheduled: scheduled.length,
        sent: sent.length,
        failed: failed.length,
        total: scheduled.length + sent.length + failed.length,
      },
    });
  } catch (error) {
    console.error('Error in /stats/summary route:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch statistics',
    });
  }
});

export default router;
