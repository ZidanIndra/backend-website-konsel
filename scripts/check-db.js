import '../config/env.js';
import connectDB from '../config/database.js';

try {
  const sequelize = await connectDB();
  console.log('OK: MySQL connection succeeded.');
  await sequelize.close();
  process.exit(0);
} catch (err) {
  console.error('FAIL: MySQL connection failed.');
  console.error(err?.code ? `code=${err.code}` : '');
  console.error(err?.message || err);
  process.exit(1);
}
