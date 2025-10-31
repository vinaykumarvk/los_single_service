import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function run() {
  const migrationsDir = process.argv[2];
  if (!migrationsDir) {
    // eslint-disable-next-line no-console
    console.error('Usage: ts-node migrate.ts <migrationsDir>');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (id SERIAL PRIMARY KEY, filename TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())'
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
    if (rows.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Skipping applied migration: ${file}`);
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');

    // eslint-disable-next-line no-console
    console.log(`Applying migration: ${file}`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      // eslint-disable-next-line no-console
      console.error(`Migration failed: ${file}`, e);
      process.exit(1);
    }
  }

  await client.release();
  await pool.end();
}

// eslint-disable-next-line no-console
run().catch((e) => { console.error(e); process.exit(1); });


