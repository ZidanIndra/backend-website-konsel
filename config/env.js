import { config as loadEnv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================
// Environment Loader & Helpers
// ============================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');
loadEnv({ path: envPath });

export function isProduction() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

export function getEnv(name, fallbacks = []) {
  const keys = [name, ...fallbacks];
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return null;
}

export function requireEnv(name, fallbacks = []) {
  const value = getEnv(name, fallbacks);
  if (!value) {
    const allKeys = [name, ...fallbacks].join(', ');
    const err = new Error(`Missing environment variable: ${allKeys}`);
    err.code = 'MISSING_ENV';
    throw err;
  }
  return value;
}
