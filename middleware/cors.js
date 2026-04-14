import cors from 'cors';

// ============================================================
// CORS Configuration
// ============================================================

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const envOriginValues = [
      process.env.FRONTEND_URL,
      process.env.APP_URL,
      process.env.ALLOWED_ORIGINS,
    ]
      .filter(Boolean)
      .flatMap((value) => String(value).split(','))
      .map((value) => value.trim())
      .filter(Boolean);

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      ...envOriginValues,
    ].filter(Boolean);

    const normalizedOrigin = String(origin).replace(/\/+$/, '');
    const normalizedAllowed = allowedOrigins.map((value) => String(value).replace(/\/+$/, ''));

    const isProduction = process.env.NODE_ENV === 'production';
    const hasExplicitAllowList = normalizedAllowed.length > 2; // localhost entries + at least 1 explicit URL

    if (!isProduction) return callback(null, true);
    if (!hasExplicitAllowList) return callback(null, true);

    if (normalizedAllowed.includes(normalizedOrigin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

export default cors(corsOptions);
