import '../config/env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../db/sequelize.js';
import '../db/models.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const umzug = new Umzug({
  migrations: {
    glob: ['../migrations/*.js', { cwd: __dirname }],
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize,
    tableName: '_migrations',
  }),
  logger: console,
});

try {
  await sequelize.authenticate();
  const pending = await umzug.pending();
  if (pending.length === 0) {
    console.log('No pending migrations.');
  } else {
    console.log(`Running ${pending.length} migration(s)...`);
    await umzug.up();
    console.log('Migrations completed.');
  }
  await sequelize.close();
  process.exit(0);
} catch (err) {
  console.error('Migration failed:', err);
  try {
    await sequelize.close();
  } catch {}
  process.exit(1);
}

