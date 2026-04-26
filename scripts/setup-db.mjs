/**
 * HairHub ERP - Database Setup Script
 * Runs schema.sql on the Supabase PostgreSQL database
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { Client } = pg;

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.foiykppnlihepdkgnyfj',
  password: 'mh.hasan970@',
  ssl: { rejectUnauthorized: false },
});

async function runMigrations() {
  console.log('🔗 Connecting to Supabase...');
  await client.connect();
  console.log('✅ Connected!\n');

  const schemaPath = resolve(__dirname, '../schema.sql');
  console.log(`📄 Reading schema.sql...`);
  const schemaSql = readFileSync(schemaPath, 'utf-8');

  console.log('🚀 Running schema (this may take a moment)...');
  
  // Split by semicolons but be careful with function bodies
  // Execute the whole schema at once
  try {
    await client.query(schemaSql);
    console.log('✅ Schema created successfully!\n');
  } catch (err) {
    // If tables already exist, that's OK
    if (err.message.includes('already exists')) {
      console.log('ℹ️  Some tables already exist — skipping.\n');
    } else {
      throw err;
    }
  }

  console.log('👤 Checking for existing users...');
  const usersResult = await client.query(`SELECT count(*) FROM auth.users`);
  const userCount = parseInt(usersResult.rows[0].count);
  console.log(`   Found ${userCount} user(s) in auth.users\n`);

  await client.end();
  console.log('✅ Setup complete! ');
  console.log('═══════════════════════════════════════');
  console.log('Next step: Go to app → Login page → "Create Admin Account" to sign up.');
  console.log('═══════════════════════════════════════');
}

runMigrations().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
