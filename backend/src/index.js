import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/database.js';
import { initScheduler } from './services/schedulerService.js';
import emailRoutes from './routes/emailRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
await initDatabase();

// Initialize scheduler
const { emailQueue } = await initScheduler();

// Make queue available to routes
app.locals.emailQueue = emailQueue;

// Routes
app.use('/api/emails', emailRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Email Scheduler Server running on port ${PORT}`);
  console.log('Redis and BullMQ are configured');
});
