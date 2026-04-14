import './config/env.js';
import express from 'express';
import http from 'http';
import connectDB from './config/database.js';
import corsMiddleware from './middleware/cors.js';
import { createSocketServer } from './socket/index.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import articleRoutes from './routes/articleRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import questionnaireRoutes from './routes/questionnaireRoutes.js';
import responseRoutes from './routes/responseRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import pageRoutes from './routes/pageRoutes.js';

// ============================================================
// Express Application Setup
// ============================================================

const app = express();
app.disable('etag');
app.set('trust proxy', 1);

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// API Routes
// ============================================================

const api = express.Router();

// Mark responses to help debugging (bedakan 503 dari Passenger vs dari app)
api.use((req, res, next) => {
  res.setHeader('X-BK-API', '1');
  next();
});

// ============================================================
// Health Check (WAJIB UNTUK TEST)
// ============================================================

api.get('/ping', (req, res) => {
  return res.json({ success: true, message: 'pong', data: null });
});

api.get('/health', async (req, res) => {
  const hasMysqlConfig = Boolean(
    (process.env.DB_HOST && String(process.env.DB_HOST).trim()) &&
      (process.env.DB_NAME && String(process.env.DB_NAME).trim()) &&
      (process.env.DB_USER && String(process.env.DB_USER).trim())
  );
  const envInfo = {
    nodeEnv: process.env.NODE_ENV || null,
    node: process.versions?.node || null,
    hasMysqlConfig,
  };

  try {
    await connectDB();
    return res.json({
      success: true,
      message: 'BK REBT Care API is running.',
      data: { db: 'ok', env: envInfo },
    });
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production';
    const safeDetail = err?.code === 'MISSING_ENV' ? (err?.message || null) : null;
    const safeError = {
      name: err?.name || null,
      code: err?.code || null,
    };
    const messageText = String(err?.message || '');
    const hint =
      err?.code === 'MISSING_ENV'
        ? 'Set DB_HOST, DB_NAME, DB_USER (dan DB_PASS jika ada) di Environment Variables.'
        : messageText.toLowerCase().includes('access denied') || messageText.toLowerCase().includes('authentication')
          ? 'MySQL auth gagal. Cek DB_USER/DB_PASS.'
          : messageText.toLowerCase().includes('connect') || messageText.toLowerCase().includes('econnrefused')
            ? 'MySQL tidak bisa dijangkau. Cek DB_HOST/DB_PORT dan firewall.'
            : 'Cek konfigurasi MySQL (DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS).';
    return res.status(503).json({
      success: false,
      message: 'Service unavailable (database).',
      data: {
        db: 'down',
        env: envInfo,
        error: safeError,
        hint,
        detail:
          process.env.DEBUG_ERRORS === '1'
            ? messageText
            : isProd
              ? safeDetail
              : messageText,
      },
    });
  }
});

// Ensure DB connected for all other API routes
api.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production';
    const safeDetail = err?.code === 'MISSING_ENV' ? (err?.message || null) : null;
    return res.status(503).json({
      success: false,
      message: 'Service unavailable (database).',
      data: {
        code: err?.code || null,
        detail: isProd ? safeDetail : (err?.message || String(err)),
      },
    });
  }
});

api.use('/auth', authRoutes);
api.use('/articles', articleRoutes);
api.use('/messages', messageRoutes);
api.use('/questions', questionRoutes);
api.use('/questionnaires', questionnaireRoutes);
api.use('/responses', responseRoutes);
api.use('/sessions', sessionRoutes);
api.use('/settings', settingRoutes);
api.use('/users', userRoutes);
api.use('/uploads', uploadRoutes);
api.use('/pages', pageRoutes);

// ============================================================
// 404 API HANDLER (KHUSUS API)
// ============================================================

api.use('/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found.',
    data: null,
  });
});

// Backend-only deployment (Railway). Frontend di-host terpisah (cPanel).
app.use('/api', api);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
    data: null,
  });
});

// ============================================================
// START SERVER + SOCKET.IO
// ============================================================

const PORT = Number(process.env.PORT || 5000);

// NOTE: Jangan log secret (contoh: DB_PASS) di production.
const server = http.createServer(app);
createSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

