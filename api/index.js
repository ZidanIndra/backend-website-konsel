import { isProduction } from '../config/env.js';
import express from 'express';
import connectDB from '../config/database.js';
import corsMiddleware from '../middleware/cors.js';

// Route imports
import authRoutes from '../routes/authRoutes.js';
import articleRoutes from '../routes/articleRoutes.js';
import messageRoutes from '../routes/messageRoutes.js';
import questionRoutes from '../routes/questionRoutes.js';
import questionnaireRoutes from '../routes/questionnaireRoutes.js';
import responseRoutes from '../routes/responseRoutes.js';
import sessionRoutes from '../routes/sessionRoutes.js';
import settingRoutes from '../routes/settingRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import uploadRoutes from '../routes/uploadRoutes.js';
import pageRoutes from '../routes/pageRoutes.js';

// ============================================================
// Vercel Serverless Entry Point
// ============================================================

const app = express();
app.disable('etag');

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure MySQL connected (cached for serverless cold starts)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err);
    const isProd = isProduction();
    const safeDetail = err?.code === 'MISSING_ENV' ? (err?.message || null) : null;
    res.status(503).json({
      success: false,
      message: 'Service unavailable (database).',
      data: {
        db: 'down',
        code: err?.code || null,
        detail: isProd ? safeDetail : (err?.message || String(err)),
      },
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/questionnaires', questionnaireRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/pages', pageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'BK REBT Care API is running on Vercel.', data: null });
});

// 404 handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.', data: null });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.', data: null });
});

export default app;

