/**
 * Update RM passwords with proper bcrypt hashes
 * Uses the same bcrypt library as the auth service
 */

import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://los:los@localhost:5432/los',
});

async function updatePasswords() {
  try {
    console.log('🔄 Updating RM passwords with proper bcrypt hashes...\n');

    const rms = [];
    for (let i = 1; i <= 10; i++) {
      rms.push({
        username: `rm${i}`,
        password: `rm${i}123456`,
      });
    }

    for (const rm of rms) {
      try {
        // Generate bcrypt hash (same as auth service uses)
        const passwordHash = await bcrypt.hash(rm.password, 10);
        
        // Update password in database
        const result = await pool.query(
          'UPDATE users SET password_hash = $1, updated_at = now() WHERE username = $2 AND designation = $3',
          [passwordHash, rm.username, 'Relationship Manager']
        );

        if (result.rowCount && result.rowCount > 0) {
          console.log(`✅ ${rm.username}: Password updated (${rm.password})`);
        } else {
          // Check if user exists
          const checkResult = await pool.query(
            'SELECT username FROM users WHERE username = $1',
            [rm.username]
          );
          if (checkResult.rows.length === 0) {
            console.log(`⚠️  ${rm.username}: User not found`);
          } else {
            console.log(`⚠️  ${rm.username}: No update needed (may not be RM designation)`);
          }
        }
      } catch (err: any) {
        console.error(`❌ Error updating ${rm.username}:`, err.message);
      }
    }

    console.log('\n✅ Password update complete!');
    console.log('\n📋 Updated Credentials:');
    rms.forEach(rm => {
      console.log(`   ${rm.username} / ${rm.password}`);
    });

    await pool.end();
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updatePasswords();


