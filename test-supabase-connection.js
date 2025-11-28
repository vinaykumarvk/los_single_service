// Quick test to verify Supabase connection
require('dotenv').config();
const { createSupabaseClient, querySupabase } = require('./shared/libs/dist/index.js');

try {
  console.log('Testing Supabase connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');
  
  const client = createSupabaseClient();
  console.log('✅ Supabase client created successfully');
  
  // Test a simple query
  querySupabase(client, 'SELECT 1 as test', [])
    .then(result => {
      console.log('✅ Query test successful:', result.rows);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Query test failed:', err.message);
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error.message);
  process.exit(1);
}
