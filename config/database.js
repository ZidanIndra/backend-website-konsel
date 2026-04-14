import { sequelize } from '../db/sequelize.js';
import '../db/models.js';

// ============================================================
// MySQL Connection (Sequelize)
// ============================================================

let cached = global._sequelizeCache;

if (!cached) {
  cached = global._sequelizeCache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = sequelize.authenticate().then(() => {
      console.log('MySQL connected successfully');
      return sequelize;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error('MySQL connection failed:', err.message);
    throw err;
  }

  return cached.conn;
}

export default connectDB;
