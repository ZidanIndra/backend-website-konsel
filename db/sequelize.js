import { Sequelize } from 'sequelize';
import { getEnv, requireEnv } from '../config/env.js';

const dbName = requireEnv('DB_NAME', ['MYSQL_DATABASE', 'MYSQL_DB', 'MYSQL_NAME']);
const dbUser = requireEnv('DB_USER', ['MYSQL_USER', 'MYSQL_USERNAME']);
const dbPass = getEnv('DB_PASS', ['MYSQL_PASSWORD']) ?? '';
const dbHost = requireEnv('DB_HOST', ['MYSQL_HOST']);
const dbPort = Number(getEnv('DB_PORT', ['MYSQL_PORT']) ?? 3306);

const loggingEnabled = getEnv('DB_LOGGING', ['SEQUELIZE_LOGGING']) === '1';
const logging = loggingEnabled ? (msg) => console.log(msg) : false;

const sslEnabled = getEnv('DB_SSL') === '1';
const dialectOptions = sslEnabled
  ? { ssl: { rejectUnauthorized: false } }
  : undefined;

export const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging,
  timezone: '+00:00',
  dialectOptions,
  define: {
    underscored: true,
    freezeTableName: true,
  },
  pool: {
    max: Number(getEnv('DB_POOL_MAX') ?? 10),
    min: Number(getEnv('DB_POOL_MIN') ?? 0),
    acquire: Number(getEnv('DB_POOL_ACQUIRE_MS') ?? 30000),
    idle: Number(getEnv('DB_POOL_IDLE_MS') ?? 10000),
  },
});

