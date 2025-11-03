import bcrypt from 'bcrypt';
import { Pool } from 'pg';

// Use same connection as auth service
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://los:los@localhost:5432/los',
});

async function updatePasswords() {
  try {
    // Hash passwords using bcrypt (same as auth service)
    const rm1Hash = await bcrypt.hash('Test@123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);
    
    // Update users
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [rm1Hash, 'rm1']);
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [adminHash, 'admin']);
    
    console.log('✅ Passwords updated with bcrypt');
    
    // Verify
    const { rows } = await pool.query('SELECT username, roles FROM users WHERE username IN ($1, $2)', ['rm1', 'admin']);
    console.log('\nUsers:');
    rows.forEach(r => console.log(`  - ${r.username}: ${r.roles.join(', ')}`));
    
    await pool.end();
  } catch (err) {
    console.error('Error:', (err as Error).message);
    process.exit(1);
  }
}

updatePasswords();

